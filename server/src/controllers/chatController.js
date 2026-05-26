import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";

const include = { customer: { select: { id: true, name: true, email: true } }, agent: { select: { id: true, name: true, email: true } }, messages: { orderBy: { createdAt: "asc" } } };

export async function startChat(req, res, next) {
  try {
    const chat = await prisma.chatSession.create({ data: { customerId: req.user.id, language: req.body.language || req.user.language }, include });
    success(res, chat, "Chat started", 201);
  } catch (error) { next(error); }
}

export async function getChats(req, res, next) {
  try {
    const where = req.user.role === "CUSTOMER" ? { customerId: req.user.id } : req.user.role === "AGENT" ? { OR: [{ agentId: req.user.id }, { agentId: null }] } : {};
    success(res, await prisma.chatSession.findMany({ where, include, orderBy: { updatedAt: "desc" } }));
  } catch (error) { next(error); }
}

export async function getChat(req, res, next) {
  try {
    const chat = await prisma.chatSession.findUnique({ where: { id: req.params.id }, include });
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });
    success(res, chat);
  } catch (error) { next(error); }
}

export async function sendChatMessage(req, res, next) {
  try {
    const message = await prisma.message.create({
      data: {
        content: req.body.content || req.body.fileName || "Attachment",
        senderId: req.user.id,
        chatSessionId: req.params.id,
        fileUrl: req.body.fileUrl,
        messageType: req.body.messageType || (req.body.fileUrl ? "FILE" : "TEXT"),
      },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });
    await prisma.chatSession.update({ where: { id: req.params.id }, data: { status: "ACTIVE" } });
    req.app.get("io")?.to(req.params.id).emit("receive_message", message);
    success(res, message, "Message sent", 201);
  } catch (error) { next(error); }
}

export async function transferChat(req, res, next) {
  try {
    const chat = await prisma.chatSession.update({ where: { id: req.params.id }, data: { agentId: req.body.agentId, status: "TRANSFERRED" }, include });
    req.app.get("io")?.to(req.params.id).emit("agent_transfer", chat);
    success(res, chat, "Chat transferred");
  } catch (error) { next(error); }
}

export async function acceptChat(req, res, next) {
  try {
    const chat = await prisma.chatSession.update({ where: { id: req.params.id }, data: { agentId: req.user.id, status: "ACTIVE" }, include });
    req.app.get("io")?.to(req.params.id).emit("chat_notification", { chatSessionId: req.params.id, message: "Chat accepted by agent", chat });
    success(res, chat, "Chat accepted");
  } catch (error) { next(error); }
}

export async function rateChat(req, res, next) {
  try {
    success(res, await prisma.chatSession.update({ where: { id: req.params.id }, data: { rating: req.body.rating, feedback: req.body.feedback }, include }), "Chat rated");
  } catch (error) { next(error); }
}

export async function closeChat(req, res, next) {
  try {
    const chat = await prisma.chatSession.update({ where: { id: req.params.id }, data: { status: "CLOSED" }, include });
    req.app.get("io")?.to(req.params.id).emit("chat_notification", { chatSessionId: req.params.id, message: "Chat closed", chat });
    success(res, chat, "Chat closed");
  } catch (error) { next(error); }
}
