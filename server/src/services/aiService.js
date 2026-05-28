import crypto from "crypto";
import OpenAI from "openai";
import prisma from "../config/prisma.js";

const AI_PROVIDER_TYPE = "AI_PROVIDER";
const defaultOpenAIModel = "gpt-5.4-mini";
const defaultGeminiModel = "gemini-2.5-flash";
const fallbackReply = "I can help with that. If this needs account-specific action, I can transfer you to a human agent.";

function aiDisabled() {
  return String(process.env.AI_DISABLED || "").toLowerCase() === "true";
}

function keyMaterial() {
  return crypto.createHash("sha256").update(process.env.API_KEY_ENCRYPTION_SECRET || process.env.JWT_SECRET || "local-dev-secret").digest();
}

function encryptSecret(value) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

function decryptSecret(value) {
  if (!value) return "";
  const [ivText, tagText, encryptedText] = value.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyMaterial(), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64")), decipher.final()]).toString("utf8");
}

function maskKey(key) {
  return key ? `****${key.slice(-4)}` : "";
}

function getEnvApiKey(provider) {
  if (provider === "openai") return process.env.OPENAI_API_KEY || process.env.API_KEY || "";
  if (provider === "gemini") return process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  return process.env.API_KEY || "";
}

function defaultModelForProvider(provider) {
  return provider === "openai" ? defaultOpenAIModel : defaultGeminiModel;
}

async function logAIUsage({ provider, model, endpoint, success = true, errorMessage = "", tokensIn = 0, tokensOut = 0, userId = null }) {
  try {
    await prisma.aIUsageLog.create({ data: { provider, model, endpoint, success, errorMessage, tokensIn, tokensOut, userId } });
  } catch {
    // Usage logging should never break customer support flows.
  }
}

export async function getAIProviderSettings() {
  const saved = await prisma.integrationSetting.findUnique({ where: { type: AI_PROVIDER_TYPE } });
  const config = saved?.config || {};
  const provider = config.apiProvider || process.env.AI_PROVIDER || process.env.API_PROVIDER || "openai";
  const envKey = getEnvApiKey(provider);
  const disabled = aiDisabled();
  return {
    apiProvider: provider,
    model: config.model || process.env.OPENAI_MODEL || process.env.MODEL || defaultModelForProvider(provider),
    apiKeyEnabled: disabled ? false : config.apiKeyEnabled ?? Boolean(envKey),
    apiKeyMasked: config.apiKeyLast4 ? `****${config.apiKeyLast4}` : maskKey(envKey),
    hasApiKey: !disabled && Boolean(config.encryptedApiKey || envKey),
  };
}

export async function saveAIProviderSettings(body = {}) {
  const current = await prisma.integrationSetting.findUnique({ where: { type: AI_PROVIDER_TYPE } });
  const currentConfig = current?.config || {};
  const apiProvider = body.apiProvider || currentConfig.apiProvider || process.env.AI_PROVIDER || "openai";
  const nextConfig = {
    ...currentConfig,
    apiProvider,
    model: body.model || currentConfig.model || process.env.OPENAI_MODEL || process.env.MODEL || defaultModelForProvider(apiProvider),
    apiKeyEnabled: body.apiKeyEnabled !== undefined ? Boolean(body.apiKeyEnabled) : currentConfig.apiKeyEnabled ?? true,
  };

  if (body.removeApiKey) {
    delete nextConfig.encryptedApiKey;
    delete nextConfig.apiKeyLast4;
  }

  if (body.apiKey?.trim()) {
    const apiKey = body.apiKey.trim();
    nextConfig.encryptedApiKey = encryptSecret(apiKey);
    nextConfig.apiKeyLast4 = apiKey.slice(-4);
  }

  await prisma.integrationSetting.upsert({
    where: { type: AI_PROVIDER_TYPE },
    update: { config: nextConfig, isActive: nextConfig.apiKeyEnabled },
    create: { type: AI_PROVIDER_TYPE, config: nextConfig, isActive: nextConfig.apiKeyEnabled },
  });

  return getAIProviderSettings();
}

async function getRuntimeProviderConfig() {
  const saved = await prisma.integrationSetting.findUnique({ where: { type: AI_PROVIDER_TYPE } });
  const config = saved?.config || {};
  const apiProvider = config.apiProvider || process.env.AI_PROVIDER || process.env.API_PROVIDER || "openai";
  if (aiDisabled()) {
    return {
      apiProvider,
      model: config.model || process.env.OPENAI_MODEL || process.env.MODEL || defaultModelForProvider(apiProvider),
      apiKeyEnabled: false,
      apiKey: "",
    };
  }
  return {
    apiProvider,
    model: config.model || process.env.OPENAI_MODEL || process.env.MODEL || defaultModelForProvider(apiProvider),
    apiKeyEnabled: config.apiKeyEnabled ?? true,
    apiKey: config.encryptedApiKey ? decryptSecret(config.encryptedApiKey) : getEnvApiKey(apiProvider),
  };
}

