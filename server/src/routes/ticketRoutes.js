import { Router } from "express";
import { createTicket, deleteTicket, getTicket, getTickets, replyTicket, replyTicketComplaint, submitTicketComplaint, submitTicketFeedback, ticketSchema, updateTicket, updateTicketStatus } from "../controllers/ticketController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";

const router = Router();
router.use(protect);
router.post("/", validate(ticketSchema), createTicket);
router.get("/", getTickets);
router.get("/:id", getTicket);
router.put("/:id", updateTicket);
router.put("/:id/status", updateTicketStatus);
router.post("/:id/reply", replyTicket);
router.post("/:id/feedback", submitTicketFeedback);
router.post("/:id/complaint", submitTicketComplaint);
router.post("/:id/complaint/reply", replyTicketComplaint);
router.delete("/:id", deleteTicket);
export default router;
