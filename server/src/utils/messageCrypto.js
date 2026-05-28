import { decryptText, encryptText, safeDecryptText } from "./encryption.js";

export function encryptMessageContent(content = "") {
  return encryptText(content);
}

export function decryptMessageContent(content = "") {
  return safeDecryptText(content);
}

export { decryptText, encryptText, safeDecryptText };
