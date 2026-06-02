import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function pad(number) {
  return String(number).padStart(3, "0");
}

async function upsertUsers({ count, role, emailPrefix, namePrefix, password }) {
  const hashed = await bcrypt.hash(password, 10);
  for (let index = 1; index <= count; index += 1) {
    const suffix = pad(index);
    await prisma.user.upsert({
      where: { email: `${emailPrefix}${suffix}@example.com` },
      update: { isActive: true, role },
      create: {
        name: `${namePrefix} ${suffix}`,
        email: `${emailPrefix}${suffix}@example.com`,
        password: hashed,
        role,
        language: index % 4 === 0 ? "fr" : index % 3 === 0 ? "es" : index % 2 === 0 ? "it" : "en",
      },
    });
  }
}

async function main() {
  await upsertUsers({ count: 50, role: "AGENT", emailPrefix: "load-agent-", namePrefix: "Load Agent", password: "agent123" });
  await upsertUsers({ count: 100, role: "CUSTOMER", emailPrefix: "load-customer-", namePrefix: "Load Customer", password: "customer123" });
  const [agents, customers] = await Promise.all([
    prisma.user.findMany({ where: { email: { startsWith: "load-agent-" }, role: "AGENT" }, orderBy: { email: "asc" } }),
    prisma.user.findMany({ where: { email: { startsWith: "load-customer-" }, role: "CUSTOMER" }, orderBy: { email: "asc" } }),
  ]);

  const existingTickets = await prisma.ticket.count({ where: { subject: { startsWith: "Load Test Ticket" } } });
  const ticketRows = [];
  const ticketMessageRows = [];
  for (let index = existingTickets + 1; index <= 200; index += 1) {
    const customer = customers[(index - 1) % customers.length];
    const agent = agents[(index - 1) % agents.length];
    const resolved = index % 3 === 0;
    const hasComplaint = index % 17 === 0;
    const ticketId = crypto.randomUUID();
    ticketRows.push({
        id: ticketId,
        subject: `Load Test Ticket ${pad(index)}`,
        description: `Demo support issue ${pad(index)} for workload, reports, feedback, and complaint testing.`,
        category: index % 4 === 0 ? "Billing" : index % 3 === 0 ? "Technical" : "General",
        priority: index % 11 === 0 ? "URGENT" : index % 5 === 0 ? "HIGH" : "MEDIUM",
        status: resolved ? "RESOLVED" : index % 2 === 0 ? "IN_PROGRESS" : "OPEN",
        customerId: customer.id,
        agentId: agent.id,
        assignedAt: new Date(),
        assignmentMode: "LEAST_BUSY_AGENT",
        firstResponseAt: new Date(Date.now() - 45 * 60 * 1000),
        firstResponseMinutes: 12 + (index % 20),
        resolvedAt: resolved ? new Date() : null,
        resolutionMinutes: resolved ? 45 + (index % 120) : null,
        feedbackRating: resolved ? 3 + (index % 3) : null,
        feedbackText: resolved ? "Demo customer feedback for resolved ticket." : null,
        feedbackAt: resolved ? new Date() : null,
        complaintSubject: hasComplaint ? "Demo complaint about response delay" : null,
        complaintText: hasComplaint ? "Customer felt the agent response was too slow during testing." : null,
        complaintStatus: hasComplaint ? "OPEN" : "NONE",
        complaintAt: hasComplaint ? new Date() : null,
    });
    ticketMessageRows.push(
      { ticketId, senderId: customer.id, content: "Customer created this demo support request." },
      { ticketId, senderId: agent.id, content: "Agent replied with troubleshooting steps." }
    );
  }
  if (ticketRows.length) {
    await prisma.ticket.createMany({ data: ticketRows });
    await prisma.message.createMany({ data: ticketMessageRows });
  }

  const existingChats = await prisma.chatSession.count({ where: { channel: { startsWith: "Load Test Chat" } } });
  const chatRows = [];
  const chatMessageRows = [];
  for (let index = existingChats + 1; index <= 100; index += 1) {
    const customer = customers[(index - 1) % customers.length];
    const agent = agents[(index - 1) % agents.length];
    const chatId = crypto.randomUUID();
    const agentId = index % 5 === 0 ? null : agent.id;
    chatRows.push({
        id: chatId,
        customerId: customer.id,
        agentId,
        status: index % 5 === 0 ? "WAITING" : index % 4 === 0 ? "CLOSED" : "ACTIVE",
        channel: `Load Test Chat ${pad(index)}`,
        lastMessage: "Demo chat message for queue testing.",
        rating: index % 4 === 0 ? 4 : null,
        feedback: index % 4 === 0 ? "Demo chat feedback." : null,
        visitorPage: "/support",
        visitorDevice: "Load test browser",
        visitorVisits: 1 + (index % 8),
    });
    chatMessageRows.push({ chatSessionId: chatId, senderId: customer.id, content: "Hello, I need help with a demo issue." });
    if (agentId) chatMessageRows.push({ chatSessionId: chatId, senderId: agent.id, content: "Sure, I can help you with that." });
  }
  if (chatRows.length) {
    await prisma.chatSession.createMany({ data: chatRows });
    await prisma.message.createMany({ data: chatMessageRows });
  }

  console.log("Created or refreshed 50 test agents, 100 test customers, 200 demo tickets, and 100 demo chats.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
