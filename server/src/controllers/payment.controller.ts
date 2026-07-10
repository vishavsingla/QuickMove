import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import {
  ensureWallet,
  createPaymentIntent,
  confirmPayment,
  creditWallet,
  createWalletTopupIntent,
  createRazorpayOrderForIntent,
  verifyRazorpayPayment,
  finalizeSuccessfulPayment,
} from "../services/payments";
import { getRazorpayMode, isRazorpayConfigured, verifyWebhookSignature, createMockPaymentId, computePaymentSignature } from "../services/razorpay";
import { env } from "../config/env";

export const getPaymentConfig = (_req: AuthRequest, res: Response) => {
  return res.status(200).json({
    mode: getRazorpayMode(),
    keyId: isRazorpayConfigured() ? env.razorpayKeyId : null,
    currency: "INR",
    methods: ["wallet", "razorpay"],
  });
};

export const getWallet = async (req: AuthRequest, res: Response) => {
  const wallet = await ensureWallet(req.auth!.id);
  const transactions = await prisma.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return res.status(200).json({ wallet, transactions });
};

export const topUp = async (req: AuthRequest, res: Response) => {
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0 || amount > 100_000)
    return res.status(400).json({ message: "Invalid amount (1–100000)" });
  const wallet = await creditWallet(
    req.auth!.id,
    amount,
    "Wallet top-up (test gateway)"
  );
  return res.status(200).json({ message: "Top-up successful", wallet });
};

export const createIntent = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: "bookingId required" });
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    const intent = await createPaymentIntent(req.auth!.id, bookingId);
    return res.status(201).json({ intent });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const confirm = async (req: AuthRequest, res: Response) => {
  try {
    const { method, token } = req.body as {
      method: "wallet" | "test_card";
      token?: string;
    };
    if (!method) return res.status(400).json({ message: "method required" });
    const intent = await confirmPayment(
      req.auth!.id,
      req.params.id,
      method,
      token
    );
    return res.status(200).json({ message: "Payment successful", intent });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, topup, amount } = req.body as {
      bookingId?: string;
      topup?: boolean;
      amount?: number;
    };

    if (topup) {
      const topupAmount = Number(amount);
      const intent = await createWalletTopupIntent(req.auth!.id, topupAmount);
      const orderPayload = await createRazorpayOrderForIntent(intent.id, req.auth!.id);
      return res.status(201).json(orderPayload);
    }

    if (bookingId) {
      const intent = await createPaymentIntent(req.auth!.id, bookingId);
      const orderPayload = await createRazorpayOrderForIntent(intent.id, req.auth!.id);
      return res.status(201).json(orderPayload);
    }

    return res.status(400).json({ message: "bookingId or topup required" });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const verifyPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { intentId, orderId, paymentId, signature } = req.body as {
      intentId: string;
      orderId: string;
      paymentId: string;
      signature: string;
    };
    if (!intentId || !orderId || !paymentId || !signature)
      return res.status(400).json({ message: "Missing verification fields" });

    const intent = await verifyRazorpayPayment(
      req.auth!.id,
      intentId,
      orderId,
      paymentId,
      signature
    );
    return res.status(200).json({ message: "Payment verified", intent });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

/** Mock checkout helper — only when Razorpay keys are absent. */
export const mockComplete = async (req: AuthRequest, res: Response) => {
  if (isRazorpayConfigured())
    return res.status(400).json({ message: "Mock checkout unavailable when Razorpay keys are set" });
  try {
    const { intentId, orderId } = req.body as { intentId: string; orderId: string };
    if (!intentId || !orderId)
      return res.status(400).json({ message: "intentId and orderId required" });

    const intent = await prisma.paymentIntent.findUnique({ where: { id: intentId } });
    if (!intent || intent.userId !== req.auth!.id)
      return res.status(404).json({ message: "Payment not found" });
    if (intent.gatewayRef !== orderId)
      return res.status(400).json({ message: "Order mismatch" });

    const paymentId = createMockPaymentId();
    const signature = computePaymentSignature(orderId, paymentId);
    return res.status(200).json({ orderId, paymentId, signature });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

/** Razorpay webhook — no auth; signature verified via X-Razorpay-Signature. */
export const razorpayWebhook = async (req: Request, res: Response) => {
  const signature = req.headers["x-razorpay-signature"] as string | undefined;
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString("utf8")
    : typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body);

  if (!signature || !verifyWebhookSignature(rawBody, signature))
    return res.status(400).json({ message: "Invalid webhook signature" });

  try {
    const event = JSON.parse(rawBody);
    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id as string | undefined;
      const paymentId = payment?.id as string | undefined;
      const notes = (payment?.notes ?? {}) as Record<string, string>;
      const intentId = notes.intentId;

      if (intentId && orderId && paymentId) {
        const intent = await prisma.paymentIntent.findUnique({ where: { id: intentId } });
        if (intent && intent.status === "PENDING" && intent.gatewayRef === orderId) {
          await finalizeSuccessfulPayment(intentId, "razorpay", paymentId);
        }
      }
    }
    return res.status(200).json({ received: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};
