import prisma from "../config/prisma.js";
import { createBackup, getBackupFile } from "../services/backupService.js";
import { success } from "../utils/responseHandler.js";

export async function createBackupNow(req, res, next) {
  try {
    success(res, await createBackup(req.user.id), "Backup created", 201);
  } catch (error) { next(error); }
}

export async function getBackups(req, res, next) {
  try {
    success(res, await prisma.backupLog.findMany({ orderBy: { createdAt: "desc" } }));
  } catch (error) { next(error); }
}

export async function downloadBackup(req, res, next) {
  try {
    const backup = await getBackupFile(req.params.id);
    if (!backup || backup.status !== "SUCCESS") return res.status(404).json({ success: false, message: "Backup file not found" });
    res.download(backup.filePath, backup.fileName);
  } catch (error) { next(error); }
}

export async function deleteBackup(req, res, next) {
  try {
    await prisma.backupLog.delete({ where: { id: req.params.id } });
    success(res, null, "Backup record deleted");
  } catch (error) { next(error); }
}
