import { Router } from "express";
import { aiReply, getAISettings, summarizeTicket, translate, updateAISettings } from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(protect);
router.post("/reply", aiReply);
router.post("/translate", translate);
router.post("/summarize-ticket", summarizeTicket);
router.get("/settings", getAISettings);
router.put("/settings", authorize("ADMIN"), updateAISettings);
export default router;
