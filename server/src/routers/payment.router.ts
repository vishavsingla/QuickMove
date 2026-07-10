import { Router } from "express";
import {
  getPaymentConfig,
  getWallet,
  topUp,
  createIntent,
  confirm,
  createOrder,
  verifyPayment,
  mockComplete,
} from "../controllers/payment.controller";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

router.get("/config", getPaymentConfig);
router.get("/wallet", getWallet);
router.post("/wallet/topup", topUp);
router.post("/intents", createIntent);
router.post("/intents/:id/confirm", confirm);
router.post("/razorpay/order", createOrder);
router.post("/razorpay/verify", verifyPayment);
router.post("/razorpay/mock-complete", mockComplete);

export default router;
