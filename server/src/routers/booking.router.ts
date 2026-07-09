import { Router } from "express";
import {
  createBooking,
  listMyBookings,
  getBooking,
  cancelBooking,
  rateBooking,
} from "../controllers/booking.controller";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);

router.post("/", requireRole("USER"), createBooking);
router.get("/", requireRole("USER"), listMyBookings);
router.get("/:id", getBooking);
router.post("/:id/cancel", requireRole("USER"), cancelBooking);
router.post("/:id/rate", requireRole("USER"), rateBooking);

export default router;
