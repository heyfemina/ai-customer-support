import { Router } from "express";
import { getActivityLogs } from "../controllers/activityController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = Router();
router.get("/", protect, authorize("ADMIN"), getActivityLogs);
export default router;
