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
};
