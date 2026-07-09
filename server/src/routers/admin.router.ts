import { Router } from "express";
import {
  listDrivers,
  setDriverStatus,
  listBookings,
  listUsers,
  stats,
} from "../controllers/admin.controller";
import { reviewKyc } from "../controllers/kyc.controller";
import {
  listCoupons,
  createCoupon,
  toggleCoupon,
} from "../controllers/coupon.controller";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/drivers", listDrivers);
router.post("/drivers/:id/status", setDriverStatus);
router.post("/drivers/:id/kyc", reviewKyc);
router.get("/bookings", listBookings);
router.get("/users", listUsers);
router.get("/stats", stats);
router.get("/coupons", listCoupons);
router.post("/coupons", createCoupon);
router.post("/coupons/:id/toggle", toggleCoupon);

export default router;
