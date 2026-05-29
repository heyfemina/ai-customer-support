import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";
import { generateSupportReply, translateText } from "../services/aiService.js";
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

function visitorFromRequest(req) {
  return {
    visitorIp: req.ip,
    visitorPage: req.body.visitorPage || req.headers.referer || "/support",
    visitorDevice: req.body.visitorDevice || req.headers["user-agent"] || "Browser",
    visitorVisits: Number(req.body.visitorVisits) || 1,
    visitorId: req.body.visitorId,
    visitorDomain: req.body.visitorDomain,
    visitorReferrer: req.body.visitorReferrer || req.headers.referer,
    widgetId: req.body.widgetId,
  };
}

function canAccessChat(user, chat) {
  if (!chat) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "CUSTOMER") return chat.customerId === user.id;
  if (user.role === "AGENT") return !chat.agentId || chat.agentId === user.id || chat.status === "TRANSFERRED";
  return false;
}

function shapeMessage(message) {
  if (!message) return message;
  return {
    ...message,
    content: decryptMessageContent(message.content),
    originalContent: message.originalContent || decryptMessageContent(message.content),
    encrypted: message.content?.startsWith("enc:v1:") || false,
  };
}

function shapeChat(chat, index = 0) {
  if (!chat) return chat;
  const shapedMessages = (chat.messages || []).map(shapeMessage);
  const lastMessage = chat.lastMessage || shapedMessages.at(-1)?.content || "";
  return {
    ...chat,
    messages: shapedMessages,
    customerName: chat.customer?.name,
    agentName: chat.agent?.name,
    lastMessage,
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

async function createChatEvent(chatId, content, senderId) {
  return prisma.message.create({
    data: {
      content: encryptMessageContent(content),
      senderId,
      chatSessionId: chatId,
      isAI: false,
    },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });
}

async function maybeCreateAiReply({ req, chat, customerMessage }) {
  if (req.user.role !== "CUSTOMER" || req.body.fileUrl) return null;
  const aiSettings = await prisma.aIConfig.findFirst({ orderBy: { createdAt: "desc" } });
  if (aiSettings?.isActive === false) return null;
  const ai = await generateSupportReply(customerMessage.content, { language: chat.language, regionalNotes: aiSettings?.regionalNotes, customerName: req.user.name, userId: req.user.id });
  const reply = ai.reply;
  const update = { lastMessage: reply };
  if (ai.transferToAgent) update.status = "TRANSFERRED";
  const aiMessage = await prisma.message.create({
    data: {
      content: encryptMessageContent(reply),
      originalContent: reply,
      sourceLanguage: "AI",
      targetLanguage: chat.language || req.user.language,
      encryptionVersion: encryptionVersion(),
      senderId: req.user.id,
      chatSessionId: chat.id,
      isAI: true,
    },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });
  await prisma.chatSession.update({ where: { id: chat.id }, data: update });
  return shapeMessage(aiMessage);
}

async function translationData({ content, sourceLanguage, targetLanguage, userId }) {
  if (!content || !targetLanguage || sourceLanguage === targetLanguage) {
    return { originalContent: content, sourceLanguage, targetLanguage };
  }
  const translatedContent = await translateText(content, targetLanguage, { userId });
  return { originalContent: content, translatedContent, sourceLanguage, targetLanguage };
}

export async function startChat(req, res, next) {
  try {
    const chat = await prisma.chatSession.create({
      data: {
        customerId: req.user.id,
        language: req.body.language || req.user.language,
        channel: req.body.channel || "Website chatbot",
        encrypted: true,
        lastMessage: "New chat started",
        ...visitorFromRequest(req),
      },
      include,
    });
    const shaped = shapeChat(chat);
    req.app.get("io")?.emit("chat_queue_updated", shaped);
    req.app.get("io")?.emit("chat_notification", { chatSessionId: chat.id, message: "New customer chat waiting", chat: shaped });
    success(res, shaped, "Chat started", 201);
  } catch (error) { next(error); }
}

export async function startTicketChat(req, res, next) {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.ticketId }, include: { customer: true, agent: true } });
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    const allowed =
      req.user.role === "ADMIN" ||
      ticket.customerId === req.user.id ||
      ticket.agentId === req.user.id;
    if (!allowed) return res.status(403).json({ success: false, message: "Access denied" });

    const chat = await prisma.chatSession.create({
      data: {
        customerId: ticket.customerId,
        agentId: req.user.role === "AGENT" ? req.user.id : ticket.agentId,
        language: ticket.customer.language || req.body.language || "en",
        channel: `Ticket live chat: ${ticket.id}`,
        encrypted: true,
        lastMessage: `Live chat opened for ticket: ${ticket.subject}`,
        visitorPage: `/tickets/${ticket.id}`,
        visitorDevice: req.headers["user-agent"] || "Browser",
      },
      include,
    });

    const shaped = shapeChat(chat);
    req.app.get("io")?.emit("chat_queue_updated", shaped);
    req.app.get("io")?.emit("chat_notification", { chatSessionId: chat.id, message: "Ticket chat opened", chat: shaped });
    success(res, shaped, "Ticket chat opened", 201);
  } catch (error) { next(error); }
}

