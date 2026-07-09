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
  getEarnings,
  updateBankDetails,
  requestWithdrawal,
  listPayouts,
} from "../controllers/driver.controller";
import { getKyc, submitKyc } from "../controllers/kyc.controller";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.use(requireAuth, requireRole("DRIVER"));

router.get("/profile", getProfile);
router.get("/kyc", getKyc);
router.post("/kyc/submit", submitKyc);
router.post("/availability", setAvailability);
router.post("/location", updateLocation);
router.get("/offers", listOffers);
router.get("/jobs", listMyJobs);
router.get("/earnings", getEarnings);
router.get("/payouts", listPayouts);
router.post("/bank", updateBankDetails);
router.post("/withdraw", requestWithdrawal);
router.post("/bookings/:id/accept", acceptBooking);
router.post("/bookings/:id/reject", rejectBooking);
router.post("/bookings/:id/status", updateJobStatus);

export default router;
