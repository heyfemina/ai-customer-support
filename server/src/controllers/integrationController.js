import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";
import { sendTestEmail } from "../services/emailService.js";

async function integrationConfig(type, body = {}) {
  const saved = await prisma.integrationSetting.findUnique({ where: { type } });
  return { ...(saved?.config || {}), ...(body || {}) };
}

export async function getIntegrations(req, res, next) {
  try {
    success(res, await prisma.integrationSetting.findMany({ orderBy: { type: "asc" } }));
  } catch (error) { next(error); }
}

export async function updateIntegration(req, res, next) {
  try {
    const integration = await prisma.integrationSetting.upsert({
      where: { type: req.params.type.toUpperCase() },
      update: { config: req.body.config || req.body, isActive: Boolean(req.body.isActive) },
      create: { type: req.params.type.toUpperCase(), config: req.body.config || req.body, isActive: Boolean(req.body.isActive) },
    });
    await prisma.activityLog.create({ data: { userId: req.user?.id, action: `Updated ${integration.type} integration`, ipAddress: req.ip } });
    success(res, integration, "Integration updated");
  } catch (error) { next(error); }
}

export async function testEmail(req, res, next) {
  try {
    const config = await integrationConfig("EMAIL", req.body);
    const emailResult = await sendTestEmail(config.to || config.senderEmail);
    success(res, emailResult, "Test email captured by Ethereal");
  } catch (error) { next(error); }
}

export async function testWhatsapp(req, res, next) {
  try {
    const config = await integrationConfig("WHATSAPP", req.body);
    if (!config.phoneNumberId || !config.accessToken || !config.testRecipient) {
      return res.status(400).json({ success: false, message: "WhatsApp test requires phoneNumberId, accessToken, and testRecipient." });
    }
    const response = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(config.phoneNumberId)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: config.testRecipient,
        type: "text",
        text: { body: "AI Customer Support WhatsApp test message." },
      }),
    });
    const payload = await response.json();
    if (!response.ok) return res.status(response.status).json({ success: false, message: payload.error?.message || "WhatsApp test failed", data: payload });
    success(res, payload, "WhatsApp test sent");
  } catch (error) { next(error); }
}

export async function testChatbot(req, res, next) {
  try {
    const config = await integrationConfig("CHATBOT", req.body);
    if (!config.allowedDomains) return res.status(400).json({ success: false, message: "Allowed domains are required before testing chatbot integration." });
    success(res, { embedReady: true, allowedDomains: config.allowedDomains, widgetId: config.embedKey || "default" }, "Website chatbot configuration is ready");
  } catch (error) { next(error); }
}
