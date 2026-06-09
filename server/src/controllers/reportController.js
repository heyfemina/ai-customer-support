import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";

function monthKey(date) {
  return new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(date));
}

const closedTicketStatuses = ["RESOLVED", "AUTO_CLOSED", "CLOSED"];
const openTicketStatuses = ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLUTION_PROPOSED", "CUSTOMER_RESPONDED_AFTER_RESOLUTION", "REOPENED"];

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function sendCsv(res, fileName, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  return res.send(csv);
}

export async function dashboardReport(req, res, next) {
  try {
    const ticketScope = req.user.role === "AGENT" ? { agentId: req.user.id } : {};
    const chatScope = req.user.role === "AGENT" ? { agentId: req.user.id } : {};
    const [tickets, open, resolved, complaints, chats, agents, agentsOnline, customers, allTickets, ratedChats, ticketFeedback, aiResolved, recentTickets] = await Promise.all([
      prisma.ticket.count({ where: ticketScope }),
      prisma.ticket.count({ where: { ...ticketScope, status: { in: openTicketStatuses } } }),
      prisma.ticket.count({ where: { ...ticketScope, status: { in: closedTicketStatuses } } }),
      prisma.ticket.count({ where: { ...ticketScope, complaintStatus: { not: "NONE" } } }),
      prisma.chatSession.count({ where: { ...chatScope, status: { in: ["ASSIGNED", "ACTIVE", "WAITING", "TRANSFERRED"] } } }),
      prisma.user.count({ where: { role: "AGENT" } }),
      prisma.user.count({ where: { role: "AGENT", isActive: true, agentStatus: { not: "OFFLINE" } } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.ticket.findMany({ where: ticketScope, select: { status: true, createdAt: true, firstResponseMinutes: true, resolutionMinutes: true } }),
      prisma.chatSession.findMany({ where: { ...chatScope, rating: { not: null } }, select: { rating: true } }),
      prisma.ticket.findMany({ where: { ...ticketScope, feedbackRating: { not: null } }, select: { feedbackRating: true } }),
      prisma.ticket.count({ where: { ...ticketScope, status: { in: closedTicketStatuses }, messages: { some: { isAI: true } } } }),
      prisma.ticket.findMany({
        where: ticketScope,
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
      if (closedTicketStatuses.includes(ticket.status)) current.resolved += 1;
      monthlyMap.set(month, current);
    }

    const allRatings = [
      ...ratedChats.map((chat) => Number(chat.rating || 0)),
      ...ticketFeedback.map((ticket) => Number(ticket.feedbackRating || 0)),
    ].filter(Boolean);
    const ratingAverage = allRatings.length
      ? allRatings.reduce((total, rating) => total + rating, 0) / allRatings.length
      : 0;
    const respondedTickets = allTickets.filter((ticket) => ticket.firstResponseMinutes !== null);
    const avgFirstResponseMinutes = respondedTickets.length
      ? respondedTickets.reduce((total, ticket) => total + Number(ticket.firstResponseMinutes || 0), 0) / respondedTickets.length
      : 0;
    const aiResolvedPercent = resolved ? Math.round((aiResolved / resolved) * 100) : 0;
    const pendingTickets = Math.max(tickets - open - resolved, 0);
    const avgResponseTime = avgFirstResponseMinutes ? `${Number(avgFirstResponseMinutes.toFixed(1))}m` : "N/A";
    const customerSatisfaction = allRatings.length ? Math.round((allRatings.filter((rating) => rating >= 4).length / allRatings.length) * 100) : 0;

    const satisfaction = [
      { name: "Very happy", value: allRatings.filter((rating) => rating === 5).length },
      { name: "Happy", value: allRatings.filter((rating) => rating === 4).length },
      { name: "Neutral", value: allRatings.filter((rating) => rating === 3).length },
      { name: "Unhappy", value: allRatings.filter((rating) => rating <= 2).length },
    ];

    success(res, {
      totalTickets: tickets,
      openTickets: open,
      resolvedTickets: resolved,
      pendingTickets,
      activeChats: chats,
      avgResponseTime,
      customerSatisfaction,
      agentsOnline,
      aiResolvedTickets: aiResolvedPercent,
      tickets,
      open,
      resolved,
      pending: pendingTickets,
      complaints,
      chats,
      agents,
      agentsOnline,
      customers,
      avgResponseTime,
      agentRating: ratingAverage ? ratingAverage.toFixed(1) : "N/A",
      csat: customerSatisfaction,
      aiResolved: aiResolvedPercent,
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
      if (closedTicketStatuses.includes(ticket.status)) current.resolved += 1;
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
      where: req.user.role === "AGENT" ? { id: req.user.id, role: "AGENT" } : { role: "AGENT" },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        department: true,
        categories: true,
        agentStatus: true,
        maxActiveChats: true,
        assigned: { select: { id: true, status: true, firstResponseMinutes: true, resolutionMinutes: true, feedbackRating: true, complaintStatus: true, createdAt: true } },
        agentChats: { select: { id: true, status: true, rating: true } },
      },
    });
    success(res, agents.map((agent) => {
      const ratings = agent.agentChats.filter((chat) => chat.rating);
      const ticketRatings = agent.assigned.filter((ticket) => ticket.feedbackRating);
      const allRatings = [...ratings.map((chat) => chat.rating), ...ticketRatings.map((ticket) => ticket.feedbackRating)];
      const rating = ratings.length ? ratings.reduce((total, chat) => total + chat.rating, 0) / ratings.length : 0;
      const responded = agent.assigned.filter((ticket) => ticket.firstResponseMinutes !== null);
      const resolved = agent.assigned.filter((ticket) => ticket.resolutionMinutes !== null);
      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        isActive: agent.isActive,
        department: agent.department,
        categories: agent.categories,
        agentStatus: agent.agentStatus,
        maxActiveChats: agent.maxActiveChats,
        assigned: agent.assigned,
        assignedTickets: agent.assigned.length,
        resolvedTickets: agent.assigned.filter((ticket) => closedTicketStatuses.includes(ticket.status)).length,
        activeChats: agent.agentChats.filter((chat) => ["ASSIGNED", "ACTIVE", "WAITING", "TRANSFERRED"].includes(chat.status)).length,
        rating: allRatings.length ? (allRatings.reduce((sum, value) => sum + Number(value || 0), 0) / allRatings.length).toFixed(1) : rating ? rating.toFixed(1) : "N/A",
        avgFirstResponseMinutes: responded.length ? Number((responded.reduce((sum, ticket) => sum + Number(ticket.firstResponseMinutes || 0), 0) / responded.length).toFixed(1)) : 0,
        avgResolutionMinutes: resolved.length ? Number((resolved.reduce((sum, ticket) => sum + Number(ticket.resolutionMinutes || 0), 0) / resolved.length).toFixed(1)) : 0,
        complaintCount: agent.assigned.filter((ticket) => ticket.complaintStatus && ticket.complaintStatus !== "NONE").length,
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
        tickets: { select: { id: true, status: true, subject: true, agent: { select: { id: true, name: true, email: true } }, feedbackRating: true, complaintStatus: true, resolutionMinutes: true, createdAt: true } },
        customerChats: { select: { id: true, status: true, rating: true } },
      },
    });
    success(res, customers.map((customer) => ({
      ...customer,
      ticketCount: customer.tickets.length,
      activeChats: customer.customerChats.filter((chat) => ["ASSIGNED", "ACTIVE", "WAITING", "TRANSFERRED"].includes(chat.status)).length,
      feedbackCount: customer.tickets.filter((ticket) => ticket.feedbackRating).length,
      complaintCount: customer.tickets.filter((ticket) => ticket.complaintStatus && ticket.complaintStatus !== "NONE").length,
    })));
  } catch (error) { next(error); }
}

export async function responseTimeReport(req, res) {
  const tickets = await prisma.ticket.findMany({
    where: { firstResponseMinutes: { not: null } },
    select: { createdAt: true, firstResponseMinutes: true, resolutionMinutes: true, priority: true, status: true, agentId: true },
  });
  const monthly = new Map();
  for (const ticket of tickets) {
    const month = monthKey(ticket.createdAt);
    const row = monthly.get(month) || { month, count: 0, minutes: 0, resolutionMinutes: 0 };
    row.count += 1;
    row.minutes += ticket.firstResponseMinutes || 0;
    row.resolutionMinutes += ticket.resolutionMinutes || 0;
    monthly.set(month, row);
  }
  success(res, Array.from(monthly.values()).map((row) => ({
    month: row.month,
    minutes: row.count ? Number((row.minutes / row.count).toFixed(1)) : 0,
    resolutionMinutes: row.count ? Number((row.resolutionMinutes / row.count).toFixed(1)) : 0,
  })));
}

export async function slaReport(req, res, next) {
  try {
    const tickets = await prisma.ticket.findMany({
      include: {
        agent: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const responded = tickets.filter((ticket) => ticket.firstResponseMinutes !== null);
    const resolved = tickets.filter((ticket) => ticket.resolutionMinutes !== null);
    const averageFirstResponseMinutes = responded.length ? responded.reduce((sum, ticket) => sum + Number(ticket.firstResponseMinutes || 0), 0) / responded.length : 0;
    const averageResolutionMinutes = resolved.length ? resolved.reduce((sum, ticket) => sum + Number(ticket.resolutionMinutes || 0), 0) / resolved.length : 0;
    success(res, {
      totalTickets: tickets.length,
      breached: tickets.filter((ticket) => ticket.slaBreached).length,
      averageFirstResponseMinutes: Number(averageFirstResponseMinutes.toFixed(1)),
      averageResolutionMinutes: Number(averageResolutionMinutes.toFixed(1)),
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        agent: ticket.agent,
        customer: ticket.customer,
        firstResponseMinutes: ticket.firstResponseMinutes,
        resolutionMinutes: ticket.resolutionMinutes,
        slaBreached: ticket.slaBreached,
        createdAt: ticket.createdAt,
      })),
    });
  } catch (error) { next(error); }
}

export async function exportTicketsReport(req, res, next) {
  try {
    const tickets = await prisma.ticket.findMany({
      include: {
        customer: { select: { name: true, email: true } },
        agent: { select: { name: true } },
        attachments: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return sendCsv(res, "tickets-report.csv", [
      "Ticket ID",
      "Subject",
      "Customer Name",
      "Customer Email",
      "Agent Name",
      "Category",
      "Priority",
      "Status",
      "Created At",
      "Resolved At",
      "First Response Time",
      "Resolution Time",
      "Attachment Count",
    ], tickets.map((ticket) => [
      ticket.id,
      ticket.subject,
      ticket.customer?.name,
      ticket.customer?.email,
      ticket.agent?.name || "Unassigned",
      ticket.category,
      ticket.priority,
      ticket.status,
      ticket.createdAt?.toISOString(),
      ticket.resolvedAt?.toISOString() || "",
      ticket.firstResponseMinutes ?? "",
      ticket.resolutionMinutes ?? "",
      ticket.attachments.length,
    ]));
  } catch (error) { next(error); }
}

export async function exportAgentsReport(req, res, next) {
  try {
    const agents = await prisma.user.findMany({
      where: req.user.role === "AGENT" ? { id: req.user.id, role: "AGENT" } : { role: "AGENT" },
      select: {
        name: true,
        email: true,
        department: true,
        assigned: { select: { status: true, firstResponseMinutes: true, feedbackRating: true } },
        agentChats: { select: { status: true, rating: true } },
      },
      orderBy: { name: "asc" },
    });
    return sendCsv(res, "agents-report.csv", [
      "Agent Name",
      "Email",
      "Department",
      "Tickets Assigned",
      "Tickets Resolved",
      "Active Chats",
      "Average Response Time",
      "Rating",
    ], agents.map((agent) => {
      const responded = agent.assigned.filter((ticket) => ticket.firstResponseMinutes !== null);
      const ticketRatings = agent.assigned.map((ticket) => ticket.feedbackRating).filter(Boolean);
      const chatRatings = agent.agentChats.map((chat) => chat.rating).filter(Boolean);
      const ratings = [...ticketRatings, ...chatRatings];
      return [
        agent.name,
        agent.email,
        agent.department,
        agent.assigned.length,
        agent.assigned.filter((ticket) => closedTicketStatuses.includes(ticket.status)).length,
        agent.agentChats.filter((chat) => ["ASSIGNED", "ACTIVE", "WAITING", "TRANSFERRED"].includes(chat.status)).length,
        responded.length ? (responded.reduce((sum, ticket) => sum + Number(ticket.firstResponseMinutes || 0), 0) / responded.length).toFixed(1) : "",
        ratings.length ? (ratings.reduce((sum, value) => sum + Number(value || 0), 0) / ratings.length).toFixed(1) : "",
      ];
    }));
  } catch (error) { next(error); }
}

export async function exportCustomersReport(req, res, next) {
  try {
    const customers = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: {
        name: true,
        email: true,
        updatedAt: true,
        tickets: { select: { feedbackRating: true, updatedAt: true } },
        customerChats: { select: { updatedAt: true } },
      },
      orderBy: { name: "asc" },
    });
    return sendCsv(res, "customers-report.csv", [
      "Customer Name",
      "Email",
      "Tickets Created",
      "Chats Started",
      "Last Activity",
      "Feedback Count",
    ], customers.map((customer) => {
      const dates = [
        customer.updatedAt,
        ...customer.tickets.map((ticket) => ticket.updatedAt),
        ...customer.customerChats.map((chat) => chat.updatedAt),
      ].filter(Boolean).map((date) => new Date(date));
      const lastActivity = dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))).toISOString() : "";
      return [
        customer.name,
        customer.email,
        customer.tickets.length,
        customer.customerChats.length,
        lastActivity,
        customer.tickets.filter((ticket) => ticket.feedbackRating).length,
      ];
    }));
  } catch (error) { next(error); }
}
