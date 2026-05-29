import { Router } from "express";
import { acceptChat, closeChat, getChat, getChats, rateChat, sendChatMessage, startChat, startTicketChat, transferChat } from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();
router.use(protect);
router.post("/start", startChat);
router.post("/ticket/:ticketId/start", startTicketChat);
router.get("/", getChats);
router.get("/:id", getChat);
router.post("/:id/message", sendChatMessage);
router.post("/:id/accept", acceptChat);
router.post("/:id/transfer", transferChat);
router.post("/:id/rating", rateChat);
router.put("/:id/close", closeChat);
export default router;
