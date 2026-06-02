import { z } from "zod";
import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";
import { calculateFirstResponse, calculateResolution } from "../services/slaService.js";
import { translateText } from "../services/aiService.js";

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
  messages: { include: { sender: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: "asc" } },
  attachments: true,
};

async function pickAgentForTicket(category = "General") {
  const agents = await prisma.user.findMany({
    where: {
      role: "AGENT",
      isActive: true,
      agentStatus: { not: "OFFLINE" },
      OR: [
        { categories: { has: category } },
        { categories: { has: "General" } },
      ],
    },
    select: {
      id: true,
      maxActiveChats: true,
      assigned: { select: { status: true } },
    },
  });
  if (!agents.length) return null;
  const openStatuses = new Set(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"]);
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

function canAccessTicket(user, ticket) {
  if (!user || !ticket) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "CUSTOMER") return ticket.customerId === user.id;
  if (user.role === "AGENT") return ticket.agentId === user.id || !ticket.agentId;
  return false;
}

export async function createTicket(req, res, next) {
  try {
    const agentId = req.body.agentId || await pickAgentForTicket(req.body.category);
    const ticket = await prisma.ticket.create({
      data: {
        subject: req.body.subject,
        description: req.body.description,
        category: req.body.category,
        priority: req.body.priority,
        agentId,
        assignedAt: agentId ? new Date() : null,
        assignmentMode: agentId ? (req.body.agentId ? "MANUAL_ASSIGN" : "LEAST_BUSY_AGENT") : "UNASSIGNED",
        customerId: req.user.id,
        attachments: req.body.attachments?.length
          ? {
              create: req.body.attachments.map((file) => ({
                fileName: file.fileName,
                fileUrl: file.fileUrl,
                fileType: file.fileType,
              })),
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
    const { search, status, priority, agentId, customerId, dateFrom, dateTo } = req.query;
    const where = req.user.role === "CUSTOMER" ? { customerId: req.user.id } : req.user.role === "AGENT" ? { AND: [{ OR: [{ agentId: req.user.id }, { agentId: null }] }] } : {};
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
    success(res, await prisma.ticket.findMany({ where, include, orderBy: { createdAt: "desc" } }));
  } catch (error) { next(error); }
}

export async function getTicket(req, res, next) {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id }, include });
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (!canAccessTicket(req.user, ticket)) return res.status(403).json({ success: false, message: "Access denied" });
    success(res, ticket);
  } catch (error) { next(error); }
}

export async function updateTicket(req, res, next) {
  try {
    const current = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    const allowed = ["subject", "description", "status", "priority", "category", "agentId"];
    const data = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (data.agentId === "") data.agentId = null;
    if (Object.prototype.hasOwnProperty.call(data, "agentId") && data.agentId !== current?.agentId) {
      data.assignedAt = data.agentId ? new Date() : null;
      data.assignedById = req.user.id;
      data.assignmentMode = data.agentId ? "MANUAL_ASSIGN" : "UNASSIGNED";
    }
    if (["RESOLVED", "CLOSED"].includes(data.status)) {
      if (current && !current.resolvedAt) Object.assign(data, calculateResolution(current));
    }
    const ticket = await prisma.ticket.update({ where: { id: req.params.id }, data, include });
    await prisma.activityLog.create({ data: { userId: req.user.id, action: `Updated ticket ${ticket.subject}`, ipAddress: req.ip } });
    success(res, ticket, "Ticket updated");
  } catch (error) { next(error); }
}

export async function updateTicketStatus(req, res, next) {
  try {
    const current = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    const data = { status: req.body.status };
    if (current && ["RESOLVED", "CLOSED"].includes(req.body.status) && !current.resolvedAt) Object.assign(data, calculateResolution(current));
    const ticket = await prisma.ticket.update({ where: { id: req.params.id }, data, include });
    await prisma.activityLog.create({ data: { userId: req.user.id, action: `Changed ticket status to ${req.body.status}`, ipAddress: req.ip } });
    success(res, ticket, "Ticket status updated");
  } catch (error) { next(error); }
}

export async function replyTicket(req, res, next) {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id }, include: { customer: true, agent: true } });
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (!canAccessTicket(req.user, ticket)) return res.status(403).json({ success: false, message: "Access denied" });
    const content = req.body.content || req.body.fileName || "Attachment";
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
        fileUrl: req.body.fileUrl,
        messageType: req.body.messageType || (req.body.fileUrl ? "FILE" : "TEXT"),
      },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });
    if (["ADMIN", "AGENT"].includes(req.user.role) && !ticket.firstResponseAt) {
      await prisma.ticket.update({ where: { id: ticket.id }, data: calculateFirstResponse(ticket) });
    }
    await prisma.activityLog.create({ data: { userId: req.user.id, action: `Replied to ticket ${ticket.subject}`, ipAddress: req.ip } });
    success(res, message, "Reply added", 201);
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
