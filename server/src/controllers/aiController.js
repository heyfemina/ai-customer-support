import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";

export async function aiReply(req, res) {
  success(res, { reply: "I reviewed your message and can help, or transfer you to a human agent if needed.", isAI: true });
}

export async function translate(req, res) {
  success(res, { translatedText: req.body.text, targetLanguage: req.body.targetLanguage });
}

export async function summarizeTicket(req, res) {
  success(res, { summary: "Customer needs support follow-up. Priority, category, and latest reply are included in the ticket timeline." });
}

export async function getAISettings(req, res, next) {
  try {
    const settings = await prisma.aIConfig.findFirst({ orderBy: { createdAt: "desc" } });
    success(res, settings);
  } catch (error) { next(error); }
}

export async function updateAISettings(req, res, next) {
  try {
    const existing = await prisma.aIConfig.findFirst();
    const settings = existing
      ? await prisma.aIConfig.update({ where: { id: existing.id }, data: req.body })
      : await prisma.aIConfig.create({ data: req.body });
    success(res, settings, "AI settings updated");
  } catch (error) { next(error); }
}
