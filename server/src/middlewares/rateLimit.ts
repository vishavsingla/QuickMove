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

/** Guest booking / track lookups — limit abuse without auth. */
export const guestBookingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many guest booking attempts. Try again later." },
});

/** OTP send — extra ceiling per IP (per-target limit enforced in service). */
export const otpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many OTP requests. Try again later." },
});

/** General API ceiling per IP. */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Rate limit exceeded." },
});
