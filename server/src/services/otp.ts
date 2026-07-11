import crypto from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { notifyVerificationSuccess } from "./notifications";
import { sendSms } from "./sms";
import { sendEmail } from "./email";
import { findOrCreateGuestUser } from "./guestUser";
import { createSession } from "./sessions";
import { signPhoneVerificationToken } from "../utils/jwt";

const OTP_TTL_MS = 10 * 60 * 1000;
const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

export type OtpChannel = "phone" | "email";

const normalizeTarget = (channel: OtpChannel, target: string) => {
  const trimmed = target.trim();
  if (channel === "email") return trimmed.toLowerCase();
  return trimmed.replace(/\s+/g, "");
};

export const generateOtpCode = () =>
  String(crypto.randomInt(100000, 1000000));

const hashOtp = async (code: string) => bcrypt.hash(code, 10);

export const checkOtpRateLimit = async (
  channel: OtpChannel,
  target: string
): Promise<{ allowed: boolean; retryAfterSec?: number }> => {
  const normalized = normalizeTarget(channel, target);
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const count = await prisma.verificationOtp.count({
    where: { channel, target: normalized, createdAt: { gte: since } },
  });
  if (count >= RATE_LIMIT_MAX) {
    const oldest = await prisma.verificationOtp.findFirst({
      where: { channel, target: normalized, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    });
    const retryAfterSec = oldest
      ? Math.ceil(
          (oldest.createdAt.getTime() + RATE_LIMIT_WINDOW_MS - Date.now()) / 1000
        )
      : RATE_LIMIT_WINDOW_MS / 1000;
    return { allowed: false, retryAfterSec: Math.max(retryAfterSec, 1) };
  }
  return { allowed: true };
};

const deliverOtp = async (channel: OtpChannel, target: string, code: string) => {
  if (channel === "phone") {
    await sendSms(target, `Your QuickMove verification code is ${code}`);
  } else {
    await sendEmail(
      target,
      "Your QuickMove verification code",
      `<p>Your verification code is <strong>${code}</strong></p>`
    );
  }
};

export const sendOtp = async (params: {
  userId?: string | null;
  channel: OtpChannel;
  target: string;
  purpose?: string;
}) => {
  const { channel, purpose = "verification" } = params;
  const userId = params.userId ?? null;
  const target = normalizeTarget(channel, params.target);

  const rate = await checkOtpRateLimit(channel, target);
  if (!rate.allowed) {
    const err = new Error("Too many OTP requests. Try again later.") as Error & {
      status?: number;
      retryAfterSec?: number;
    };
    err.status = 429;
    err.retryAfterSec = rate.retryAfterSec;
    throw err;
  }

  const code = generateOtpCode();
  const codeHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.verificationOtp.create({
    data: { channel, target, codeHash, purpose, userId, expiresAt },
  });

  await deliverOtp(channel, target, code);

  return {
    message: `OTP sent via ${channel}`,
    expiresInSec: OTP_TTL_MS / 1000,
    ...(env.otpStubExpose ? { debugOtp: code, otp: code } : {}),
  };
};

export const sendPhoneLoginOtp = async (phoneNumber: string) => {
  const target = normalizeTarget("phone", phoneNumber);
  return sendOtp({ channel: "phone", target, purpose: "login" });
};

export const sendGuestPhoneOtp = async (phoneNumber: string) => {
  const target = normalizeTarget("phone", phoneNumber);
  return sendOtp({ channel: "phone", target, purpose: "guest_booking" });
};

export const verifyOtp = async (params: {
  userId: string;
  channel: OtpChannel;
  target: string;
  code: string;
}) => {
  const { userId, channel, code } = params;
  const target = normalizeTarget(channel, params.target);

  const record = await prisma.verificationOtp.findFirst({
    where: {
      userId,
      channel,
      target,
      purpose: "verification",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    const err = new Error("OTP expired or not found") as Error & { status?: number };
    err.status = 400;
    throw err;
  }

  const ok = await bcrypt.compare(code, record.codeHash);
  if (!ok) {
    const err = new Error("Invalid OTP") as Error & { status?: number };
    err.status = 400;
    throw err;
  }

  const updateData =
    channel === "phone"
      ? { phoneVerified: true, phoneNumber: target }
      : { emailVerified: true, email: target };

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  await prisma.verificationOtp.deleteMany({ where: { userId, channel, target } });
  await notifyVerificationSuccess(userId, channel);
  return user;
};

export const verifyPhoneLoginOtp = async (params: {
  phoneNumber: string;
  code: string;
  name?: string;
}) => {
  const target = normalizeTarget("phone", params.phoneNumber);
  const code = String(params.code).trim();

  const record = await prisma.verificationOtp.findFirst({
    where: {
      channel: "phone",
      target,
      purpose: "login",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    const err = new Error("OTP expired or not found") as Error & { status?: number };
    err.status = 400;
    throw err;
  }

  const ok = await bcrypt.compare(code, record.codeHash);
  if (!ok) {
    const err = new Error("Invalid OTP") as Error & { status?: number };
    err.status = 400;
    throw err;
  }

  const { user } = await findOrCreateGuestUser({
    name: params.name?.trim() || "QuickMove User",
    phoneNumber: target,
  });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { phoneVerified: true },
    include: { driver: true },
  });

  await prisma.verificationOtp.deleteMany({
    where: { channel: "phone", target, purpose: "login" },
  });

  const { accessToken, refreshToken } = await createSession({
    id: updated.id,
    role: updated.role,
    driverId: updated.driver?.id,
  });

  return { user: updated, token: accessToken, refreshToken };
};

export const verifyGuestPhoneOtp = async (phoneNumber: string, code: string) => {
  const target = normalizeTarget("phone", phoneNumber);

  const record = await prisma.verificationOtp.findFirst({
    where: {
      channel: "phone",
      target,
      purpose: "guest_booking",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    const err = new Error("OTP expired or not found") as Error & { status?: number };
    err.status = 400;
    throw err;
  }

  const ok = await bcrypt.compare(String(code).trim(), record.codeHash);
  if (!ok) {
    const err = new Error("Invalid OTP") as Error & { status?: number };
    err.status = 400;
    throw err;
  }

  await prisma.verificationOtp.deleteMany({
    where: { channel: "phone", target, purpose: "guest_booking" },
  });

  return {
    verified: true,
    phoneVerificationToken: signPhoneVerificationToken(target),
  };
};

export const createEmailVerificationToken = async (userId: string, email: string) => {
  const target = normalizeTarget("email", email);
  const token = crypto.randomBytes(32).toString("hex");
  const codeHash = await bcrypt.hash(token, 10);
  const expiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS);

  await prisma.verificationOtp.deleteMany({
    where: { userId, channel: "email", purpose: "email_verify" },
  });

  await prisma.verificationOtp.create({
    data: {
      channel: "email",
      target,
      codeHash,
      purpose: "email_verify",
      userId,
      expiresAt,
    },
  });

  return token;
};

export const verifyEmailToken = async (token: string) => {
  const records = await prisma.verificationOtp.findMany({
    where: {
      channel: "email",
      purpose: "email_verify",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  let matched: (typeof records)[0] | null = null;
  for (const record of records) {
    if (await bcrypt.compare(token, record.codeHash)) {
      matched = record;
      break;
    }
  }

  if (!matched || !matched.userId) {
    const err = new Error("Invalid or expired verification link") as Error & {
      status?: number;
    };
    err.status = 400;
    throw err;
  }

  const user = await prisma.user.update({
    where: { id: matched.userId },
    data: { emailVerified: true, email: matched.target },
  });

  await prisma.verificationOtp.deleteMany({
    where: { userId: matched.userId, channel: "email", purpose: "email_verify" },
  });

  await notifyVerificationSuccess(matched.userId, "email");
  return user;
};

export const sendPublicPhoneOtp = sendGuestPhoneOtp;
export const verifyPublicPhoneOtp = verifyGuestPhoneOtp;
