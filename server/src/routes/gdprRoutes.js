import { Router } from "express";
import { anonymizeUser, approveRequest, exportData, getGDPRRequests, rejectRequest, requestDelete, requestExport } from "../controllers/gdprController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(protect);
router.post("/export-request", requestExport);
router.get("/export/:userId", exportData);
router.post("/delete-request", requestDelete);
router.get("/requests", authorize("ADMIN"), getGDPRRequests);
router.put("/requests/:id/approve", authorize("ADMIN"), approveRequest);
router.put("/requests/:id/reject", authorize("ADMIN"), rejectRequest);
router.post("/anonymize/:userId", authorize("ADMIN"), anonymizeUser);

export default router;
