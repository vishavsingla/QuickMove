import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import {
  ensureWallet,
  createPaymentIntent,
  confirmPayment,
  creditWallet,
} from "../services/payments";

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
  // Test-mode instant top-up (simulates a successful gateway charge).
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
