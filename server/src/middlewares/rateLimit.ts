import rateLimit from "express-rate-limit";

/** Strict limit on credential endpoints to slow brute-force attacks. */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts. Try again later." },
});

/** Geo search/estimate can be abused for upstream API hammering. */
export const geoRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many geo requests. Slow down." },
});

/** General API ceiling per IP. */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Rate limit exceeded." },
});
