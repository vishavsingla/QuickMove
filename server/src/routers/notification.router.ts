import { Router } from "express";
import { listMine, markRead } from "../controllers/notification.controller";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);
router.get("/", listMine);
router.post("/:id/read", markRead);

export default router;
