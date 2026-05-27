import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("123456", 10);
  const agentPassword = await bcrypt.hash("agent123", 10);
  const customerPassword = await bcrypt.hash("customer123", 10);
  const etherealPassword = await bcrypt.hash("test123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { password },
    create: { name: "Ariana Admin", email: "admin@example.com", password, role: "ADMIN" },
  });
  const agent = await prisma.user.upsert({
    where: { email: "agent@example.com" },
    update: {},
    create: { name: "Marco Agent", email: "agent@example.com", password: agentPassword, role: "AGENT" },
  });
  const customer = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {},
    create: { name: "Clara Customer", email: "customer@example.com", password: customerPassword, role: "CUSTOMER" },
  });
  await prisma.user.upsert({
    where: { email: "mathilde8@ethereal.email" },
    update: {},
    create: { name: "Mathilde Ethereal", email: "mathilde8@ethereal.email", password: etherealPassword, role: "CUSTOMER" },
  });

  const ticket = await prisma.ticket.create({
    data: {
      subject: "Billing invoice mismatch",
      description: "The enterprise invoice includes duplicate seats for the April billing cycle.",
      priority: "HIGH",
      category: "Billing",
      customerId: customer.id,
      agentId: agent.id,
    },
  });

  await prisma.message.create({
    data: { content: "I can help review this invoice.", senderId: agent.id, ticketId: ticket.id },
  });

  const chat = await prisma.chatSession.create({
    data: { customerId: customer.id, agentId: agent.id, status: "ACTIVE", language: "en", rating: 5, feedback: "Helpful and fast." },
  });

  await prisma.message.create({
    data: { content: "Hello, I need help with my account.", senderId: customer.id, chatSessionId: chat.id },
  });

  await prisma.aIConfig.create({
    data: {
      botName: "Support AI",
      welcomeMessage: "Hello, I can help with tickets, account questions, and hand you to an agent when needed.",
      fallbackMessage: "I am transferring this conversation to a support agent.",
    },
  });

  await prisma.integrationSetting.createMany({
    data: [
      { type: "WHATSAPP", config: { phoneNumberId: "", accessToken: "" } },
      { type: "CHATBOT", config: { domains: [], handoffEnabled: true } },
      { type: "EMAIL", config: { host: "smtp.gmail.com", port: 587 } },
    ],
    skipDuplicates: true,
  });

  await prisma.activityLog.create({ data: { userId: admin.id, action: "Seeded demo workspace", ipAddress: "127.0.0.1" } });
}

main().finally(async () => prisma.$disconnect());
