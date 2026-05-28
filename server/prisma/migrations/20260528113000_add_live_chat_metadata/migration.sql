ALTER TABLE "ChatSession"
ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'Website chatbot',
ADD COLUMN "encrypted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lastMessage" TEXT,
ADD COLUMN "visitorIp" TEXT,
ADD COLUMN "visitorPage" TEXT,
ADD COLUMN "visitorDevice" TEXT,
ADD COLUMN "visitorVisits" INTEGER NOT NULL DEFAULT 1;
