import crypto from "crypto";
import axios from "axios";
import { env } from "../config/env";

/** Secret used for mock checkout HMAC when Razorpay keys are absent. */
export const MOCK_RAZORPAY_SECRET = "quickmove_mock_razorpay_secret";

export type RazorpayMode = "razorpay" | "mock";

export const isRazorpayConfigured = (): boolean =>
  Boolean(env.razorpayKeyId && env.razorpayKeySecret);

export const getRazorpayMode = (): RazorpayMode =>
  isRazorpayConfigured() ? "razorpay" : "mock";

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status?: string;
}

export const createRazorpayOrder = async (
  amountInr: number,
  receipt: string,
  notes?: Record<string, string>
): Promise<{ order: RazorpayOrder; keyId: string | null; mode: RazorpayMode }> => {
  const amountPaise = Math.round(amountInr * 100);
  if (amountPaise < 100) throw new Error("Minimum payment amount is ₹1");

  if (isRazorpayConfigured()) {
    const auth = Buffer.from(
      `${env.razorpayKeyId}:${env.razorpayKeySecret}`
    ).toString("base64");
    const res = await axios.post<RazorpayOrder>(
      "https://api.razorpay.com/v1/orders",
      { amount: amountPaise, currency: "INR", receipt, notes },
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      }
    );
    return { order: res.data, keyId: env.razorpayKeyId, mode: "razorpay" };
  }

  const order: RazorpayOrder = {
    id: `order_mock_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    amount: amountPaise,
    currency: "INR",
    receipt,
    status: "created",
  };
  return { order, keyId: null, mode: "mock" };
};

export const paymentSignatureSecret = (): string =>
  isRazorpayConfigured() ? env.razorpayKeySecret! : MOCK_RAZORPAY_SECRET;

const toUtf8Bytes = (value: string): Uint8Array =>
  new Uint8Array(Buffer.from(value, "utf8"));

export const computePaymentSignature = (
  orderId: string,
  paymentId: string,
  secret = paymentSignatureSecret()
): string =>
  crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  const expected = computePaymentSignature(orderId, paymentId);
  try {
    return crypto.timingSafeEqual(
      toUtf8Bytes(expected),
      toUtf8Bytes(signature)
    );
  } catch {
    return false;
  }
};

export const createMockPaymentId = (): string =>
  `pay_mock_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

export const verifyWebhookSignature = (body: string, signature: string): boolean => {
  const expected = crypto
    .createHmac("sha256", paymentSignatureSecret())
    .update(body)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      toUtf8Bytes(expected),
      toUtf8Bytes(signature)
    );
  } catch {
    return false;
  }
};
