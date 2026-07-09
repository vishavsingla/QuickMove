import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { signAccessToken, JwtPayload } from "../utils/jwt";
import { env } from "../config/env";

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const refreshExpiry = () =>
  new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

export const createSession = async (payload: JwtPayload) => {
  const refreshToken = crypto.randomBytes(32).toString("hex");
  const session = await prisma.session.create({
    data: {
      sessionToken: crypto.randomUUID(),
      refreshToken: hashToken(refreshToken),
      expires: refreshExpiry(),
      userId: payload.id,
    },
  });
  const accessToken = signAccessToken(payload);
  return { accessToken, refreshToken, sessionId: session.id };
};

export const refreshSession = async (refreshToken: string) => {
  const hashed = hashToken(refreshToken);
  const session = await prisma.session.findFirst({
    where: { refreshToken: hashed, expires: { gt: new Date() } },
    include: { user: { include: { driver: true } } },
  });
  if (!session) return null;

  const payload: JwtPayload = {
    id: session.user.id,
    role: session.user.role,
    driverId: session.user.driver?.id,
  };

  // Rotate refresh token on each use.
  const newRefresh = crypto.randomBytes(32).toString("hex");
  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshToken: hashToken(newRefresh),
      expires: refreshExpiry(),
    },
  });

  return {
    accessToken: signAccessToken(payload),
    refreshToken: newRefresh,
    role: session.user.role,
    driverId: session.user.driver?.id ?? null,
  };
};

export const revokeSession = async (refreshToken: string) => {
  const hashed = hashToken(refreshToken);
  await prisma.session.deleteMany({ where: { refreshToken: hashed } });
};

export const revokeAllSessions = async (userId: string) => {
  await prisma.session.deleteMany({ where: { userId } });
};
