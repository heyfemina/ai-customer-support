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
  customer: { select: { id: true, name: true, email: true } },
  agent: { select: { id: true, name: true, email: true } },
  messages: { include: { sender: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } },
  attachments: true,
};

export async function createTicket(req, res, next) {
  try {
    const ticket = await prisma.ticket.create({
      data: {
        subject: req.body.subject,
        description: req.body.description,
        category: req.body.category,
        priority: req.body.priority,
        agentId: req.body.agentId || null,
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
    success(res, ticket, "Ticket created", 201);
  } catch (error) { next(error); }
}

export async function getTickets(req, res, next) {
  try {
    const { search, status, priority, agentId, customerId } = req.query;
    const where = req.user.role === "CUSTOMER" ? { customerId: req.user.id } : req.user.role === "AGENT" ? { agentId: req.user.id } : {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (agentId && req.user.role === "ADMIN") where.agentId = agentId;
    if (customerId && req.user.role === "ADMIN") where.customerId = customerId;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }
    success(res, await prisma.ticket.findMany({ where, include, orderBy: { createdAt: "desc" } }));
  } catch (error) { next(error); }
}

export async function getTicket(req, res, next) {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id }, include });
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    success(res, ticket);
  } catch (error) { next(error); }
}

export async function updateTicket(req, res, next) {
  try {
    const allowed = ["subject", "description", "status", "priority", "category", "agentId"];
    const data = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (["RESOLVED", "CLOSED"].includes(data.status)) {
      const current = await prisma.ticket.findUnique({ where: { id: req.params.id } });
      if (current && !current.resolvedAt) Object.assign(data, calculateResolution(current));
    }
    success(res, await prisma.ticket.update({ where: { id: req.params.id }, data, include }), "Ticket updated");
  } catch (error) { next(error); }
}

export async function updateTicketStatus(req, res, next) {
  try {
    const current = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    const data = { status: req.body.status };
    if (current && ["RESOLVED", "CLOSED"].includes(req.body.status) && !current.resolvedAt) Object.assign(data, calculateResolution(current));
    success(res, await prisma.ticket.update({ where: { id: req.params.id }, data, include }), "Ticket status updated");
  } catch (error) { next(error); }
}

export async function replyTicket(req, res, next) {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id }, include: { customer: true, agent: true } });
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
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
    success(res, message, "Reply added", 201);
  } catch (error) { next(error); }
}

export async function deleteTicket(req, res, next) {
  try {
    await prisma.ticket.delete({ where: { id: req.params.id } });
    success(res, null, "Ticket deleted");
  } catch (error) { next(error); }
}
