import fs from "fs/promises";
import path from "path";
import prisma from "../config/prisma.js";

const backupDir = path.resolve("backups");

async function collectBackupData() {
  const [users, tickets, chatSessions, messages, attachments, aiConfig, integrations, activityLogs] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, language: true, isActive: true, twoFactorOn: true, createdAt: true, updatedAt: true } }),
    prisma.ticket.findMany({ include: { attachments: true } }),
    prisma.chatSession.findMany(),
    prisma.message.findMany({ select: { id: true, content: true, originalContent: true, translatedContent: true, sourceLanguage: true, targetLanguage: true, senderId: true, ticketId: true, chatSessionId: true, isAI: true, fileUrl: true, messageType: true, createdAt: true } }),
    prisma.attachment.findMany(),
    prisma.aIConfig.findMany(),
    prisma.integrationSetting.findMany({ select: { id: true, type: true, isActive: true, createdAt: true, updatedAt: true } }),
    prisma.activityLog.findMany(),
  ]);
  return { exportedAt: new Date().toISOString(), users, tickets, chatSessions, messages, attachments, aiConfig, integrations, activityLogs };
}

export async function createBackup(createdById) {
  const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const log = await prisma.backupLog.create({ data: { fileName, status: "IN_PROGRESS", createdById } });
  try {
    await fs.mkdir(backupDir, { recursive: true });
    const filePath = path.join(backupDir, fileName);
    const data = await collectBackupData();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    const stat = await fs.stat(filePath);
    return prisma.backupLog.update({ where: { id: log.id }, data: { filePath, status: "SUCCESS", provider: "local", sizeBytes: stat.size } });
  } catch (error) {
    await prisma.systemAlert.create({ data: { type: "BACKUP_FAILURE", severity: "ERROR", title: "Backup failed", message: error.message.slice(0, 500) } }).catch(() => {});
    return prisma.backupLog.update({ where: { id: log.id }, data: { status: "FAILED", errorMessage: error.message } });
  }
}

export async function getBackupFile(id) {
  const backup = await prisma.backupLog.findUnique({ where: { id } });
  if (!backup?.filePath) return null;
  return backup;
}
