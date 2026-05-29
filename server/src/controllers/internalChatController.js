import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";

const include = {
  openedBy: { select: { id: true, name: true, email: true, role: true } },
  participants: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
  messages: {
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, name: true, email: true, role: true } } },
  },
};

function canUseInternalChat(user, chat) {
  if (!user || !chat) return false;
  if (user.role === "ADMIN") return true;
  return chat.participants?.some((participant) => participant.userId === user.id);
}

function participantInput(userIds, opener) {
  const ids = [...new Set([opener.id, ...(userIds || [])].filter(Boolean))];
  return ids.map((userId) => ({ userId, role: userId === opener.id ? opener.role : "AGENT" }));
}

export async function getInternalChats(req, res, next) {
  try {
    const where = req.user.role === "ADMIN" ? {} : { participants: { some: { userId: req.user.id } } };
    const chats = await prisma.internalChat.findMany({ where, include, orderBy: { updatedAt: "desc" } });
    success(res, chats);
  } catch (error) { next(error); }
}

export async function createInternalChat(req, res, next) {
  try {
    if (!["ADMIN", "AGENT"].includes(req.user.role)) return res.status(403).json({ success: false, message: "Access denied" });
    const subject = req.body.subject?.trim() || "Internal support discussion";
    const participants = participantInput(req.body.participantIds, req.user);
    if (req.user.role === "AGENT") {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
      admins.forEach((admin) => {
        if (!participants.some((participant) => participant.userId === admin.id)) participants.push({ userId: admin.id, role: "ADMIN" });
      });
    }
    const chat = await prisma.internalChat.create({
      data: {
        subject,
        ticketId: req.body.ticketId || null,
        openedById: req.user.id,
        participants: { create: participants },
        messages: req.body.content?.trim()
          ? { create: { senderId: req.user.id, content: req.body.content.trim(), fileUrl: req.body.fileUrl, fileName: req.body.fileName, fileType: req.body.fileType } }
          : undefined,
      },
      include,
    });
    req.app.get("io")?.emit("internal_chat_updated", chat);
    success(res, chat, "Internal chat created", 201);
  } catch (error) { next(error); }
}

export async function sendInternalMessage(req, res, next) {
  try {
    const chat = await prisma.internalChat.findUnique({ where: { id: req.params.id }, include: { participants: true } });
    if (!canUseInternalChat(req.user, chat)) return res.status(403).json({ success: false, message: "Access denied" });
    const content = req.body.content || req.body.fileName || "Attachment";
    const message = await prisma.internalMessage.create({
      data: {
        chatId: chat.id,
        senderId: req.user.id,
        content,
        fileUrl: req.body.fileUrl,
        fileName: req.body.fileName,
        fileType: req.body.fileType,
      },
      include: { sender: { select: { id: true, name: true, email: true, role: true } } },
    });
    await prisma.internalChat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } });
    req.app.get("io")?.to(`internal:${chat.id}`).emit("internal_message", message);
    req.app.get("io")?.emit("internal_chat_updated", { id: chat.id });
    success(res, message, "Message sent", 201);
  } catch (error) { next(error); }
}
