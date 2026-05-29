import { Router } from "express";
import { createInternalChat, getInternalChats, sendInternalMessage } from "../controllers/internalChatController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(protect, authorize("ADMIN", "AGENT"));
router.get("/", getInternalChats);
router.post("/", createInternalChat);
router.post("/:id/message", sendInternalMessage);

export default router;
