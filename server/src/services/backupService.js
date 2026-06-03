import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "../config/prisma.js";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const secretKeyPattern = /(password|passwd|pwd|token|secret|api[_-]?key|access[_-]?key|private[_-]?key|smtp|otp|jwt|auth|credential|encrypted)/i;

function resolveLocalBackupDir() {
  const configuredDir = process.env.LOCAL_BACKUP_DIR || "backups";
  return path.isAbsolute(configuredDir) ? configuredDir : path.join(serverRoot, configuredDir);
}

function sanitizeConfig(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizeConfig(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => {
      if (secretKeyPattern.test(key)) return [];
      return [[key, sanitizeConfig(item)]];
    })
  );
}

async function collectBackupData() {
  const [users, tickets, chatSessions, messages, attachments, aiConfig, integrationSettings, activityLogs] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        language: true,
        isActive: true,
        twoFactorOn: true,
        department: true,
        categories: true,
        agentStatus: true,
        maxActiveChats: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.ticket.findMany({
      select: {
        id: true,
        subject: true,
        description: true,
        status: true,
        priority: true,
        category: true,
        customerId: true,
        agentId: true,
        assignedAt: true,
        assignedById: true,
        assignmentMode: true,
        createdAt: true,
        updatedAt: true,
        firstResponseAt: true,
        resolvedAt: true,
        firstResponseMinutes: true,
        resolutionMinutes: true,
        slaBreached: true,
        feedbackRating: true,
        feedbackText: true,
        feedbackAt: true,
        complaintSubject: true,
        complaintText: true,
        complaintStatus: true,
        complaintAdminReply: true,
        complaintActionTaken: true,
        complaintAt: true,
        complaintRepliedAt: true,
        complaintResolvedAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.chatSession.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.message.findMany({
      select: {
        id: true,
        content: true,
        originalContent: true,
        translatedContent: true,
        sourceLanguage: true,
        targetLanguage: true,
        senderId: true,
        ticketId: true,
        chatSessionId: true,
        isAI: true,
        fileUrl: true,
        messageType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.attachment.findMany({
      select: { id: true, fileName: true, fileUrl: true, fileType: true, ticketId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.aIConfig.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.integrationSetting.findMany({ orderBy: { type: "asc" } }),
    prisma.activityLog.findMany(),
  ]);

  const feedback = tickets
    .filter((ticket) => ticket.feedbackRating || ticket.feedbackText || ticket.feedbackAt)
    .map(({ id, feedbackRating, feedbackText, feedbackAt }) => ({ ticketId: id, feedbackRating, feedbackText, feedbackAt }));
  const complaints = tickets
    .filter((ticket) => ticket.complaintStatus !== "NONE" || ticket.complaintSubject || ticket.complaintText)
    .map(({ id, complaintSubject, complaintText, complaintStatus, complaintAdminReply, complaintActionTaken, complaintAt, complaintRepliedAt, complaintResolvedAt }) => ({
      ticketId: id,
      complaintSubject,
      complaintText,
      complaintStatus,
      complaintAdminReply,
      complaintActionTaken,
      complaintAt,
      complaintRepliedAt,
      complaintResolvedAt,
    }));
  const integrations = integrationSettings.map((setting) => ({ ...setting, config: sanitizeConfig(setting.config) }));

  return { exportedAt: new Date().toISOString(), users, tickets, chatSessions, messages, attachments, feedback, complaints, activityLogs, aiConfig, integrations };
}

async function uploadToSupabase(fileName, content) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BACKUP_BUCKET = "backups" } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase backup provider requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  const url = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(SUPABASE_BACKUP_BUCKET)}/${encodeURIComponent(fileName)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
      "x-upsert": "true",
    },
    body: content,
  });
  if (!response.ok) throw new Error(`Supabase backup upload failed: ${response.status} ${await response.text()}`);
  return `supabase://${SUPABASE_BACKUP_BUCKET}/${fileName}`;
}

async function downloadFromSupabase(filePath) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BACKUP_BUCKET = "backups" } = process.env;
  const objectName = filePath?.startsWith("supabase://") ? filePath.split("/").pop() : filePath;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !objectName) return null;
  const url = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(SUPABASE_BACKUP_BUCKET)}/${encodeURIComponent(objectName)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY },
  });
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

export async function createBackup(createdById, ipAddress) {
  const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const provider = String(process.env.BACKUP_PROVIDER || "local").toLowerCase();
  const log = await prisma.backupLog.create({ data: { fileName, status: "IN_PROGRESS", provider, createdById } });
  try {
    const data = await collectBackupData();
    const content = JSON.stringify(data, null, 2);
    let storedPath;
    if (provider === "supabase") {
      storedPath = await uploadToSupabase(fileName, content);
    } else {
      const backupDir = resolveLocalBackupDir();
      await fs.mkdir(backupDir, { recursive: true });
      storedPath = path.join(backupDir, fileName);
      await fs.writeFile(storedPath, content);
    }
    await prisma.activityLog.create({ data: { userId: createdById, action: `Created backup ${fileName}`, ipAddress } }).catch(() => {});
    return prisma.backupLog.update({ where: { id: log.id }, data: { filePath: storedPath, status: "SUCCESS", provider, sizeBytes: Buffer.byteLength(content) } });
  } catch (error) {
    await prisma.systemAlert.create({ data: { type: "BACKUP_FAILURE", severity: "ERROR", title: "Backup failed", message: error.message.slice(0, 500) } }).catch(() => {});
    return prisma.backupLog.update({ where: { id: log.id }, data: { status: "FAILED", errorMessage: error.message } });
  }
}

export async function getBackupFile(id, userId, ipAddress) {
  const backup = await prisma.backupLog.findUnique({ where: { id } });
  if (!backup?.filePath || backup.status !== "SUCCESS") return null;
  if (backup.provider === "supabase") {
    const content = await downloadFromSupabase(backup.filePath);
    if (!content) return null;
    await prisma.activityLog.create({ data: { userId, action: `Downloaded backup ${backup.fileName}`, ipAddress } }).catch(() => {});
    return { backup, content };
  }
  try {
    const content = await fs.readFile(backup.filePath);
    await prisma.activityLog.create({ data: { userId, action: `Downloaded backup ${backup.fileName}`, ipAddress } }).catch(() => {});
    return { backup, content };
  } catch {
    return null;
  }
}

export async function deleteBackupRecord(id, userId, ipAddress) {
  const backup = await prisma.backupLog.findUnique({ where: { id } });
  if (!backup) return null;
  await prisma.backupLog.delete({ where: { id } });
  await prisma.activityLog.create({ data: { userId, action: `Deleted backup record ${backup.fileName}`, ipAddress } }).catch(() => {});
  return backup;
}
