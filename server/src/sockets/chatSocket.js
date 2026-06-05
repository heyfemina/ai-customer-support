import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { decryptMessageContent, encryptMessageContent } from "../utils/messageCrypto.js";
import { encryptionVersion } from "../utils/encryption.js";

const include = {
  customer: { select: { id: true, name: true, email: true, role: true } },
  agent: { select: { id: true, name: true, email: true, role: true, department: true, categories: true, agentStatus: true } },
  messages: {
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, name: true, email: true, role: true } } },
  },
};

const waitingNotice = "All agents are currently busy. Estimated wait time is 5-10 minutes.";
const queueStatuses = ["WAITING", "TRANSFERRED"];

function normalizeCategory(value) {
  return String(value || "General").trim().replace(/\s+support$/i, "").toLowerCase();
}

function categoryValuesForUser(user) {
  const values = new Map();
  [...(Array.isArray(user?.categories) ? user.categories : []), user?.department]
    .filter(Boolean)
    .forEach((value) => {
      const clean = String(value).trim().replace(/\s+support$/i, "");
      if (clean) values.set(normalizeCategory(clean), clean);
    });
  if (!values.size) values.set("general", "General");
  return [...values.values()];
}

function agentMatchesCategory(user, category) {
  if (user?.role === "ADMIN") return true;
  if (user?.role !== "AGENT") return false;
  const allowed = new Set(categoryValuesForUser(user).map(normalizeCategory));
  return allowed.has(normalizeCategory(category));
}

function departmentRoom(category) {
  return `department:${normalizeCategory(category)}`;
}

function agentRoom(agentId) {
  return `agent:${agentId}`;
}

function emitChatUpdate(io, chat) {
  if (!chat) return;
  const shaped = shapeChat(chat);
  io.to("admins").emit("chat_queue_updated", shaped);
  io.to(chat.customerId).emit("chat_queue_updated", shaped);
  if (chat.agentId) {
    io.to(agentRoom(chat.agentId)).emit("chat_queue_updated", shaped);
  } else if (queueStatuses.includes(chat.status)) {
    io.to(departmentRoom(chat.category)).emit("chat_queue_updated", shaped);
  }
  io.to(chat.id).emit("chat_queue_updated", shaped);
}

function emitChatNotification(io, chat, message) {
  if (!chat) return;
  const shaped = shapeChat(chat);
  const payload = { chatSessionId: chat.id, message, chat: shaped };
  io.to("admins").emit("chat_notification", payload);
  io.to(chat.customerId).emit("chat_notification", payload);
  if (chat.agentId) {
    io.to(agentRoom(chat.agentId)).emit("chat_notification", payload);
  } else if (queueStatuses.includes(chat.status)) {
    io.to(departmentRoom(chat.category)).emit("chat_notification", payload);
  }
  io.to(chat.id).emit("chat_notification", payload);
}

function shapeMessage(message) {
  return {
    ...message,
    content: decryptMessageContent(message.content),
    originalContent: message.originalContent || decryptMessageContent(message.content),
    encrypted: message.content?.startsWith("enc:v1:") || false,
  };
}

function shapeChat(chat, index = 0) {
  const shapedMessages = (chat.messages || []).map(shapeMessage);
  const systemMessages = !chat.agentId && ["WAITING", "TRANSFERRED"].includes(chat.status)
    ? [{ id: `system-${chat.id}`, senderId: "system", content: waitingNotice, createdAt: chat.createdAt }]
    : [];
  return {
    ...chat,
    messages: [...systemMessages, ...shapedMessages],
    customerName: chat.customer?.name,
    agentName: chat.agent?.name,
    lastMessage: chat.lastMessage || decryptMessageContent(chat.messages?.at(-1)?.content || ""),
    channel: chat.channel || "Website chatbot",
    encrypted: chat.encrypted ?? true,
    queuePosition: chat.status === "WAITING" ? index + 1 : chat.queuePosition || 0,
    visitor: {
      ip: chat.visitorIp || "Unknown",
      page: chat.visitorPage || "/support",
      device: chat.visitorDevice || "Browser",
      visits: chat.visitorVisits || 1,
    },
  };
}

