import { Router } from "express";
import rateLimit from "express-rate-limit";
import { createWidgetSession, getWidgetMessages, sendWidgetMessage } from "../controllers/widgetController.js";

const router = Router();
router.use(rateLimit({ windowMs: 60 * 1000, max: 60 }));
router.post("/session", createWidgetSession);
router.post("/message", sendWidgetMessage);
router.get("/messages/:sessionId", getWidgetMessages);

export default router;
