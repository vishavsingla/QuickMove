import { Router } from "express";
import {
  registerUser,
  registerDriver,
  registerAdmin,
  login,
  me,
  refresh,
  logout,
  authConfig,
  sendOtpHandler,
  verifyOtpHandler,
  verifyEmailHandler,
  resendEmailVerification,
  googleOAuthStart,
  googleOAuthCallback,
} from "../controllers/auth.controller";
import { requireAuth, optionalAuth } from "../middlewares/auth";
import { authRateLimit, otpRateLimit } from "../middlewares/rateLimit";

const router = Router();

router.use(authRateLimit);

router.get("/config", authConfig);

router.post("/register/user", registerUser);
router.post("/register/driver", registerDriver);
router.post("/register/admin", registerAdmin);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

const otpSend = [otpRateLimit, optionalAuth, sendOtpHandler] as const;
const otpVerify = [otpRateLimit, optionalAuth, verifyOtpHandler] as const;

router.post("/send-otp", ...otpSend);
router.post("/verify-otp", ...otpVerify);
router.post("/otp/send", requireAuth, otpRateLimit, sendOtpHandler);
router.post("/otp/verify", requireAuth, otpRateLimit, verifyOtpHandler);

router.post("/verify-email", verifyEmailHandler);
router.get("/verify-email", verifyEmailHandler);
router.post("/resend-verification", requireAuth, resendEmailVerification);

router.get("/google", googleOAuthStart);
router.get("/google/callback", googleOAuthCallback);
router.get("/oauth/google", googleOAuthStart);
router.get("/oauth/google/callback", googleOAuthCallback);

export default router;
