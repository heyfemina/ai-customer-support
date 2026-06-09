import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";
import { calculateFirstResponse, calculateResolution } from "../services/slaService.js";
import { translateText } from "../services/aiService.js";
import { publicUploadFile } from "../services/fileService.js";

export const ticketSchema = z.object({
  body: z.object({
    subject: z.string().min(3),
    description: z.string().min(5),
    category: z.string().min(2),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
    agentId: z.string().optional(),
  }),
});

const include = {
  customer: { select: { id: true, name: true, email: true, role: true, language: true } },
  agent: { select: { id: true, name: true, email: true, role: true, language: true, department: true, categories: true } },
  messages: { include: { sender: { select: { id: true, name: true, email: true, role: true } }, attachments: true }, orderBy: { createdAt: "asc" } },
  attachments: true,
};
const listInclude = {
  customer: { select: { id: true, name: true, email: true, role: true, language: true } },
  agent: { select: { id: true, name: true, email: true, role: true, language: true, department: true, categories: true } },
  attachments: { select: { id: true } },
};
const autoCloseHours = 48;
const resolutionNotice = "The support agent has provided a solution. If the issue is still not solved, please reply within 48 hours. If no reply is received, the ticket will be closed automatically.";
const negativeResolutionPatterns = [
  /\bnot\s+(solved|resolved|fixed|working)\b/i,
  /\bstill\s+(not\s+)?(working|broken|failing|failed|getting\s+error|error|an?\s+issue|a\s+problem)\b/i,
  /\bsame\s+(issue|problem|error)\b/i,
  /\berror\s+again\b/i,
  /\bissue\s+(is\s+)?(still\s+)?(there|not fixed|not solved|not resolved)\b/i,
];

function attachmentCreateData(file, userId, extra = {}) {
  const item = publicUploadFile(file);
  return {
    fileName: item.fileName,
    originalName: item.originalName,
    fileUrl: item.fileUrl,
    fileType: item.fileType,
    mimeType: item.mimeType,
    fileSize: item.fileSize,
    uploadedById: userId,
    ...extra,
  };
}

function attachmentInputData(file, userId, extra = {}) {
  return {
    fileName: file.fileName,
    originalName: file.originalName || file.fileName,
    fileUrl: file.fileUrl,
    fileType: file.fileType,
    mimeType: file.mimeType || file.fileType,
    fileSize: file.fileSize,
    uploadedById: userId,
    ...extra,
  };
}

async function pickAgentForTicket(category = "General") {
  const agents = await prisma.user.findMany({
    where: {
      role: "AGENT",
      isActive: true,
      agentStatus: { not: "OFFLINE" },
      categories: { has: category },
    },
    select: {
      id: true,
      maxActiveChats: true,
      assigned: { select: { status: true } },
    },
  });
  if (!agents.length) return null;
  const openStatuses = new Set(["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER", "CUSTOMER_RESPONDED_AFTER_RESOLUTION", "REOPENED"]);
  const ranked = agents
    .map((agent) => ({
      id: agent.id,
      openWorkload: agent.assigned.filter((ticket) => openStatuses.has(ticket.status)).length,
      totalWorkload: agent.assigned.length,
      maxActiveChats: agent.maxActiveChats || 3,
    }))
    .filter((agent) => agent.openWorkload < agent.maxActiveChats)
    .sort((a, b) => a.openWorkload - b.openWorkload || a.totalWorkload - b.totalWorkload);
  return ranked[0]?.id || null;
}

function agentCategories(user) {
  return Array.isArray(user?.categories) && user.categories.length ? user.categories : ["General"];
}

function canAccessTicket(user, ticket) {
  if (!user || !ticket) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "CUSTOMER") return ticket.customerId === user.id;
  if (user.role === "AGENT") return ticket.agentId === user.id || (!ticket.agentId && agentCategories(user).includes(ticket.category));
  return false;
}

