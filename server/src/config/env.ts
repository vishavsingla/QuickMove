import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5001),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  accessTokenSecret:
    process.env.ACCESS_TOKEN_PRIVATE_KEY || "quickmove_dev_access_secret",
  refreshTokenSecret:
    process.env.REFRESH_TOKEN_PRIVATE_KEY || "quickmove_dev_refresh_secret",
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "7d",
  nominatimUrl:
    process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org",
  osrmUrl: process.env.OSRM_URL || "https://router.project-osrm.org",
};
