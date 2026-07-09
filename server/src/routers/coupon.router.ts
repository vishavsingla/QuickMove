import { Router } from "express";
import { validate } from "../controllers/coupon.controller";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.use(requireAuth, requireRole("USER"));

router.post("/validate", validate);

export default router;