function canWorkTicket(user, ticket) {
  if (!user || !ticket) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "AGENT") return ticket.agentId === user.id;
  if (user.role === "CUSTOMER") return ticket.customerId === user.id;
  return false;
}

async function autoCloseDueTickets() {
  await prisma.ticket.updateMany({
    where: { status: "RESOLUTION_PROPOSED", autoCloseAt: { lte: new Date() } },
    data: { status: "AUTO_CLOSED", closedAt: new Date(), closeReason: "No customer reply within 48 hours after solution was provided" },
  });
}

function customerSaysResolutionFailed(content) {
  return negativeResolutionPatterns.some((pattern) => pattern.test(String(content || "")));
}

function proposedResolutionData(current, now = new Date()) {
  return {
    status: "RESOLUTION_PROPOSED",
    resolutionProposedAt: now,
    autoCloseAt: new Date(now.getTime() + autoCloseHours * 60 * 60 * 1000),
    closedAt: null,
    closeReason: null,
    ...(!current?.resolvedAt ? calculateResolution(current) : {}),
  };
}

function emitTicketNotification(req, ticket, message) {
  const io = req.app.get("io");
  if (!io || !ticket?.agentId) return;
  io.to(`agent:${ticket.agentId}`).emit("chat_notification", { ticketId: ticket.id, message, ticket });
}

async function resolutionMetadataByTicketId(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return new Map();
  try {
    const rows = await prisma.$queryRaw`
      SELECT id, "customerRespondedAfterResolutionAt"
      FROM "Ticket"
      WHERE id IN (${Prisma.join(uniqueIds)})
    `;
    return new Map(rows.map((row) => [row.id, row]));
  } catch {
    return new Map();
  }
}

async function attachResolutionMetadata(tickets) {
  if (Array.isArray(tickets)) {
    const metadata = await resolutionMetadataByTicketId(tickets.map((ticket) => ticket.id));
    return tickets.map((ticket) => ({ ...ticket, ...(metadata.get(ticket.id) || {}) }));
  }
  if (!tickets?.id) return tickets;
  const metadata = await resolutionMetadataByTicketId([tickets.id]);
  return { ...tickets, ...(metadata.get(tickets.id) || {}) };
}

async function markCustomerRespondedAfterResolution(ticketId, value = new Date()) {
  await prisma.$executeRaw`
    UPDATE "Ticket"
    SET "customerRespondedAfterResolutionAt" = ${value}
    WHERE id = ${ticketId}
  `;
}

export async function createTicket(req, res, next) {
  try {
    if (req.user.role !== "CUSTOMER") return res.status(403).json({ success: false, message: "Only customers can create tickets" });
    const uploadedAttachments = (req.files || []).map((file) => attachmentCreateData(file, req.user.id));
    const providedAttachments = Array.isArray(req.body.attachments)
      ? req.body.attachments.filter((file) => file?.fileUrl).map((file) => attachmentInputData(file, req.user.id))
      : [];
    const attachments = [...uploadedAttachments, ...providedAttachments];
    const agentId = req.body.agentId || null;
    const ticket = await prisma.ticket.create({
      data: {
        subject: req.body.subject,
        description: req.body.description,
        category: req.body.category,
        priority: req.body.priority,
        agentId,
        assignedAt: agentId ? new Date() : null,
        assignmentMode: agentId ? "MANUAL_ASSIGN" : "UNASSIGNED",
        customerId: req.user.id,
        status: agentId ? "ASSIGNED" : "OPEN",
        attachments: attachments.length
          ? {
              create: attachments,
            }
          : undefined,
      },
      include,
    });
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: `Created ticket${ticket.agent?.name ? ` assigned to ${ticket.agent.name}` : " without agent assignment"}`,
        ipAddress: req.ip,
      },
    });
    success(res, ticket, "Ticket created", 201);
  } catch (error) { next(error); }
}