export async function getChats(req, res, next) {
  try {
    const where = req.user.role === "CUSTOMER" ? { customerId: req.user.id } : req.user.role === "AGENT" ? { OR: [{ agentId: req.user.id }, { agentId: null }, { status: "TRANSFERRED" }] } : {};
    const chats = await prisma.chatSession.findMany({ where, include, orderBy: { updatedAt: "desc" } });
    success(res, chats.map(shapeChat));
  } catch (error) { next(error); }
}

export async function getChat(req, res, next) {
  try {
    const chat = await prisma.chatSession.findUnique({ where: { id: req.params.id }, include });
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });
    if (!canAccessChat(req.user, chat)) return res.status(403).json({ success: false, message: "Access denied" });
    success(res, shapeChat(chat));
  } catch (error) { next(error); }
}

export async function sendChatMessage(req, res, next) {
  try {
    const chat = await prisma.chatSession.findUnique({ where: { id: req.params.id }, include });
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });
    if (!canAccessChat(req.user, chat)) return res.status(403).json({ success: false, message: "Access denied" });

    const content = req.body.content || req.body.fileName || "Attachment";
    const languageData = await translationData({
      content,
      sourceLanguage: req.body.sourceLanguage || req.user.language || chat.language,
      targetLanguage: req.body.targetLanguage || (req.user.role === "CUSTOMER" ? "English" : chat.language),
      userId: req.user.id,
    });
    const message = await prisma.message.create({
      data: {
        content: encryptMessageContent(content),
        ...languageData,
        encryptionVersion: encryptionVersion(),
        senderId: req.user.id,
        chatSessionId: req.params.id,
        fileUrl: req.body.fileUrl,
        messageType: req.body.messageType || (req.body.fileType?.startsWith("image/") ? "IMAGE" : req.body.fileUrl ? "FILE" : "TEXT"),
      },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });
    await prisma.chatSession.update({ where: { id: req.params.id }, data: { status: "ACTIVE", lastMessage: content } });
    const shapedMessage = shapeMessage(message);
    req.app.get("io")?.to(req.params.id).emit("receive_message", shapedMessage);
    const aiMessage = await maybeCreateAiReply({ req, chat, customerMessage: shapedMessage });
    if (aiMessage) req.app.get("io")?.to(req.params.id).emit("receive_message", aiMessage);
    const updatedChat = await prisma.chatSession.findUnique({ where: { id: req.params.id }, include });
    req.app.get("io")?.emit("chat_queue_updated", shapeChat(updatedChat));
    req.app.get("io")?.emit("chat_notification", { chatSessionId: req.params.id, message: "New live chat message" });

    success(res, { message: shapedMessage, aiMessage }, "Message sent", 201);
  } catch (error) { next(error); }
}

export async function transferChat(req, res, next) {
  try {
    const current = await prisma.chatSession.findUnique({ where: { id: req.params.id }, include });
    if (!canAccessChat(req.user, current)) return res.status(403).json({ success: false, message: "Access denied" });
    const chat = await prisma.chatSession.update({ where: { id: req.params.id }, data: { agentId: req.body.agentId || null, status: "TRANSFERRED" }, include });
    const event = await createChatEvent(req.params.id, "Chat transferred to another agent.", req.user.id);
    const shaped = shapeChat({ ...chat, messages: [...chat.messages, event] });
    req.app.get("io")?.to(req.params.id).emit("agent_transfer", shaped);
    req.app.get("io")?.emit("chat_queue_updated", shaped);
    success(res, shaped, "Chat transferred");
  } catch (error) { next(error); }
}

export async function acceptChat(req, res, next) {
  try {
    const current = await prisma.chatSession.findUnique({ where: { id: req.params.id }, include });
    if (!canAccessChat(req.user, current)) return res.status(403).json({ success: false, message: "Access denied" });
    const chat = await prisma.chatSession.update({ where: { id: req.params.id }, data: { agentId: req.user.id, status: "ACTIVE" }, include });
    const shaped = shapeChat(chat);
    req.app.get("io")?.to(req.params.id).emit("chat_notification", { chatSessionId: req.params.id, message: "Chat accepted by agent", chat: shaped });
    req.app.get("io")?.emit("chat_queue_updated", shaped);
    success(res, shaped, "Chat accepted");
  } catch (error) { next(error); }
}

export async function rateChat(req, res, next) {
  try {
    const current = await prisma.chatSession.findUnique({ where: { id: req.params.id }, include });
    if (!current || current.customerId !== req.user.id) return res.status(403).json({ success: false, message: "Only the customer can rate this chat" });
    const chat = await prisma.chatSession.update({ where: { id: req.params.id }, data: { rating: Number(req.body.rating), feedback: req.body.feedback || "" }, include });
    success(res, shapeChat(chat), "Chat rated");
  } catch (error) { next(error); }
}

export async function closeChat(req, res, next) {
  try {
    const current = await prisma.chatSession.findUnique({ where: { id: req.params.id }, include });
    if (!canAccessChat(req.user, current)) return res.status(403).json({ success: false, message: "Access denied" });
    const chat = await prisma.chatSession.update({ where: { id: req.params.id }, data: { status: "CLOSED" }, include });
    const shaped = shapeChat(chat);
    req.app.get("io")?.to(req.params.id).emit("chat_notification", { chatSessionId: req.params.id, message: "Chat closed", chat: shaped });
    req.app.get("io")?.emit("chat_queue_updated", shaped);
    success(res, shaped, "Chat closed");
  } catch (error) { next(error); }
}