function extractGeminiText(data) {
  return data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "";
}

async function callGemini(prompt, endpoint, userId) {
  const { apiProvider, model, apiKeyEnabled, apiKey } = await getRuntimeProviderConfig();
  if (apiProvider !== "gemini" || !apiKeyEnabled || !apiKey) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, topP: 0.9, maxOutputTokens: 700 },
      }),
    });
    if (!response.ok) throw new Error(`Gemini request failed: ${response.status} ${await response.text()}`);
    const text = extractGeminiText(await response.json());
    await logAIUsage({ provider: "gemini", model, endpoint, userId, tokensIn: prompt.length, tokensOut: text.length });
    return text;
  } catch (error) {
    await logAIUsage({ provider: "gemini", model, endpoint, userId, success: false, errorMessage: error.message });
    return null;
  }
}

async function callOpenAI(prompt, endpoint, userId) {
  const { apiProvider, model, apiKeyEnabled, apiKey } = await getRuntimeProviderConfig();
  if (apiProvider !== "openai" || !apiKeyEnabled || !apiKey) return null;
  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model,
      input: prompt,
      max_output_tokens: 700,
      temperature: 0.4,
    });
    const text = response.output_text?.trim() || "";
    await logAIUsage({
      provider: "openai",
      model,
      endpoint,
      userId,
      tokensIn: response.usage?.input_tokens || prompt.length,
      tokensOut: response.usage?.output_tokens || text.length,
    });
    return text;
  } catch (error) {
    await logAIUsage({ provider: "openai", model, endpoint, userId, success: false, errorMessage: error.message });
    try {
      await prisma.systemAlert.create({
        data: { type: "AI_FAILURE", severity: "WARNING", title: "AI provider request failed", message: error.message.slice(0, 500) },
      });
    } catch {}
    return null;
  }
}

async function callActiveProvider(prompt, endpoint = "reply", userId = null) {
  const { apiProvider } = await getRuntimeProviderConfig();
  if (apiProvider === "openai") return callOpenAI(prompt, endpoint, userId);
  if (apiProvider === "gemini") return callGemini(prompt, endpoint, userId);
  return null;
}

function parseJsonObject(text, fallback) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : text);
  } catch {
    return fallback;
  }
}

export async function generateSupportReply(message, context = {}) {
  const prompt = [
    "You are a helpful AI customer support bot.",
    "Return only JSON with keys: reply, transferToAgent, category, priority.",
    "priority must be LOW, MEDIUM, HIGH, or URGENT.",
    "transferToAgent is true only when billing, legal, security, account-specific, angry customer, or explicit human/agent transfer is needed.",
    `Customer language: ${context.language || "English"}.`,
    context.customerName ? `Customer name: ${context.customerName}.` : "",
    context.regionalNotes ? `Regional instructions: ${context.regionalNotes}` : "",
    `Customer message: ${message}`,
  ].filter(Boolean).join("\n");

  const aiText = await callActiveProvider(prompt, "reply", context.userId);
  const parsed = parseJsonObject(aiText || "", {
    reply: aiText || fallbackReply,
    transferToAgent: /\b(agent|human|representative|billing|refund|legal|security)\b/i.test(message),
    category: "General",
    priority: "MEDIUM",
  });
  return {
    reply: parsed.reply || fallbackReply,
    transferToAgent: Boolean(parsed.transferToAgent),
    category: parsed.category || "General",
    priority: ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(parsed.priority) ? parsed.priority : "MEDIUM",
  };
}

export async function translateText(text, targetLanguage = "English", context = {}) {
  if (!text) return "";
  const prompt = `Translate this support message to ${targetLanguage}. Return only the translation.\n\n${text}`;
  return (await callActiveProvider(prompt, "translate", context.userId)) || text;
}

export async function summarizeSupportTicket(input, context = {}) {
  const text = typeof input === "string" ? input : [
    `Subject: ${input.subject || ""}`,
    `Description: ${input.description || ""}`,
    `Messages: ${JSON.stringify(input.messages || [])}`,
  ].join("\n");
  const prompt = `Summarize this support ticket for an agent in 3 concise bullet points and include likely category and priority.\n\n${text}`;
  return (await callActiveProvider(prompt, "summarize-ticket", context.userId)) || "Customer needs support follow-up. Review the ticket timeline for priority, category, and latest reply.";
}

export async function decideTransferToAgent(message, context = {}) {
  const result = await generateSupportReply(message, context);
  return { transferToAgent: result.transferToAgent, category: result.category, priority: result.priority };
}
