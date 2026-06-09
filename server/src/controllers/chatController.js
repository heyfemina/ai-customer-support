import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";
import { translateText } from "../services/aiService.js";
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
const listInclude = {
  customer: { select: { id: true, name: true, email: true, role: true } },
  agent: { select: { id: true, name: true, email: true, role: true, department: true, categories: true, agentStatus: true } },
  messages: {
    take: 80,
    orderBy: { createdAt: "desc" },
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

function emitChatUpdate(req, chat) {
  const io = req.app.get("io");
  if (!io || !chat) return;
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

function emitChatNotification(req, chat, message) {
  const io = req.app.get("io");
  if (!io || !chat) return;
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

function emitDepartmentChatNotification(req, chat, message) {
  const io = req.app.get("io");
  if (!io || !chat) return;
  io.to(departmentRoom(chat.category)).emit("chat_notification", {
    chatSessionId: chat.id,
    message,
    chat: shapeChat(chat),
  });
}

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
  if (!user || !chat) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "CUSTOMER") return chat.customerId === user.id;
  if (user.role === "AGENT") {
    if (chat.agentId === user.id) return true;
    return !chat.agentId && queueStatuses.includes(chat.status) && agentMatchesCategory(user, chat.category);
  }
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
  const shapedMessages = (chat.messages || []).map(shapeMessage).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const systemMessages = !chat.agentId && ["WAITING", "TRANSFERRED"].includes(chat.status)
    ? [{ id: `system-${chat.id}`, senderId: "system", content: waitingNotice, createdAt: chat.createdAt }]
    : [];
  const lastMessage = chat.lastMessage || shapedMessages.at(-1)?.content || "";
  return {
    ...chat,
    messages: [...systemMessages, ...shapedMessages],
    customerName: chat.customer?.name,
    agentName: chat.agent?.name,
    lastMessage,
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

async function pickAgentForChat(category = "General") {
  const agents = await prisma.user.findMany({
    where: {
      role: "AGENT",
      isActive: true,
      agentStatus: { not: "OFFLINE" },
    },
    select: {
      id: true,
      role: true,
      department: true,
      categories: true,
      maxActiveChats: true,
      agentChats: { select: { status: true } },
    },
  });
  const activeStatuses = new Set(["ASSIGNED", "ACTIVE", "TRANSFERRED"]);
  const ranked = agents
    .map((agent) => ({
      id: agent.id,
      matchesCategory: agentMatchesCategory(agent, category),
      activeChats: agent.agentChats.filter((chat) => activeStatuses.has(chat.status)).length,
      maxActiveChats: agent.maxActiveChats || 3,
    }))
    .filter((agent) => agent.matchesCategory && agent.activeChats < agent.maxActiveChats)
    .sort((a, b) => a.activeChats - b.activeChats);
  return ranked[0]?.id || null;
}

async function translationData({ content, sourceLanguage, targetLanguage, userId }) {
  if (!content || !targetLanguage || sourceLanguage === targetLanguage) {
    return { originalContent: content, sourceLanguage, targetLanguage };
  }
  try {
    const translatedContent = await translateText(content, targetLanguage, { userId });
    return { originalContent: content, translatedContent, sourceLanguage, targetLanguage };
  } catch {
    return { originalContent: content, sourceLanguage, targetLanguage };
  }
}

export async function startChat(req, res, next) {
  try {
    const category = req.body.category || "General";
    const agentId = await pickAgentForChat(category);
    const chat = await prisma.chatSession.create({
      data: {
        customerId: req.user.id,
        agentId,
        status: agentId ? "ASSIGNED" : "WAITING",
        assignedAt: agentId ? new Date() : null,
        category,
        language: req.body.language || req.user.language,
        channel: req.body.channel || "Website chatbot",
        encrypted: true,
        lastMessage: agentId ? "New chat assigned to agent" : waitingNotice,
        ...visitorFromRequest(req),
      },
      include,
    });
    const shaped = shapeChat(chat);
    emitChatUpdate(req, chat);
    emitChatNotification(req, chat, agentId ? "New customer chat assigned" : "New customer chat waiting");
    if (agentId) emitDepartmentChatNotification(req, chat, "New customer chat assigned in your department");
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
        ticketId: ticket.id,
        customerId: ticket.customerId,
        agentId: req.user.role === "AGENT" ? req.user.id : ticket.agentId,
        status: ticket.agentId || req.user.role === "AGENT" ? "ASSIGNED" : "WAITING",
        assignedAt: ticket.agentId || req.user.role === "AGENT" ? new Date() : null,
        category: ticket.category || "General",
        language: ticket.customer.language || req.body.language || "en",
        channel: `Ticket live chat: ${ticket.id}`,
        encrypted: true,
        lastMessage: `Live chat opened for ticket: ${ticket.subject}`,
        visitorPage: `/tickets/${ticket.id}`,
        visitorDevice: req.headers["user-agent"] || "Browser",
      },
      include,
    });
    const context = `Customer wants to chat about ticket #${ticket.id.slice(0, 8)}: ${ticket.subject}. Issue: ${ticket.description.slice(0, 240)}`;
    const contextMessage = await prisma.message.create({
      data: {
        content: encryptMessageContent(context),
        originalContent: context,
        encryptionVersion: encryptionVersion(),
        senderId: req.user.id,
        chatSessionId: chat.id,
      },
      include: { sender: { select: { id: true, name: true, email: true, role: true } } },
    });

    const chatWithContext = { ...chat, messages: [...chat.messages, contextMessage], lastMessage: context };
    const shaped = shapeChat(chatWithContext);
    emitChatUpdate(req, chatWithContext);
    emitChatNotification(req, chatWithContext, "Ticket chat opened with context");
    if (chat.agentId) emitDepartmentChatNotification(req, chatWithContext, "Ticket chat opened in your department");
    success(res, shaped, "Ticket chat opened", 201);
  } catch (error) { next(error); }
}

export async function getChats(req, res, next) {
  try {
    const where = req.user.role === "CUSTOMER"
      ? { customerId: req.user.id }
      : req.user.role === "AGENT"
        ? {
            OR: [
              { agentId: req.user.id },
              { agentId: null, status: { in: queueStatuses } },
            ],
          }
        : {};
    const chats = await prisma.chatSession.findMany({ where, include: listInclude, orderBy: { updatedAt: "desc" } });
    success(res, chats.filter((chat) => canAccessChat(req.user, chat)).map(shapeChat));
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
    const updatedChat = await prisma.chatSession.findUnique({ where: { id: req.params.id }, include });
    emitChatUpdate(req, updatedChat);
    emitChatNotification(req, updatedChat, "New live chat message");

    success(res, { message: shapedMessage }, "Message sent", 201);
  } catch (error) { next(error); }
}

export async function transferChat(req, res, next) {
  try {
    const current = await prisma.chatSession.findUnique({ where: { id: req.params.id }, include });
    if (!canAccessChat(req.user, current)) return res.status(403).json({ success: false, message: "Access denied" });
    if (req.body.agentId && req.user.role !== "ADMIN") {
      const targetAgent = await prisma.user.findUnique({ where: { id: req.body.agentId }, select: { id: true, role: true, department: true, categories: true } });
      if (!agentMatchesCategory(targetAgent, current.category)) {
        return res.status(403).json({ success: false, message: "You cannot transfer chats outside this department." });
      }
    }
    const chat = await prisma.chatSession.update({
      where: { id: req.params.id },
      data: {
        agentId: req.body.agentId || null,
        status: "TRANSFERRED",
        transferReason: req.body.reason || "Manual transfer",
        ...(req.user.role === "ADMIN" && req.body.category ? { category: req.body.category } : {}),
      },
      include,
    });
    const event = await createChatEvent(req.params.id, "Chat transferred to another agent.", req.user.id);
    const shaped = shapeChat({ ...chat, messages: [...chat.messages, event] });
    req.app.get("io")?.to(req.params.id).emit("agent_transfer", shaped);
    emitChatUpdate(req, { ...chat, messages: [...chat.messages, event] });
    success(res, shaped, "Chat transferred");
  } catch (error) { next(error); }
}

export async function acceptChat(req, res, next) {
  try {
    const current = await prisma.chatSession.findUnique({ where: { id: req.params.id }, include });
    if (!canAccessChat(req.user, current)) return res.status(403).json({ success: false, message: "Access denied" });
    if (req.user.role !== "AGENT") return res.status(403).json({ success: false, message: "Only agents can accept chats" });
    if (current.agentId && current.agentId !== req.user.id) return res.status(409).json({ success: false, message: "Chat is already assigned" });
    if (!agentMatchesCategory(req.user, current.category)) {
      return res.status(403).json({ success: false, message: "You cannot accept chats outside your department." });
    }
    const chat = await prisma.chatSession.update({ where: { id: req.params.id }, data: { agentId: req.user.id, status: "ACTIVE", acceptedAt: new Date() }, include });
    const shaped = shapeChat(chat);
    emitChatNotification(req, chat, "Chat accepted by agent");
    emitChatUpdate(req, chat);
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
    emitChatNotification(req, chat, "Chat closed");
    emitChatUpdate(req, chat);
    success(res, shaped, "Chat closed");
  } catch (error) { next(error); }
}
