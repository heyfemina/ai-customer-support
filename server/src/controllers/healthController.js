import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";

export async function health(req, res) {
  const startedAt = req.app.get("startedAt");
  let database = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }
  success(res, {
    api: "ok",
    database,
    uptimeSeconds: Math.round(process.uptime()),
    startedAt,
  });
}

export async function systemHealth(req, res, next) {
  try {
    let database = "ok";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "error";
    }
    const [alerts, aiFailures, backupFailures] = await Promise.all([
      prisma.systemAlert.findMany({ where: { isResolved: false }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.aIUsageLog.count({ where: { success: false } }),
      prisma.backupLog.count({ where: { status: "FAILED" } }),
    ]);
    success(res, {
      api: "ok",
      database,
      activeSocketConnections: req.app.get("activeSocketConnections")?.() || 0,
      aiFailures,
      backupFailures,
      alerts,
    });
  } catch (error) { next(error); }
}

export async function getAlerts(req, res, next) {
  try {
    success(res, await prisma.systemAlert.findMany({ orderBy: { createdAt: "desc" }, take: 100 }));
  } catch (error) { next(error); }
}

export async function resolveAlert(req, res, next) {
  try {
    success(res, await prisma.systemAlert.update({ where: { id: req.params.id }, data: { isResolved: true, resolvedAt: new Date() } }), "Alert resolved");
  } catch (error) { next(error); }
}
