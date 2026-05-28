CREATE TYPE "BackupStatus" AS ENUM ('SUCCESS', 'FAILED', 'IN_PROGRESS');
CREATE TYPE "GDPRRequestType" AS ENUM ('EXPORT', 'DELETE');
CREATE TYPE "GDPRRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

ALTER TABLE "Ticket" ADD COLUMN "firstResponseAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN "firstResponseMinutes" INTEGER;
ALTER TABLE "Ticket" ADD COLUMN "resolutionMinutes" INTEGER;
ALTER TABLE "Ticket" ADD COLUMN "slaBreached" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Message" ADD COLUMN "originalContent" TEXT;
ALTER TABLE "Message" ADD COLUMN "translatedContent" TEXT;
ALTER TABLE "Message" ADD COLUMN "sourceLanguage" TEXT;
ALTER TABLE "Message" ADD COLUMN "targetLanguage" TEXT;
ALTER TABLE "Message" ADD COLUMN "encryptionVersion" TEXT;

ALTER TABLE "ChatSession" ADD COLUMN "visitorId" TEXT;
ALTER TABLE "ChatSession" ADD COLUMN "visitorDomain" TEXT;
ALTER TABLE "ChatSession" ADD COLUMN "visitorReferrer" TEXT;
ALTER TABLE "ChatSession" ADD COLUMN "widgetId" TEXT;

CREATE TABLE "TwoFactorToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "tempLoginTokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TwoFactorToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TwoFactorToken_tempLoginTokenHash_key" ON "TwoFactorToken"("tempLoginTokenHash");

CREATE TABLE "RecoveryCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BackupLog" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "filePath" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'local',
  "status" "BackupStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "sizeBytes" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackupLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GDPRRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "GDPRRequestType" NOT NULL,
  "status" "GDPRRequestStatus" NOT NULL DEFAULT 'PENDING',
  "requestedById" TEXT,
  "reviewedById" TEXT,
  "reason" TEXT,
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "GDPRRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AIUsageLog" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "tokensIn" INTEGER NOT NULL DEFAULT 0,
  "tokensOut" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemAlert" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "severity" "AlertSeverity" NOT NULL DEFAULT 'INFO',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "isResolved" BOOLEAN NOT NULL DEFAULT false,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemAlert_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TwoFactorToken" ADD CONSTRAINT "TwoFactorToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecoveryCode" ADD CONSTRAINT "RecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BackupLog" ADD CONSTRAINT "BackupLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GDPRRequest" ADD CONSTRAINT "GDPRRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GDPRRequest" ADD CONSTRAINT "GDPRRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
