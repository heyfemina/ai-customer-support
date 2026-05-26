import { z } from "zod";
import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";

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
    success(res, await prisma.ticket.update({ where: { id: req.params.id }, data, include }), "Ticket updated");
  } catch (error) { next(error); }
}

export async function updateTicketStatus(req, res, next) {
  try {
    success(res, await prisma.ticket.update({ where: { id: req.params.id }, data: { status: req.body.status }, include }), "Ticket status updated");
  } catch (error) { next(error); }
}

export async function replyTicket(req, res, next) {
  try {
    const message = await prisma.message.create({
      data: {
        content: req.body.content || req.body.fileName || "Attachment",
        senderId: req.user.id,
        ticketId: req.params.id,
        fileUrl: req.body.fileUrl,
        messageType: req.body.messageType || (req.body.fileUrl ? "FILE" : "TEXT"),
      },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });
    success(res, message, "Reply added", 201);
  } catch (error) { next(error); }
}

export async function deleteTicket(req, res, next) {
  try {
    await prisma.ticket.delete({ where: { id: req.params.id } });
    success(res, null, "Ticket deleted");
  } catch (error) { next(error); }
}
