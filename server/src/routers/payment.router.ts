import { Router } from "express";
import { getWallet, topUp, createIntent, confirm } from "../controllers/payment.controller";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

router.get("/wallet", getWallet);
router.post("/wallet/topup", topUp);
router.post("/intents", createIntent);
router.post("/intents/:id/confirm", confirm);

export default router;
