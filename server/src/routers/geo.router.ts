import { Router } from "express";
import { searchPlaces, estimate } from "../controllers/geo.controller";

const router = Router();

router.get("/search", searchPlaces);
router.post("/estimate", estimate);

export default router;
