import dotenv from "dotenv";
import { parseCorsOrigins } from "./cors";

dotenv.config();

const corsOrigins = parseCorsOrigins();

export const env = {
  port: Number(process.env.PORT || 5001),
  /** @deprecated Use corsOrigins — kept for backward compatibility */
  clientOrigin: corsOrigins[0] || "http://localhost:3000",
  corsOrigins,
  accessTokenSecret:
    process.env.ACCESS_TOKEN_PRIVATE_KEY || "quickmove_dev_access_secret",
  refreshTokenSecret:
    process.env.REFRESH_TOKEN_PRIVATE_KEY || "quickmove_dev_refresh_secret",
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
  redisUrl: process.env.REDIS_URL || "",
  nominatimUrl:
    process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org",
  photonUrl: process.env.PHOTON_URL || "https://photon.komoot.io",
  openMeteoUrl:
    process.env.OPEN_METEO_URL || "https://geocoding-api.open-meteo.com",
  osrmUrl: process.env.OSRM_URL || "https://router.project-osrm.org",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleOAuthRedirectUri:
    process.env.GOOGLE_CALLBACK_URL ||
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    `http://localhost:${process.env.PORT || 5001}/api/auth/google/callback`,
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "QuickMove <onboarding@resend.dev>",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER || "",
  otpStubExpose:
    process.env.OTP_STUB_EXPOSE === "true" ||
    process.env.OTP_DEBUG === "true" ||
    process.env.NODE_ENV !== "production",
  otpDebug:
    process.env.OTP_STUB_EXPOSE === "true" ||
    process.env.OTP_DEBUG === "true" ||
    process.env.NODE_ENV !== "production",
};