function canAccessChat(user, chat) {
  if (!user || !chat) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "CUSTOMER") return chat.customerId === user.id;
  if (user.role === "AGENT") {
    if (chat.agentId === user.id) return true;
    return !chat.agentId && queueStatuses.includes(chat.status) && agentMatchesCategory(user, chat.category);
  }
  return false;
}

export default function chatSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || token.startsWith("demo-")) return next();
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, name: true, role: true, language: true, department: true, categories: true } });
      if (user) socket.user = user;
      next();
    } catch {
      next(new Error("Socket authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    if (socket.user?.id) socket.join(socket.user.id);
    if (socket.user?.role === "ADMIN") socket.join("admins");
    if (socket.user?.role === "AGENT") {
      socket.join(agentRoom(socket.user.id));
      categoryValuesForUser(socket.user).forEach((category) => socket.join(departmentRoom(category)));
    }

    socket.on("join_chat", async (chatId, callback) => {
      const chat = await prisma.chatSession.findUnique({ where: { id: chatId } });
      if (!canAccessChat(socket.user, chat)) {
        callback?.({ success: false, message: "Access denied" });
        return;
      }
      socket.join(chatId);
      socket.emit("chat_notification", { chatSessionId: chatId, message: "Joined chat room" });
      callback?.({ success: true });
    });

    socket.on("leave_chat", (chatId) => socket.leave(chatId));
    socket.on("join_internal_chat", async (chatId, callback) => {
      const chat = await prisma.internalChat.findUnique({ where: { id: chatId }, include: { participants: true } });
      const allowed = socket.user?.role === "ADMIN" || chat?.participants?.some((participant) => participant.userId === socket.user?.id);
      if (!allowed) {
        callback?.({ success: false, message: "Access denied" });
        return;
      }
      socket.join(`internal:${chatId}`);
      callback?.({ success: true });
    });

    socket.on("leave_internal_chat", (chatId) => socket.leave(`internal:${chatId}`));

    socket.on("send_message", async (payload, callback) => {
      try {
        const senderId = socket.user?.id;
        if (!senderId || !payload.chatSessionId) throw new Error("senderId and chatSessionId are required");
        const chat = await prisma.chatSession.findUnique({ where: { id: payload.chatSessionId } });
        if (!canAccessChat(socket.user, chat)) throw new Error("Access denied");

        const content = payload.content || payload.fileName || "Attachment";
        const message = await prisma.message.create({
          data: {
            content: encryptMessageContent(content),
            originalContent: content,
            sourceLanguage: payload.sourceLanguage || socket.user?.language || chat.language,
            targetLanguage: payload.targetLanguage || chat.language,
            encryptionVersion: encryptionVersion(),
            senderId,
            chatSessionId: payload.chatSessionId,
            fileUrl: payload.fileUrl,
            messageType: payload.messageType || (payload.fileType?.startsWith("image/") ? "IMAGE" : payload.fileUrl ? "FILE" : "TEXT"),
          },
          include: { sender: { select: { id: true, name: true, role: true } } },
        });
        await prisma.chatSession.update({ where: { id: payload.chatSessionId }, data: { status: "ACTIVE", lastMessage: content } });
        const shapedMessage = shapeMessage(message);
        io.to(payload.chatSessionId).emit("receive_message", shapedMessage);
        const updatedChat = await prisma.chatSession.findUnique({ where: { id: payload.chatSessionId }, include });
        emitChatUpdate(io, updatedChat);

        emitChatNotification(io, updatedChat, "New message");
        callback?.({ success: true, data: { message: shapedMessage } });
      } catch (error) {
        callback?.({ success: false, message: error.message });
      }
    });

    socket.on("typing", (payload) => socket.to(payload.chatSessionId).emit("typing", payload));
    socket.on("stop_typing", (payload) => socket.to(payload.chatSessionId).emit("stop_typing", payload));
    socket.on("agent_transfer", (payload) => io.to(payload.chatSessionId).emit("agent_transfer", payload));
    socket.on("disconnect", () => {});
  });
}
