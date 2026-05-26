import { Router } from "express";
import { agentReport, customerReport, dashboardReport, responseTimeReport, ticketReport } from "../controllers/reportController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(protect, authorize("ADMIN", "AGENT"));
router.get("/dashboard", dashboardReport);
router.get("/tickets", ticketReport);
router.get("/agents", agentReport);
router.get("/customers", customerReport);
router.get("/response-time", responseTimeReport);
export default router;