export async function getTickets(req, res, next) {
  try {
    await autoCloseDueTickets();
    const { search, status, priority, agentId, customerId, dateFrom, dateTo, page, limit } = req.query;
    const where = req.user.role === "CUSTOMER"
      ? { customerId: req.user.id }
      : req.user.role === "AGENT"
        ? { AND: [{ OR: [{ agentId: req.user.id }, { AND: [{ agentId: null }, { category: { in: agentCategories(req.user) } }] }] }] }
        : {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (agentId && req.user.role === "ADMIN") where.agentId = agentId;
    if (customerId && req.user.role === "ADMIN") where.customerId = customerId;
    if ((dateFrom || dateTo) && req.user.role === "ADMIN") {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
      };
    }
    if (search) {
      const searchFilter = {
        OR: [
        { id: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { customer: { is: { name: { contains: search, mode: "insensitive" } } } },
        { customer: { is: { email: { contains: search, mode: "insensitive" } } } },
        { agent: { is: { name: { contains: search, mode: "insensitive" } } } },
        { agent: { is: { email: { contains: search, mode: "insensitive" } } } },
        ],
      };
      if (where.AND) where.AND.push(searchFilter);
      else Object.assign(where, searchFilter);
    }
    const wantsPagination = page !== undefined || limit !== undefined;
    if (wantsPagination) {
      const currentPage = Math.max(Number.parseInt(page, 10) || 1, 1);
      const perPage = Math.min(Math.max(Number.parseInt(limit, 10) || 15, 5), 100);
      const [tickets, total] = await Promise.all([
        prisma.ticket.findMany({ where, include: listInclude, orderBy: { createdAt: "desc" }, skip: (currentPage - 1) * perPage, take: perPage }),
        prisma.ticket.count({ where }),
      ]);
      success(res, {
        items: await attachResolutionMetadata(tickets),
        pagination: {
          page: currentPage,
          limit: perPage,
          total,
          totalPages: Math.max(Math.ceil(total / perPage), 1),
        },
      });
      return;
    }
    success(res, await attachResolutionMetadata(await prisma.ticket.findMany({ where, include: listInclude, orderBy: { createdAt: "desc" } })));
  } catch (error) { next(error); }
}

export async function getTicket(req, res, next) {
  try {
    await autoCloseDueTickets();
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id }, include });
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (!canAccessTicket(req.user, ticket)) return res.status(403).json({ success: false, message: "Access denied" });
    success(res, await attachResolutionMetadata(ticket));
  } catch (error) { next(error); }
}

export async function updateTicket(req, res, next) {
  try {
    const current = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!canWorkTicket(req.user, current)) return res.status(403).json({ success: false, message: "Only the assigned agent or admin can update this ticket" });
    const allowed = ["subject", "description", "status", "priority", "category", "agentId"];
    const data = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const agentCanCloseAfterReview = req.user.role === "AGENT" && data.status === "CLOSED" && current?.status === "CUSTOMER_RESPONDED_AFTER_RESOLUTION";
    if (req.user.role === "AGENT" && ["RESOLVED", "CLOSED"].includes(data.status) && !agentCanCloseAfterReview) {
      return res.status(403).json({ success: false, message: "Agents must propose resolution instead of closing tickets directly" });
    }
    if (data.agentId === "") data.agentId = null;
    if (Object.prototype.hasOwnProperty.call(data, "agentId") && data.agentId !== current?.agentId) {
      data.assignedAt = data.agentId ? new Date() : null;
      data.assignedById = req.user.id;
      data.assignmentMode = data.agentId ? "MANUAL_ASSIGN" : "UNASSIGNED";
      if (data.agentId && current?.status === "OPEN" && !Object.prototype.hasOwnProperty.call(data, "status")) data.status = "ASSIGNED";
    }
    if (["RESOLVED", "CLOSED"].includes(data.status)) {
      if (current && !current.resolvedAt) Object.assign(data, calculateResolution(current));
      data.closedAt = new Date();
      data.closedById = req.user.id;
      data.autoCloseAt = null;
      data.closeReason = req.body.closeReason || (agentCanCloseAfterReview ? "Closed by agent after reviewing customer reply" : "Ticket closed manually");
    }
    const shouldCreateResolutionNotice = data.status === "RESOLUTION_PROPOSED" && current?.status !== "RESOLUTION_PROPOSED";
    if (shouldCreateResolutionNotice) Object.assign(data, proposedResolutionData(current));
    const ticket = await prisma.ticket.update({ where: { id: req.params.id }, data, include });
    if (shouldCreateResolutionNotice) {
      await markCustomerRespondedAfterResolution(ticket.id, null);
      await prisma.message.create({
        data: { content: resolutionNotice, originalContent: resolutionNotice, senderId: req.user.id, ticketId: req.params.id, isAI: true },
      });
    }
    await prisma.activityLog.create({ data: { userId: req.user.id, action: `Updated ticket ${ticket.subject}`, ipAddress: req.ip } });
    success(res, ticket, "Ticket updated");
  } catch (error) { next(error); }
}

