import { Router } from "express";
import {
  listDrivers,
  setDriverStatus,
  listBookings,
  listUsers,
  stats,
} from "../controllers/admin.controller";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/drivers", listDrivers);
router.post("/drivers/:id/status", setDriverStatus);
router.get("/bookings", listBookings);
router.get("/users", listUsers);
router.get("/stats", stats);

export default router;
