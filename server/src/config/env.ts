import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5001),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
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
