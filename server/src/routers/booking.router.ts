import { Router } from "express";
import {
  createBooking,
  createGuestBooking,
  trackGuestBooking,
  listMyBookings,
  getBooking,
  cancelBooking,
  rateBooking,
} from "../controllers/booking.controller";
import { listMessages } from "../controllers/chat.controller";
import { getInvoice } from "../controllers/invoice.controller";
import { requireAuth, requireRole } from "../middlewares/auth";
import { guestBookingRateLimit } from "../middlewares/rateLimit";

const router = Router();

router.post("/guest", guestBookingRateLimit, createGuestBooking);
router.get("/guest/track", guestBookingRateLimit, trackGuestBooking);

router.use(requireAuth);

router.post("/", requireRole("USER"), createBooking);
router.get("/", requireRole("USER"), listMyBookings);
router.get("/:id/chat", listMessages);
router.get("/:id/invoice", getInvoice);
router.get("/:id", getBooking);
router.post("/:id/cancel", requireRole("USER"), cancelBooking);
router.post("/:id/rate", requireRole("USER"), rateBooking);

export default router;
