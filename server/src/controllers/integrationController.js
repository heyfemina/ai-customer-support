import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";
import { sendTestEmail } from "../services/emailService.js";

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
    const emailResult = await sendTestEmail(req.body.to);
    success(res, emailResult, "Test email captured by Ethereal");
  } catch (error) { next(error); }
}

export async function testWhatsapp(req, res) {
  success(res, { delivered: true, provider: "WhatsApp API placeholder" }, "WhatsApp test accepted");
}

export async function testChatbot(req, res) {
  success(res, { embedReady: true, provider: "Website chatbot placeholder" }, "Website chatbot test accepted");
}
