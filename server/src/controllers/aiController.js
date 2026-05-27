import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";

const supportedLanguageCodes = ["en", "it", "es", "fr"];

function normalizeAISettings(body) {
  const supportedLanguages = Array.isArray(body.supportedLanguages)
    ? body.supportedLanguages.filter((code) => supportedLanguageCodes.includes(code))
    : undefined;

  return {
    ...(body.botName !== undefined ? { botName: body.botName } : {}),
    ...(body.welcomeMessage !== undefined ? { welcomeMessage: body.welcomeMessage } : {}),
    ...(body.fallbackMessage !== undefined ? { fallbackMessage: body.fallbackMessage } : {}),
    ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
    ...(body.autoTranslate !== undefined ? { autoTranslate: Boolean(body.autoTranslate) } : {}),
    ...(body.handoffAfterFailedReplies !== undefined ? { handoffAfterFailedReplies: Number(body.handoffAfterFailedReplies) || 2 } : {}),
    ...(supportedLanguages ? { supportedLanguages: supportedLanguages.length ? supportedLanguages : supportedLanguageCodes } : {}),
    ...(body.regionalNotes !== undefined ? { regionalNotes: body.regionalNotes } : {}),
    ...(body.regionalProfiles !== undefined ? { regionalProfiles: body.regionalProfiles || {} } : {}),
  };
}

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
    const data = normalizeAISettings(req.body);
    const settings = existing
      ? await prisma.aIConfig.update({ where: { id: existing.id }, data })
      : await prisma.aIConfig.create({ data });
    success(res, settings, "AI settings updated");
  } catch (error) { next(error); }
}
