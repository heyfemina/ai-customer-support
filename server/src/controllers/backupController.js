import prisma from "../config/prisma.js";
import { createBackup, deleteBackupRecord, getBackupFile } from "../services/backupService.js";
import { success } from "../utils/responseHandler.js";

export async function createBackupNow(req, res, next) {
  try {
    success(res, await createBackup(req.user.id, req.ip), "Backup created", 201);
  } catch (error) { next(error); }
}

export async function getBackups(req, res, next) {
  try {
    success(res, await prisma.backupLog.findMany({ orderBy: { createdAt: "desc" } }));
  } catch (error) { next(error); }
}

export async function downloadBackup(req, res, next) {
  try {
    const file = await getBackupFile(req.params.id, req.user.id, req.ip);
    if (!file) return res.status(404).json({ success: false, message: "Backup file not found" });
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${file.backup.fileName}"`);
    res.send(file.content);
  } catch (error) { next(error); }
}

export async function deleteBackup(req, res, next) {
  try {
    const backup = await deleteBackupRecord(req.params.id, req.user.id, req.ip);
    if (!backup) return res.status(404).json({ success: false, message: "Backup record not found" });
    success(res, null, "Backup record deleted");
  } catch (error) { next(error); }
}
