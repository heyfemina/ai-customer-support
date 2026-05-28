import crypto from "crypto";

const fallbackSecret = "development-only-message-encryption-secret";
const version = process.env.ENCRYPTION_VERSION || "v1";
const prefix = `enc:${version}:`;

function getSecret() {
  const secret = process.env.ENCRYPTION_SECRET || process.env.MESSAGE_ENCRYPTION_SECRET || "";
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("ENCRYPTION_SECRET is required in production.");
  }
  return secret || fallbackSecret;
}

function keyMaterial() {
  return crypto.createHash("sha256").update(getSecret()).digest();
}

export function encryptText(text = "") {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(String(text), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${prefix}${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptText(value = "") {
  if (!String(value).startsWith("enc:")) return value;
  const parts = String(value).split(":");
  const payload = parts.slice(2).join(":");
  const [ivText, tagText, encryptedText] = payload.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyMaterial(), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64")), decipher.final()]).toString("utf8");
}

export function safeDecryptText(value = "") {
  try {
    return decryptText(value);
  } catch {
    return "[Unable to decrypt message]";
  }
}

export function encryptionVersion() {
  return version;
}

export function assertEncryptionReady() {
  getSecret();
  return true;
}
