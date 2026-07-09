import { Router } from "express";
import {
  listMine,
  markRead,
  subscribePush,
  unsubscribePush,
  pushStatus,
} from "../controllers/notification.controller";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.use(requireAuth);
router.get("/", listMine);
router.get("/push/status", pushStatus);
router.post("/push/subscribe", subscribePush);
router.post("/push/unsubscribe", unsubscribePush);
router.post("/:id/read", markRead);

export default router;
