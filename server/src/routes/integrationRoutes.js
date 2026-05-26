import { Router } from "express";
import { getIntegrations, testEmail, testWhatsapp, updateIntegration } from "../controllers/integrationController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(protect, authorize("ADMIN"));
router.get("/", getIntegrations);
router.post("/email/test", testEmail);
router.post("/whatsapp/test", testWhatsapp);
router.put("/:type", updateIntegration);
export default router;
