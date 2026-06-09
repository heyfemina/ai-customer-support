import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";

const queueStatuses = ["WAITING", "TRANSFERRED"];

function agentCategories(user) {
  return Array.isArray(user?.categories) && user.categories.length ? user.categories : ["General"];
}

function baseTicketWhere(user) {
  if (user.role === "CUSTOMER") return { customerId: user.id };
  if (user.role === "AGENT") return { OR: [{ agentId: user.id }, { agentId: null, category: { in: agentCategories(user) } }] };
  return {};
}

function baseChatWhere(user) {
  if (user.role === "CUSTOMER") return { customerId: user.id };
  if (user.role === "AGENT") return { OR: [{ agentId: user.id }, { agentId: null, status: { in: queueStatuses }, category: { in: agentCategories(user) } }] };
  return {};
}

function andWhere(base, filter) {
  return Object.keys(base).length ? { AND: [base, filter] } : filter;
}

export async function search(req, res, next) {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return success(res, []);
    const contains = { contains: q, mode: "insensitive" };
    const ticketFilter = {
      OR: [
        { id: contains },
        { subject: contains },
        { description: contains },
        { category: contains },
        { customer: { is: { name: contains } } },
        { customer: { is: { email: contains } } },
        { agent: { is: { name: contains } } },
        { agent: { is: { email: contains } } },
      ],
    };
    const chatFilter = {
      OR: [
        { id: contains },
        { channel: contains },
        { category: contains },
        { lastMessage: contains },
        { customer: { is: { name: contains } } },
        { customer: { is: { email: contains } } },
        { agent: { is: { name: contains } } },
        { agent: { is: { email: contains } } },
      ],
    };
    const [tickets, chats, users] = await Promise.all([
      prisma.ticket.findMany({
        where: andWhere(baseTicketWhere(req.user), ticketFilter),
        take: 6,
        orderBy: { updatedAt: "desc" },
        include: { customer: { select: { name: true, email: true } }, agent: { select: { name: true, email: true } } },
      }),
      prisma.chatSession.findMany({
        where: andWhere(baseChatWhere(req.user), chatFilter),
        take: 6,
        orderBy: { updatedAt: "desc" },
        include: { customer: { select: { name: true, email: true } }, agent: { select: { name: true, email: true } } },
      }),
      req.user.role === "ADMIN"
        ? prisma.user.findMany({
            where: {
              OR: [
                { name: contains },
                { email: contains },
                ...(q.toUpperCase().includes("AGENT") ? [{ role: "AGENT" }] : []),
                ...(q.toUpperCase().includes("CUSTOMER") ? [{ role: "CUSTOMER" }] : []),
              ],
            },
            take: 6,
            orderBy: { createdAt: "desc" },
            select: { id: true, name: true, email: true, role: true },
          })
        : Promise.resolve([]),
    ]);
    const ticketBase = req.user.role === "CUSTOMER" ? "/customer/tickets" : req.user.role === "AGENT" ? "/agent/tickets" : "/admin/tickets";
    const chatPath = req.user.role === "CUSTOMER" ? "/customer/live-chat" : req.user.role === "AGENT" ? "/agent/live-chats" : "/admin/chats";
    const results = [
      ...tickets.map((ticket) => ({
        id: ticket.id,
        type: "Ticket",
        title: ticket.subject,
        subtitle: `${ticket.customer?.name || "Customer"} / ${ticket.status}`,
        path: `${ticketBase}/${ticket.id}`,
      })),
      ...chats.map((chat) => ({
        id: chat.id,
        type: "Chat",
        title: chat.customer?.name || chat.channel || "Support chat",
        subtitle: `${chat.agent?.name || "Waiting for agent"} / ${chat.status}`,
        path: chatPath,
        state: { chatId: chat.id },
      })),
      ...users.map((user) => ({
        id: user.id,
        type: user.role === "AGENT" ? "Agent" : "Customer",
        title: user.name,
        subtitle: user.email,
        path: user.role === "AGENT" ? "/admin/agents" : "/admin/customers",
      })),
    ].slice(0, 10);
    success(res, results);
  } catch (error) { next(error); }
}
