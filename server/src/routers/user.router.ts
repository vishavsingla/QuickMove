import { Router } from "express";
import {
  listAddresses,
  createAddress,
  deleteAddress,
  getProfile,
  updateProfile,
} from "../controllers/user.controller";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.use(requireAuth, requireRole("USER"));

router.get("/profile", getProfile);
router.patch("/profile", updateProfile);
router.get("/addresses", listAddresses);
router.post("/addresses", createAddress);
router.delete("/addresses/:id", deleteAddress);

export default router;
