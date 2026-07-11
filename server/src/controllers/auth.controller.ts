import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { VehicleType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth";
import { env } from "../config/env";
import { ensureWallet } from "../services/payments";
import { createSession, refreshSession, revokeSession } from "../services/sessions";
import {
  sendOtp,
  verifyOtp,
  OtpChannel,
  sendPhoneLoginOtp,
  sendGuestPhoneOtp,
  verifyPhoneLoginOtp,
  verifyGuestPhoneOtp,
  createEmailVerificationToken,
  verifyEmailToken,
} from "../services/otp";
import { sendVerificationEmail } from "../services/email";
import {
  isGoogleOAuthConfigured,
  isGoogleOAuthMock,
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  findOrLinkGoogleUser,
  issueOAuthTokens,
  buildOAuthCallbackRedirect,
  mockGoogleProfile,
} from "../services/oauth";

const sanitizeUser = (user: any) => {
  const clone = { ...user };
  delete clone.hashedPassword;
  return clone;
};

const issueTokens = async (payload: {
  id: string;
  role: "USER" | "DRIVER" | "ADMIN";
  driverId?: string;
}) => {
  const { accessToken, refreshToken } = await createSession(payload);
  return { token: accessToken, refreshToken };
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phoneNumber } = req.body;
    if (!name || !email || !password || !phoneNumber)
      return res.status(400).json({ message: "All fields are required" });

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phoneNumber }] },
    });
    if (existing)
      return res.status(409).json({ message: "Email or phone already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, phoneNumber, hashedPassword, role: "USER" },
    });
    await ensureWallet(user.id);

    const verifyToken = await createEmailVerificationToken(user.id, email);
    const apiUrl = `${env.clientOrigin.replace(/\/$/, "")}/api/auth/verify-email?token=${verifyToken}`;
    await sendVerificationEmail(email, apiUrl).catch(() => undefined);
    if (env.otpDebug) console.log(`[EMAIL:verify-link] ${apiUrl}`);

    const { token, refreshToken } = await issueTokens({ id: user.id, role: "USER" });
    return res
      .status(201)
      .json({ message: "Registered", token, refreshToken, user: sanitizeUser(user), role: "USER" });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const registerDriver = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      phoneNumber,
      licenseNumber,
      vehicleType,
      licensePlate,
      city,
      area,
      make,
      model,
      year,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !phoneNumber ||
      !licenseNumber ||
      !vehicleType ||
      !licensePlate ||
      !city ||
      !area
    )
      return res.status(400).json({ message: "All fields are required" });

    if (!Object.values(VehicleType).includes(vehicleType))
      return res.status(400).json({ message: "Invalid vehicle type" });

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phoneNumber }] },
    });
    if (existing)
      return res.status(409).json({ message: "Email or phone already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, phoneNumber, hashedPassword, role: "DRIVER" },
      });
      const driver = await tx.driver.create({
        data: {
          userId: user.id,
          name,
          email,
          phoneNumber,
          licenseNumber,
          vehicleType,
          licensePlate,
          city,
          area,
          status: "PENDING",
        },
      });
      await tx.vehicle.create({
        data: {
          driverId: driver.id,
          vehicleType,
          licensePlate,
          make: make ?? null,
          model: model ?? null,
          year: year ? Number(year) : null,
          status: "PENDING",
        },
      });
      return { user, driver };
    });

    const { token, refreshToken } = await issueTokens({
      id: result.user.id,
      role: "DRIVER",
      driverId: result.driver.id,
    });
    return res.status(201).json({
      message: "Driver registered. Awaiting admin approval.",
      token,
      refreshToken,
      user: sanitizeUser(result.user),
      driver: result.driver,
      role: "DRIVER",
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phoneNumber, adminSecret } = req.body;
    if (adminSecret !== (process.env.ADMIN_SIGNUP_SECRET || "quickmove-admin"))
      return res.status(403).json({ message: "Invalid admin secret" });
    if (!name || !email || !password || !phoneNumber)
      return res.status(400).json({ message: "All fields are required" });

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phoneNumber }] },
    });
    if (existing)
      return res.status(409).json({ message: "Email or phone already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, phoneNumber, hashedPassword, role: "ADMIN" },
      });
      await tx.admin.create({ data: { userId: user.id } });
      return user;
    });

    const { token, refreshToken } = await issueTokens({ id: result.id, role: "ADMIN" });
    return res
      .status(201)
      .json({ message: "Admin registered", token, refreshToken, user: sanitizeUser(result), role: "ADMIN" });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await prisma.user.findUnique({
      where: { email },
      include: { driver: true },
    });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.hashedPassword);
    if (!ok) {
      const msg = user.googleId
        ? "This account uses Google sign-in. Use Sign in with Google instead."
        : "Invalid credentials";
      return res.status(401).json({ message: msg });
    }

    const { token, refreshToken } = await issueTokens({
      id: user.id,
      role: user.role,
      driverId: user.driver?.id,
    });
    return res.status(200).json({
      message: "Login successful",
      token,
      refreshToken,
      user: sanitizeUser(user),
      role: user.role,
      driverId: user.driver?.id ?? null,
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.id },
      include: { driver: { include: { vehicles: true } } },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ user: sanitizeUser(user), role: user.role });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ message: "refreshToken required" });

    const result = await refreshSession(refreshToken);
    if (!result) return res.status(401).json({ message: "Invalid or expired refresh token" });

    return res.status(200).json({
      message: "Token refreshed",
      token: result.accessToken,
      refreshToken: result.refreshToken,
      role: result.role,
      driverId: result.driverId,
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await revokeSession(refreshToken);
    return res.status(200).json({ message: "Logged out" });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const authConfig = async (_req: Request, res: Response) => {
  const configured = isGoogleOAuthConfigured();
  return res.status(200).json({
    googleOAuth: {
      enabled: configured || isGoogleOAuthMock(),
      mode: configured ? "google" : "mock",
      url: "/api/auth/oauth/google",
    },
    otp: { debug: env.otpDebug },
  });
};

export const sendOtpHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { phoneNumber, channel, target, purpose } = req.body as {
      phoneNumber?: string;
      channel?: OtpChannel;
      target?: string;
      purpose?: string;
    };

    if (phoneNumber && !req.auth) {
      const result =
        purpose === "guest"
          ? await sendGuestPhoneOtp(String(phoneNumber))
          : await sendPhoneLoginOtp(String(phoneNumber));
      return res.status(200).json(result);
    }

    if (!req.auth) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!channel || !target || !["phone", "email"].includes(channel)) {
      return res.status(400).json({ message: "channel (phone|email) and target required" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.auth.id } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const normalizedTarget =
      channel === "email" ? target.trim().toLowerCase() : target.replace(/\s+/g, "");

    const result = await sendOtp({
      userId: user.id,
      channel,
      target: normalizedTarget,
    });
    return res.status(200).json(result);
  } catch (err: any) {
    if (err.status === 429) {
      return res.status(429).json({
        message: err.message,
        retryAfterSec: err.retryAfterSec,
      });
    }
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const verifyOtpHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { phoneNumber, code, channel, target, name, purpose } = req.body as {
      phoneNumber?: string;
      code?: string;
      channel?: OtpChannel;
      target?: string;
      name?: string;
      purpose?: string;
    };

    if (!code) return res.status(400).json({ message: "code required" });

    if (phoneNumber && !req.auth) {
      if (purpose === "guest") {
        const result = await verifyGuestPhoneOtp(String(phoneNumber), String(code));
        return res.status(200).json({ message: "Phone verified", ...result });
      }

      const result = await verifyPhoneLoginOtp({
        phoneNumber: String(phoneNumber),
        code: String(code),
        name,
      });
      return res.status(200).json({
        message: "Login successful",
        token: result.token,
        refreshToken: result.refreshToken,
        user: sanitizeUser(result.user),
        role: result.user.role,
        driverId: result.user.driver?.id ?? null,
      });
    }

    if (!req.auth) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!channel || !target || !["phone", "email"].includes(channel)) {
      return res
        .status(400)
        .json({ message: "channel (phone|email) and target required" });
    }

    const user = await verifyOtp({
      userId: req.auth.id,
      channel,
      target,
      code: String(code).trim(),
    });

    return res.status(200).json({
      message: `${channel === "phone" ? "Phone" : "Email"} verified`,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    if (err.status === 400) return res.status(400).json({ message: err.message });
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const verifyEmailHandler = async (req: Request, res: Response) => {
  try {
    const token =
      (req.body?.token as string | undefined) ||
      (req.query.token as string | undefined);
    if (!token) return res.status(400).json({ message: "token required" });

    const user = await verifyEmailToken(String(token));
    return res.status(200).json({ message: "Email verified", user: sanitizeUser(user) });
  } catch (err: any) {
    if (err.status === 400) return res.status(400).json({ message: err.message });
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const resendEmailVerification = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.id } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.emailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const verifyToken = await createEmailVerificationToken(user.id, user.email);
    const apiUrl = `${req.protocol}://${req.get("host")}/api/auth/verify-email?token=${verifyToken}`;
    await sendVerificationEmail(user.email, apiUrl);
    if (env.otpStubExpose) console.log(`[EMAIL:verify-link] ${apiUrl}`);

    return res.status(200).json({
      message: "Verification email sent",
      ...(env.otpStubExpose ? { debugToken: verifyToken, verifyUrl: apiUrl } : {}),
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Internal error", error: err.message });
  }
};

export const sendEmailVerification = resendEmailVerification;

export const googleOAuthStart = async (_req: Request, res: Response) => {
  if (isGoogleOAuthConfigured()) {
    const state = crypto.randomBytes(16).toString("hex");
    return res.redirect(buildGoogleAuthUrl(state));
  }
  if (isGoogleOAuthMock()) {
    return res.redirect("/api/auth/google/callback?mock=1");
  }
  return res.status(503).json({
    configured: false,
    message:
      "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server .env — see .env.example.",
  });
};

export const googleOAuthCallback = async (req: Request, res: Response) => {
  try {
    const { mock, code, error } = req.query;

    if (error && typeof error === "string") {
      return res.redirect(`${env.clientOrigin.replace(/\/$/, "")}/login?oauth_error=1`);
    }

    let profile;
    if (mock === "1" && isGoogleOAuthMock()) {
      profile = mockGoogleProfile();
    } else {
      if (!isGoogleOAuthConfigured()) {
        return res.status(503).json({ configured: false, message: "Google OAuth is not configured." });
      }
      if (!code || typeof code !== "string") {
        return res.redirect(`${env.clientOrigin.replace(/\/$/, "")}/login?oauth_error=1`);
      }
      profile = await exchangeGoogleCode(code);
    }

    const user = await findOrLinkGoogleUser(profile);
    const tokens = await issueOAuthTokens(user);
    const redirect = buildOAuthCallbackRedirect({
      ...tokens,
      role: user.role,
      driverId: user.driver?.id ?? null,
    });
    return res.redirect(redirect);
  } catch (err: any) {
    console.error("[oauth] callback failed", err.message);
    return res.redirect(`${env.clientOrigin.replace(/\/$/, "")}/login?oauth_error=1`);
  }
};