export async function updateTicketStatus(req, res, next) {
  try {
    const current = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!canWorkTicket(req.user, current)) return res.status(403).json({ success: false, message: "Only the assigned agent or admin can update this ticket" });
    const agentCanCloseAfterReview = req.user.role === "AGENT" && req.body.status === "CLOSED" && current?.status === "CUSTOMER_RESPONDED_AFTER_RESOLUTION";
    if (req.user.role === "AGENT" && ["RESOLVED", "CLOSED"].includes(req.body.status) && !agentCanCloseAfterReview) {
      return res.status(403).json({ success: false, message: "Agents must propose resolution instead of closing tickets directly" });
    }
    const data = { status: req.body.status };
    if (current && ["RESOLVED", "CLOSED"].includes(req.body.status)) {
      if (!current.resolvedAt) Object.assign(data, calculateResolution(current));
      Object.assign(data, {
        closedAt: new Date(),
        closedById: req.user.id,
        autoCloseAt: null,
        closeReason: req.body.closeReason || (agentCanCloseAfterReview ? "Closed by agent after reviewing customer reply" : "Ticket closed manually"),
      });
    }
    if (["IN_PROGRESS", "REOPENED"].includes(req.body.status)) {
      Object.assign(data, { autoCloseAt: null, closedAt: null, closeReason: req.body.status === "REOPENED" ? "Support continued after customer reply" : null });
    }
    const shouldCreateResolutionNotice = req.body.status === "RESOLUTION_PROPOSED" && current?.status !== "RESOLUTION_PROPOSED";
    if (shouldCreateResolutionNotice) Object.assign(data, proposedResolutionData(current));
    const ticket = await prisma.ticket.update({ where: { id: req.params.id }, data, include });
    if (shouldCreateResolutionNotice) {
      await markCustomerRespondedAfterResolution(ticket.id, null);
      await prisma.message.create({
        data: { content: resolutionNotice, originalContent: resolutionNotice, senderId: req.user.id, ticketId: req.params.id, isAI: true },
      });
    }
    await prisma.activityLog.create({ data: { userId: req.user.id, action: `Changed ticket status to ${req.body.status}`, ipAddress: req.ip } });
    success(res, ticket, "Ticket status updated");
  } catch (error) { next(error); }
}

