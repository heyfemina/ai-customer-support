import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";
import { generateSupportReply, getAIProviderSettings, saveAIProviderSettings, summarizeSupportTicket, translateText } from "../services/aiService.js";

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

export async function aiReply(req, res, next) {
  try {
    const settings = await prisma.aIConfig.findFirst({ orderBy: { createdAt: "desc" } });
    const result = await generateSupportReply(req.body.message || req.body.text || "", {
      language: req.body.language || req.user?.language,
      customerName: req.body.customerName,
      regionalNotes: settings?.regionalNotes,
      userId: req.user?.id,
    });
    success(res, result);
  } catch (error) {
    next(error);
  }
}

export async function translate(req, res, next) {
  try {
    const translatedText = await translateText(req.body.text || "", req.body.targetLanguage || "English", { userId: req.user?.id });
    success(res, { translatedText, targetLanguage: req.body.targetLanguage });
  } catch (error) {
    next(error);
  }
}

export async function summarizeTicket(req, res, next) {
  try {
    const summary = await summarizeSupportTicket(req.body.text || req.body, { userId: req.user?.id });
    success(res, { summary });
  } catch (error) {
    next(error);
  }
}

export async function getAISettings(req, res, next) {
  try {
    const settings = await prisma.aIConfig.findFirst({ orderBy: { createdAt: "desc" } });
    const provider = await getAIProviderSettings();
    success(res, { ...(settings || {}), ...provider });
  } catch (error) { next(error); }
}

export async function updateAISettings(req, res, next) {
  try {
    const existing = await prisma.aIConfig.findFirst();
    const data = normalizeAISettings(req.body);
    const createData = {
      botName: "Support AI",
      welcomeMessage: "Hello, I can help with tickets, account questions, and hand you to an agent when needed.",
      fallbackMessage: "I am transferring this conversation to a support agent.",
      ...data,
    };
    const settings = existing
      ? await prisma.aIConfig.update({ where: { id: existing.id }, data })
      : await prisma.aIConfig.create({ data: createData });
    const provider = await saveAIProviderSettings(req.body);
    success(res, { ...settings, ...provider }, "AI settings updated");
  } catch (error) { next(error); }
}
