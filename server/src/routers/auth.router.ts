import { Router } from "express";
import {
  registerUser,
  registerDriver,
  registerAdmin,
  login,
  me,
} from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/register/user", registerUser);
router.post("/register/driver", registerDriver);
router.post("/register/admin", registerAdmin);
router.post("/login", login);
router.get("/me", requireAuth, me);

export default router;
