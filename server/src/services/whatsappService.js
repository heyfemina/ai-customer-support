export async function sendWhatsappMessage(payload) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = payload.to || process.env.WHATSAPP_TEST_TO;
  if (!accessToken || !phoneNumberId || !to) {
    return {
      provider: "whatsapp",
      status: "credentials_required",
      message: "Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_TEST_TO for live WhatsApp testing.",
      payload,
    };
  }
  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: payload.message || "AI Customer Support WhatsApp test message" },
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `WhatsApp request failed with ${response.status}`);
  return { provider: "whatsapp", status: "sent", data };
}
