import prisma from "../src/config/prisma.js";

const statements = [
  'ALTER TABLE "ChatSession" ADD COLUMN IF NOT EXISTS "ticketId" TEXT',
  `CREATE TABLE IF NOT EXISTS "InternalChat" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "ticketId" TEXT,
    "openedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InternalChat_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "InternalParticipant" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InternalParticipant_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "InternalMessage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InternalMessage_pkey" PRIMARY KEY ("id")
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS "InternalParticipant_chatId_userId_key" ON "InternalParticipant"("chatId", "userId")',
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatSession_ticketId_fkey') THEN
      ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InternalChat_openedById_fkey') THEN
      ALTER TABLE "InternalChat" ADD CONSTRAINT "InternalChat_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InternalParticipant_chatId_fkey') THEN
      ALTER TABLE "InternalParticipant" ADD CONSTRAINT "InternalParticipant_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "InternalChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InternalParticipant_userId_fkey') THEN
      ALTER TABLE "InternalParticipant" ADD CONSTRAINT "InternalParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InternalMessage_chatId_fkey') THEN
      ALTER TABLE "InternalMessage" ADD CONSTRAINT "InternalMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "InternalChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InternalMessage_senderId_fkey') THEN
      ALTER TABLE "InternalMessage" ADD CONSTRAINT "InternalMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END $$`,
];

try {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
  console.log("Realtime chat migration applied.");
} finally {
  await prisma.$disconnect();
}
