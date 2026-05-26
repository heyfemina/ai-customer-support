export async function sendWhatsappMessage(payload) {
  return { provider: "whatsapp", status: "queued", payload };
}
