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