export async function replyTicket(req, res, next) {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id }, include: { customer: true, agent: true } });
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (!canAccessTicket(req.user, ticket)) return res.status(403).json({ success: false, message: "Access denied" });
    if (req.user.role === "AGENT" && ticket.agentId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Only the assigned agent can reply to this ticket" });
    }
    const firstFile = req.file || req.files?.[0];
    const content = req.body.content || firstFile?.originalname || req.body.fileName || "Attachment";
    const sourceLanguage = req.body.sourceLanguage || req.user.language || "en";
    const targetLanguage = req.body.targetLanguage || (req.user.role === "CUSTOMER" ? ticket.agent?.language || "English" : ticket.customer?.language || "English");
    const translatedContent = sourceLanguage !== targetLanguage ? await translateText(content, targetLanguage, { userId: req.user.id }) : null;
    const message = await prisma.message.create({
      data: {
        content,
        originalContent: content,
        translatedContent,
        sourceLanguage,
        targetLanguage,
        senderId: req.user.id,
        ticketId: req.params.id,
        fileUrl: firstFile ? publicUploadFile(firstFile).fileUrl : req.body.fileUrl,
        messageType: req.body.messageType || (firstFile ? publicUploadFile(firstFile).messageType : req.body.fileUrl ? "FILE" : "TEXT"),
      },
      include: { sender: { select: { id: true, name: true, role: true } }, attachments: true },
    });
    const attachmentItems = [
      ...(req.files || (req.file ? [req.file] : [])).map((file) => attachmentCreateData(file, req.user.id, { ticketId: req.params.id, messageId: message.id })),
      ...(req.body.fileUrl ? [attachmentInputData(req.body, req.user.id, { ticketId: req.params.id, messageId: message.id })] : []),
    ];
    const attachments = attachmentItems.length ? await prisma.attachment.createManyAndReturn({ data: attachmentItems }) : [];
    if (["ADMIN", "AGENT"].includes(req.user.role) && !ticket.firstResponseAt) {
      await prisma.ticket.update({ where: { id: ticket.id }, data: calculateFirstResponse(ticket) });
    }
    if (req.user.role === "CUSTOMER" && ticket.status === "RESOLUTION_PROPOSED") {
      const failedResolution = customerSaysResolutionFailed(content);
      const nextStatus = failedResolution ? "REOPENED" : "CUSTOMER_RESPONDED_AFTER_RESOLUTION";
      const closeReason = failedResolution ? "Customer reported the proposed solution did not resolve the issue" : "Customer replied after proposed resolution; awaiting agent review";
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: nextStatus,
          reopenedAt: failedResolution ? new Date() : null,
          autoCloseAt: null,
          closeReason,
        },
      });
      await markCustomerRespondedAfterResolution(ticket.id);
      if (ticket.agentId) {
        await prisma.notification.create({
          data: {
            userId: ticket.agentId,
            title: "Customer replied after solution",
            message: `Customer replied after the proposed solution for ticket "${ticket.subject}". Please review and decide whether to reopen or close.`,
          },
        });
        emitTicketNotification(req, { ...ticket, status: nextStatus }, "Customer replied after solution. Please review and decide whether to reopen or close.");
      }
    }
    await prisma.activityLog.create({ data: { userId: req.user.id, action: `Replied to ticket ${ticket.subject}`, ipAddress: req.ip } });
    success(res, { ...message, attachments }, "Reply added", 201);
  } catch (error) { next(error); }
}

export async function claimTicket(req, res, next) {
  try {
    const current = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (req.user.role !== "AGENT") return res.status(403).json({ success: false, message: "Only agents can claim tickets" });
    if (current.agentId) return res.status(409).json({ success: false, message: "Ticket is already assigned" });
    if (!agentCategories(req.user).includes(current.category)) return res.status(403).json({ success: false, message: "You cannot claim tickets outside your department" });
    const claimed = await prisma.ticket.updateMany({
      where: { id: req.params.id, agentId: null },
      data: { agentId: req.user.id, assignedAt: new Date(), assignedById: req.user.id, assignmentMode: "AGENT_CLAIM", status: "IN_PROGRESS" },
    });
    if (!claimed.count) return res.status(409).json({ success: false, message: "Ticket was claimed by another agent" });
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id }, include });
    success(res, ticket, "Ticket claimed");
  } catch (error) { next(error); }
}

