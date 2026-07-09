import { Router } from "express";
import {
  getProfile,
  setAvailability,
  updateLocation,
  listOffers,
  listMyJobs,
  acceptBooking,
  rejectBooking,
  updateJobStatus,
} from "../controllers/driver.controller";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.use(requireAuth, requireRole("DRIVER"));

router.get("/profile", getProfile);
router.post("/availability", setAvailability);
router.post("/location", updateLocation);
router.get("/offers", listOffers);
router.get("/jobs", listMyJobs);
router.post("/bookings/:id/accept", acceptBooking);
router.post("/bookings/:id/reject", rejectBooking);
router.post("/bookings/:id/status", updateJobStatus);

export default router;
