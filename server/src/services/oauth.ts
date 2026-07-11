import crypto from "crypto";
import axios from "axios";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { ensureWallet } from "./payments";
import { createSession } from "./sessions";

export const isGoogleOAuthConfigured = () =>
  Boolean(env.googleClientId && env.googleClientSecret);

export const isGoogleOAuthMock = () => !isGoogleOAuthConfigured();

export const mockGoogleProfile = () => ({
  id: `mock_google_${crypto.randomBytes(8).toString("hex")}`,
  email: `mock.oauth+${Date.now()}@quickmove.dev`,
  name: "Mock Google User",
  verified_email: true,
});

const oauthPhoneForGoogleId = (googleId: string) =>
  `+oauth${googleId.replace(/\D/g, "").slice(0, 14)}`;

export const buildGoogleAuthUrl = (state: string) => {
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleOAuthRedirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

export const exchangeGoogleCode = async (code: string) => {
  const tokenRes = await axios.post(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: env.googleOAuthRedirectUri,
      grant_type: "authorization_code",
    }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  const { access_token: accessToken } = tokenRes.data;
  const profileRes = await axios.get(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  return profileRes.data as {
    id: string;
    email: string;
    name?: string;
    verified_email?: boolean;
  };
};

export const findOrLinkGoogleUser = async (profile: {
  id: string;
  email: string;
  name?: string;
  verified_email?: boolean;
}) => {
  const byGoogle = await prisma.user.findUnique({
    where: { googleId: profile.id },
    include: { driver: true },
  });
  if (byGoogle) return byGoogle;

  const byEmail = await prisma.user.findUnique({
    where: { email: profile.email },
    include: { driver: true },
  });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId: profile.id,
        emailVerified: profile.verified_email ?? byEmail.emailVerified,
        name: byEmail.name || profile.name || null,
      },
      include: { driver: true },
    });
  }

  const tempPassword = crypto.randomBytes(16).toString("hex");
  const hashedPassword = await bcrypt.hash(tempPassword, 10);
  let phoneNumber = oauthPhoneForGoogleId(profile.id);
  const phoneTaken = await prisma.user.findUnique({ where: { phoneNumber } });
  if (phoneTaken) {
    phoneNumber = `+oauth${Date.now()}${profile.id.slice(0, 6)}`;
  }

  const user = await prisma.user.create({
    data: {
      name: profile.name || null,
      email: profile.email,
      phoneNumber,
      hashedPassword,
      googleId: profile.id,
      emailVerified: profile.verified_email ?? false,
      role: "USER",
    },
    include: { driver: true },
  });
  await ensureWallet(user.id);
  return user;
};

export const issueOAuthTokens = async (user: {
  id: string;
  role: "USER" | "DRIVER" | "ADMIN";
  driver?: { id: string } | null;
}) => {
  const { accessToken, refreshToken } = await createSession({
    id: user.id,
    role: user.role,
    driverId: user.driver?.id,
  });
  return { token: accessToken, refreshToken };
};

export const buildOAuthCallbackRedirect = (tokens: {
  token: string;
  refreshToken: string;
  role: string;
  driverId?: string | null;
}) => {
  const base = env.clientOrigin.replace(/\/$/, "");
  const params = new URLSearchParams({
    token: tokens.token,
    refreshToken: tokens.refreshToken,
    role: tokens.role,
  });
  if (tokens.driverId) params.set("driverId", tokens.driverId);
  return `${base}/auth/callback?${params.toString()}`;
};