export async function proposeResolution(req, res, next) {
  try {
    const current = await prisma.ticket.findUnique({ where: { id: req.params.id }, include });
    if (!current) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (req.user.role !== "ADMIN" && current.agentId !== req.user.id) return res.status(403).json({ success: false, message: "Only the assigned agent or admin can propose resolution" });
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: proposedResolutionData(current),
      include,
    });
    await markCustomerRespondedAfterResolution(ticket.id, null);
    await prisma.message.create({
      data: { content: resolutionNotice, originalContent: resolutionNotice, senderId: req.user.id, ticketId: req.params.id, isAI: true },
    });
    success(res, ticket, "Resolution proposed");
  } catch (error) { next(error); }
}

export async function reopenTicket(req, res, next) {
  try {
    const current = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (req.user.role !== "ADMIN" && current.customerId !== req.user.id) return res.status(403).json({ success: false, message: "Only the customer or admin can reopen this ticket" });
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: "REOPENED", reopenedAt: new Date(), autoCloseAt: null, closedAt: null, closeReason: "Ticket reopened" },
      include,
    });
    success(res, ticket, "Ticket reopened");
  } catch (error) { next(error); }
}

export async function submitTicketFeedback(req, res, next) {
  try {
    const current = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (req.user.role !== "CUSTOMER" || current.customerId !== req.user.id) return res.status(403).json({ success: false, message: "Only the ticket customer can submit feedback" });
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { feedbackRating: rating, feedbackText: req.body.feedbackText || "", feedbackAt: new Date() },
      include,
    });
    await prisma.activityLog.create({ data: { userId: req.user.id, action: `Submitted ticket feedback (${rating}/5)`, ipAddress: req.ip } });
    success(res, ticket, "Feedback submitted");
  } catch (error) { next(error); }
}

export async function submitTicketComplaint(req, res, next) {
  try {
    const current = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (req.user.role !== "CUSTOMER" || current.customerId !== req.user.id) return res.status(403).json({ success: false, message: "Only the ticket customer can submit a complaint" });
    const complaintText = req.body.complaintText?.trim();
    if (!complaintText) return res.status(400).json({ success: false, message: "Complaint details are required" });
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        complaintSubject: req.body.complaintSubject?.trim() || "Ticket complaint",
        complaintText,
        complaintStatus: "OPEN",
        complaintAt: new Date(),
        complaintAdminReply: null,
        complaintRepliedAt: null,
      },
      include,
    });
    await prisma.activityLog.create({ data: { userId: req.user.id, action: `Raised complaint for ticket ${ticket.subject}`, ipAddress: req.ip } });
    success(res, ticket, "Complaint submitted");
  } catch (error) { next(error); }
}

export async function replyTicketComplaint(req, res, next) {
  try {
    if (req.user.role !== "ADMIN") return res.status(403).json({ success: false, message: "Only admins can reply to complaints" });
    const reply = req.body.reply?.trim();
    if (!reply) return res.status(400).json({ success: false, message: "Admin reply is required" });
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        complaintAdminReply: reply,
        complaintActionTaken: req.body.actionTaken?.trim() || null,
        complaintStatus: req.body.status || "UNDER_REVIEW",
        complaintRepliedAt: new Date(),
        complaintResolvedAt: ["RESOLVED", "REJECTED", "ACTION_TAKEN"].includes(req.body.status) ? new Date() : null,
      },
      include,
    });
    await prisma.activityLog.create({ data: { userId: req.user.id, action: `Replied to complaint for ticket ${ticket.subject}`, ipAddress: req.ip } });
    success(res, ticket, "Complaint reply saved");
  } catch (error) { next(error); }
}

export async function deleteTicket(req, res, next) {
  try {
    await prisma.ticket.delete({ where: { id: req.params.id } });
    success(res, null, "Ticket deleted");
  } catch (error) { next(error); }
}
