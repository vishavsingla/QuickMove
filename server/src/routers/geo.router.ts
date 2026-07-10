import { Router } from "express";
import { searchPlaces, reversePlace, estimate } from "../controllers/geo.controller";
import { geoRateLimit } from "../middlewares/rateLimit";

const router = Router();

router.use(geoRateLimit);

router.get("/search", searchPlaces);
router.get("/reverse", reversePlace);
router.post("/estimate", estimate);

export default router;
