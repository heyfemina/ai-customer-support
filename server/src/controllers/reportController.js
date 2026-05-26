import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";

function monthKey(date) {
  return new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(date));
}

export async function dashboardReport(req, res, next) {
  try {
    const [tickets, open, resolved, chats, agents, customers, allTickets, ratedChats, recentTickets] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: "OPEN" } }),
      prisma.ticket.count({ where: { status: "RESOLVED" } }),
      prisma.chatSession.count({ where: { status: { in: ["ACTIVE", "WAITING", "TRANSFERRED"] } } }),
      prisma.user.count({ where: { role: "AGENT" } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.ticket.findMany({ select: { status: true, createdAt: true } }),
      prisma.chatSession.findMany({ where: { rating: { not: null } }, select: { rating: true } }),
      prisma.ticket.findMany({
        take: 6,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          agent: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const monthlyMap = new Map();
    for (const ticket of allTickets) {
      const month = monthKey(ticket.createdAt);
      const current = monthlyMap.get(month) || { month, tickets: 0, resolved: 0 };
      current.tickets += 1;
      if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") current.resolved += 1;
      monthlyMap.set(month, current);
    }

    const ratingAverage = ratedChats.length
      ? ratedChats.reduce((total, chat) => total + Number(chat.rating || 0), 0) / ratedChats.length
      : 0;

    const satisfaction = [
      { name: "Very happy", value: ratedChats.filter((chat) => chat.rating === 5).length },
      { name: "Happy", value: ratedChats.filter((chat) => chat.rating === 4).length },
      { name: "Neutral", value: ratedChats.filter((chat) => chat.rating === 3).length },
      { name: "Unhappy", value: ratedChats.filter((chat) => Number(chat.rating || 0) <= 2).length },
    ];

    success(res, {
      tickets,
      open,
      resolved,
      chats,
      agents,
      customers,
      avgResponseTime: "2m 18s",
      agentRating: ratingAverage ? ratingAverage.toFixed(1) : "N/A",
      csat: ratedChats.length ? Math.round((ratedChats.filter((chat) => Number(chat.rating) >= 4).length / ratedChats.length) * 100) : 0,
      aiResolved: 61,
      monthlyTickets: Array.from(monthlyMap.values()),
      satisfaction,
      recentTickets,
    });
  } catch (error) { next(error); }
}

export async function ticketReport(req, res, next) {
  try {
    const [status, priority, tickets] = await Promise.all([
      prisma.ticket.groupBy({ by: ["status"], _count: { status: true } }),
      prisma.ticket.groupBy({ by: ["priority"], _count: { priority: true } }),
      prisma.ticket.findMany({ select: { status: true, createdAt: true } }),
    ]);
    const monthlyMap = new Map();
    for (const ticket of tickets) {
      const month = monthKey(ticket.createdAt);
      const current = monthlyMap.get(month) || { month, tickets: 0, resolved: 0 };
      current.tickets += 1;
      if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") current.resolved += 1;
      monthlyMap.set(month, current);
    }
    success(res, {
      status: status.map((item) => ({ name: item.status, value: item._count.status })),
      priority: priority.map((item) => ({ name: item.priority, value: item._count.priority })),
      monthlyTickets: Array.from(monthlyMap.values()),
    });
  } catch (error) { next(error); }
}

export async function agentReport(req, res, next) {
  try {
    const agents = await prisma.user.findMany({
      where: { role: "AGENT" },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        assigned: { select: { id: true, status: true } },
        agentChats: { select: { id: true, status: true, rating: true } },
      },
    });
    success(res, agents.map((agent) => {
      const ratings = agent.agentChats.filter((chat) => chat.rating);
      const rating = ratings.length ? ratings.reduce((total, chat) => total + chat.rating, 0) / ratings.length : 0;
      return {
        ...agent,
        assignedTickets: agent.assigned.length,
        resolvedTickets: agent.assigned.filter((ticket) => ticket.status === "RESOLVED" || ticket.status === "CLOSED").length,
        activeChats: agent.agentChats.filter((chat) => ["ACTIVE", "WAITING", "TRANSFERRED"].includes(chat.status)).length,
        rating: rating ? rating.toFixed(1) : "N/A",
      };
    }));
  } catch (error) { next(error); }
}

export async function customerReport(req, res, next) {
  try {
    const customers = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        tickets: { select: { id: true, status: true } },
        customerChats: { select: { id: true, status: true, rating: true } },
      },
    });
    success(res, customers.map((customer) => ({
      ...customer,
      ticketCount: customer.tickets.length,
      activeChats: customer.customerChats.filter((chat) => ["ACTIVE", "WAITING", "TRANSFERRED"].includes(chat.status)).length,
    })));
  } catch (error) { next(error); }
}

export async function responseTimeReport(req, res) {
  success(res, [{ month: "Jan", minutes: 4.2 }, { month: "Feb", minutes: 3.6 }, { month: "Mar", minutes: 2.8 }, { month: "Apr", minutes: 2.4 }, { month: "May", minutes: 2.1 }]);
}
