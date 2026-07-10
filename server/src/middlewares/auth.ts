import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type JwtPayload } from "../utils/jwt";

export type AuthRequest = Request & {
  auth?: JwtPayload;
};

const extractToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  const cookie = req.headers.cookie;
  if (cookie) {
    const match = cookie
      .split(";")
      .map((c: string) => c.trim())
      .find((c: string) => c.startsWith("accessToken="));
    if (match) return match.split("=")[1];
  }
  return null;
};

export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const requireRole =
  (...roles: JwtPayload["role"][]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ message: "Authentication required" });
    if (!roles.includes(req.auth.role))
      return res.status(403).json({ message: "Insufficient permissions" });
    return next();
  };
