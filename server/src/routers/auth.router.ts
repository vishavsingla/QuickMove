import { Router } from "express";
import {
  registerUser,
  registerDriver,
  registerAdmin,
  login,
  me,
  refresh,
  logout,
} from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth";
import { authRateLimit } from "../middlewares/rateLimit";

const router = Router();

router.use(authRateLimit);

router.post("/register/user", registerUser);
router.post("/register/driver", registerDriver);
router.post("/register/admin", registerAdmin);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
