import { prisma } from "../lib/prisma";
import { payableAmount } from "./coupons";
import { paymentsSucceededTotal } from "../observability/metrics";
import { ensureInvoice } from "./invoices";

export const ensureWallet = async (userId: string) => {
  const existing = await prisma.wallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.wallet.create({ data: { userId } });
};

export const creditWallet = async (
  userId: string,
  amount: number,
  description: string,
  reference?: string
) => {
  const wallet = await ensureWallet(userId);
  const [updated] = await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type: "CREDIT",
        description,
        reference,
      },
    }),
  ]);
  return updated;
};

export const debitWallet = async (
  userId: string,
  amount: number,
  description: string,
  reference?: string
) => {
  const wallet = await ensureWallet(userId);
  if (wallet.balance < amount) throw new Error("Insufficient wallet balance");
  const [updated] = await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: amount } },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type: "DEBIT",
        description,
        reference,
      },
    }),
  ]);
  return updated;
};

/**
 * Test payment gateway: tokens `test_success` and `test_fail` simulate card outcomes.
 */
export const processTestCard = (token: string): "SUCCEEDED" | "FAILED" => {
  if (token === "test_fail") return "FAILED";
  return "SUCCEEDED";
};

export const createPaymentIntent = async (userId: string, bookingId: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.userId !== userId)
    throw new Error("Booking not found");
  if (booking.paymentStatus === "PAID") throw new Error("Already paid");

  const amount = payableAmount(booking.estimatedCost, booking.discountAmount);

  const existing = await prisma.paymentIntent.findUnique({
    where: { bookingId },
  });
  if (existing && existing.status === "PENDING") return existing;

  return prisma.paymentIntent.create({
    data: {
      userId,
      bookingId,
      amount,
      gatewayRef: `pi_test_${Date.now()}`,
    },
  });
};

export const confirmPayment = async (
  userId: string,
  intentId: string,
  method: "wallet" | "test_card",
  token?: string
) => {
  const intent = await prisma.paymentIntent.findUnique({
    where: { id: intentId },
    include: { booking: true },
  });
  if (!intent || intent.userId !== userId) throw new Error("Payment not found");
  if (intent.status !== "PENDING") throw new Error(`Payment is ${intent.status}`);

  if (method === "wallet") {
    await debitWallet(userId, intent.amount, "Booking payment", intent.bookingId ?? undefined);
  } else if (method === "test_card") {
    const outcome = processTestCard(token || "");
    if (outcome === "FAILED") {
      await prisma.paymentIntent.update({
        where: { id: intentId },
        data: { status: "FAILED", method: "test_card" },
      });
      throw new Error("Card payment declined");
    }
  } else {
    throw new Error("Invalid payment method");
  }

  const result = await prisma.$transaction(async (tx) => {
    const paid = await tx.paymentIntent.update({
      where: { id: intentId },
      data: { status: "SUCCEEDED", method },
    });
    if (intent.bookingId) {
      await tx.booking.update({
        where: { id: intent.bookingId },
        data: { paymentStatus: "PAID", paymentMethod: method },
      });
      // Credit driver earnings (90% of fare) on payment success if driver assigned
      const booking = intent.booking;
      if (booking?.driverId) {
        const driver = await tx.driver.findUnique({
          where: { id: booking.driverId },
        });
        if (driver) {
          const earnings = Number((intent.amount * 0.9).toFixed(2));
          const wallet = await ensureWallet(driver.userId);
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: earnings } },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              amount: earnings,
              type: "CREDIT",
              description: "Trip earnings",
              reference: intent.bookingId,
            },
          });
        }
      }
    }
    return paid;
  });

  if (intent.bookingId) {
    await ensureInvoice(intent.bookingId).catch(() => undefined);
  }

  paymentsSucceededTotal.inc();

  return result;
};
