import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
  id: string;
  role: "USER" | "DRIVER" | "ADMIN";
  driverId?: string;
}

export const signAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, env.accessTokenSecret, { expiresIn: env.accessTokenTtl });

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, env.accessTokenSecret) as JwtPayload;

export interface PhoneVerifyPayload {
  phone: string;
  purpose: "guest_booking";
}

export const signPhoneVerificationToken = (phone: string): string =>
  jwt.sign(
    { phone, purpose: "guest_booking" } satisfies PhoneVerifyPayload,
    env.accessTokenSecret,
    { expiresIn: "15m" }
  );

export const verifyPhoneVerificationToken = (
  token: string
): PhoneVerifyPayload | null => {
  try {
    const payload = jwt.verify(token, env.accessTokenSecret) as PhoneVerifyPayload;
    if (payload.purpose !== "guest_booking" || !payload.phone) return null;
    return payload;
  } catch {
    return null;
  }
};
