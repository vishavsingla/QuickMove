import { prisma } from "../lib/prisma";
import { payableAmount } from "./coupons";
import { paymentsSucceededTotal } from "../observability/metrics";
import { ensureInvoice } from "./invoices";
import { createRazorpayOrder, verifyPaymentSignature } from "./razorpay";

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

export const MIN_WITHDRAWAL = 100;

export const requestDriverWithdrawal = async (
  userId: string,
  amount: number,
  bankAccNo: string,
  ifscCode: string
) => {
  if (amount < MIN_WITHDRAWAL)
    throw new Error(`Minimum withdrawal is ₹${MIN_WITHDRAWAL}`);
  if (!bankAccNo || !ifscCode) throw new Error("Bank details required");

  const wallet = await ensureWallet(userId);
  if (wallet.balance < amount) throw new Error("Insufficient balance");

  const gatewayRef = `payout_stub_${Date.now()}`;

  const [updated, txn] = await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: amount } },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type: "DEBIT",
        description: "Bank withdrawal",
        reference: gatewayRef,
        status: "COMPLETED",
      },
    }),
  ]);

  return {
    id: txn.id,
    amount,
    status: "COMPLETED" as const,
    gatewayRef,
    bankAccNo: `****${bankAccNo.slice(-4)}`,
    ifscCode,
    wallet: updated,
  };
};

export const processTestCard = (token: string): "SUCCEEDED" | "FAILED" => {
  if (token === "test_fail") return "FAILED";
  return "SUCCEEDED";
};

export const finalizeSuccessfulPayment = async (
  intentId: string,
  method: string,
  razorpayPaymentId?: string
) => {
  const intent = await prisma.paymentIntent.findUnique({
    where: { id: intentId },
    include: { booking: true },
  });
  if (!intent) throw new Error("Payment not found");
  if (intent.status !== "PENDING") throw new Error(`Payment is ${intent.status}`);

  const result = await prisma.$transaction(async (tx) => {
    const paid = await tx.paymentIntent.update({
      where: { id: intentId },
      data: {
        status: "SUCCEEDED",
        method,
        ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
      },
    });

    if (intent.purpose === "WALLET_TOPUP") {
      const wallet = await ensureWallet(intent.userId);
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: intent.amount } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: intent.amount,
          type: "CREDIT",
          description: "Wallet top-up (Razorpay)",
          reference: intent.gatewayRef ?? intentId,
        },
      });
      return paid;
    }

    if (intent.bookingId) {
      await tx.booking.update({
        where: { id: intent.bookingId },
        data: { paymentStatus: "PAID", paymentMethod: method },
      });
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

  return finalizeSuccessfulPayment(intentId, method);
};

export const createWalletTopupIntent = async (userId: string, amount: number) => {
  if (!amount || amount <= 0 || amount > 100_000)
    throw new Error("Invalid amount (1–100000)");
  return prisma.paymentIntent.create({
    data: {
      userId,
      amount,
      purpose: "WALLET_TOPUP",
      gatewayRef: `topup_${Date.now()}`,
    },
  });
};

export const createRazorpayOrderForIntent = async (intentId: string, userId: string) => {
  const intent = await prisma.paymentIntent.findUnique({ where: { id: intentId } });
  if (!intent || intent.userId !== userId) throw new Error("Payment not found");
  if (intent.status !== "PENDING") throw new Error(`Payment is ${intent.status}`);

  const receipt = intent.bookingId ?? intent.id;
  const notes: Record<string, string> = {
    intentId: intent.id,
    purpose: intent.purpose,
    userId,
  };
  if (intent.bookingId) notes.bookingId = intent.bookingId;

  const { order, keyId, mode } = await createRazorpayOrder(intent.amount, receipt, notes);
  await prisma.paymentIntent.update({
    where: { id: intentId },
    data: { gatewayRef: order.id },
  });
  return { order, keyId, mode, intentId: intent.id, amount: intent.amount };
};

export const verifyRazorpayPayment = async (
  userId: string,
  intentId: string,
  orderId: string,
  paymentId: string,
  signature: string
) => {
  const intent = await prisma.paymentIntent.findUnique({ where: { id: intentId } });
  if (!intent || intent.userId !== userId) throw new Error("Payment not found");
  if (intent.gatewayRef && intent.gatewayRef !== orderId)
    throw new Error("Order mismatch");

  if (!verifyPaymentSignature(orderId, paymentId, signature))
    throw new Error("Invalid payment signature");

  return finalizeSuccessfulPayment(intentId, "razorpay", paymentId);
};

export const refundBookingToWallet = async (userId: string, bookingId: string) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.userId !== userId) throw new Error("Booking not found");
  if (booking.paymentStatus !== "PAID") return null;

  const amount = payableAmount(booking.estimatedCost, booking.discountAmount);
  await creditWallet(userId, amount, "Refund for cancelled booking", bookingId);
  await prisma.booking.update({
    where: { id: bookingId },
    data: { paymentStatus: "REFUNDED" },
  });
  return amount;
};
