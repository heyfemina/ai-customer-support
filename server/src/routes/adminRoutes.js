import { Router } from "express";
import { getAlerts, resolveAlert, systemHealth } from "../controllers/healthController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(protect, authorize("ADMIN"));
router.get("/system-health", systemHealth);
router.get("/alerts", getAlerts);
router.put("/alerts/:id/resolve", resolveAlert);

export default router;
