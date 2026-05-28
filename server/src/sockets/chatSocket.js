import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { generateSupportReply } from "../services/aiService.js";
import { decryptMessageContent, encryptMessageContent } from "../utils/messageCrypto.js";
import { encryptionVersion } from "../utils/encryption.js";

const include = {
  customer: { select: { id: true, name: true, email: true } },
  agent: { select: { id: true, name: true, email: true } },
  messages: {
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, name: true, role: true } } },
  },
};

function shapeMessage(message) {
  return {
    ...message,
    content: decryptMessageContent(message.content),
    originalContent: message.originalContent || decryptMessageContent(message.content),
    encrypted: message.content?.startsWith("enc:v1:") || false,
  };
}

function shapeChat(chat, index = 0) {
  return {
    ...chat,
    messages: (chat.messages || []).map(shapeMessage),
    customerName: chat.customer?.name,
    agentName: chat.agent?.name,
    lastMessage: chat.lastMessage || decryptMessageContent(chat.messages?.at(-1)?.content || ""),
    channel: chat.channel || "Website chatbot",
    encrypted: chat.encrypted ?? true,
    queuePosition: chat.status === "WAITING" ? index + 1 : 0,
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
  if (user.role === "AGENT") return !chat.agentId || chat.agentId === user.id || chat.status === "TRANSFERRED";
  return false;
}

export default function chatSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || token.startsWith("demo-")) return next();
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, name: true, role: true } });
      if (user) socket.user = user;
      next();
    } catch {
      next(new Error("Socket authentication failed"));
    }
  });

  io.on("connection", (socket) => {
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
        io.emit("chat_queue_updated", shapeChat(updatedChat));

        let aiMessage = null;
        if (socket.user?.role === "CUSTOMER" && !payload.fileUrl) {
          const aiSettings = await prisma.aIConfig.findFirst({ orderBy: { createdAt: "desc" } });
          if (aiSettings?.isActive !== false) {
            const ai = await generateSupportReply(content, { language: chat?.language, regionalNotes: aiSettings?.regionalNotes, customerName: socket.user?.name, userId: senderId });
            const reply = ai.reply;
            const createdAiMessage = await prisma.message.create({
              data: {
                content: encryptMessageContent(reply),
                originalContent: reply,
                sourceLanguage: "AI",
                targetLanguage: chat?.language,
                encryptionVersion: encryptionVersion(),
                senderId,
                chatSessionId: payload.chatSessionId,
                isAI: true,
              },
              include: { sender: { select: { id: true, name: true, role: true } } },
            });
            await prisma.chatSession.update({ where: { id: payload.chatSessionId }, data: { lastMessage: reply, ...(ai.transferToAgent ? { status: "TRANSFERRED" } : {}) } });
            aiMessage = shapeMessage(createdAiMessage);
            io.to(payload.chatSessionId).emit("receive_message", aiMessage);
          }
        }

        socket.broadcast.emit("chat_notification", { chatSessionId: payload.chatSessionId, message: "New message" });
        callback?.({ success: true, data: { message: shapedMessage, aiMessage } });
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
