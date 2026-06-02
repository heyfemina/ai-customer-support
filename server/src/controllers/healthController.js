import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";

function productionReadiness() {
  const required = [
    { key: "JWT_SECRET", label: "JWT secret" },
    { key: "ENCRYPTION_SECRET", label: "Message encryption key" },
    { key: "API_KEY_ENCRYPTION_SECRET", label: "API key encryption key" },
    { key: "DATABASE_URL", label: "Database URL" },
    { key: "CLIENT_URLS", label: "Allowed client origins" },
  ];
  const integrations = [
    { key: "EMAIL_HOST", label: "SMTP host" },
    { key: "EMAIL_USER", label: "SMTP user" },
    { key: "EMAIL_PASS", label: "SMTP password" },
    { key: "WHATSAPP_ACCESS_TOKEN", label: "WhatsApp access token" },
    { key: "WHATSAPP_PHONE_NUMBER_ID", label: "WhatsApp phone number ID" },
    { key: "CLOUD_BACKUP_DIR", label: "Cloud backup target" },
  ];
  const missingRequired = required.filter((item) => !process.env[item.key]).map((item) => item.label);
  const missingIntegrations = integrations.filter((item) => !process.env[item.key]).map((item) => item.label);
  return {
    productionReady: missingRequired.length === 0 && process.env.NODE_ENV === "production",
    nodeEnv: process.env.NODE_ENV || "development",
    missingRequired,
    missingIntegrations,
    firewallWaf: process.env.WAF_ENABLED === "true" ? "configured" : "hosting-level setup required",
    monitoring: process.env.MONITORING_DSN || process.env.SENTRY_DSN ? "configured" : "external monitoring DSN not configured",
  };
}

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
    } catch (error) {
      database = "error";
      await prisma.systemAlert.create({ data: { type: "DATABASE_HEALTH", severity: "CRITICAL", title: "Database health check failed", message: error.message?.slice(0, 500) || "Database query failed" } }).catch(() => {});
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
      readiness: productionReadiness(),
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
