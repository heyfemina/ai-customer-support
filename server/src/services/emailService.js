import nodemailer from "nodemailer";

function getEmailConfig() {
  return {
    provider: process.env.EMAIL_PROVIDER,
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === "true",
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    fromName: process.env.EMAIL_FROM_NAME || "AI Customer Support",
    fromEmail: process.env.EMAIL_FROM_EMAIL || process.env.EMAIL_USER,
  };
}

function assertEtherealConfig(config) {
  if (config.provider !== "ethereal" || config.host !== "smtp.ethereal.email") {
    const error = new Error("Email testing is restricted to Ethereal SMTP in development.");
    error.statusCode = 400;
    throw error;
  }

  if (!config.user || !config.pass || !config.fromEmail) {
    const error = new Error("Ethereal email configuration is incomplete.");
    error.statusCode = 500;
    throw error;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function createTransporter() {
  const config = getEmailConfig();
  assertEtherealConfig(config);

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
}

export async function sendTestEmail(to) {
  const config = getEmailConfig();
  assertEtherealConfig(config);

  const info = await createTransporter().sendMail({
    from: { name: config.fromName, address: config.fromEmail },
    to: to || config.fromEmail,
    subject: "AI Customer Support test email",
    text: "Ethereal email testing is configured. This message is captured by Ethereal and is not delivered to a real inbox.",
    html: "<p>Ethereal email testing is configured.</p><p>This message is captured by Ethereal and is not delivered to a real inbox.</p>",
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    previewUrl: nodemailer.getTestMessageUrl(info),
  };
}

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const config = getEmailConfig();
  assertEtherealConfig(config);
  const displayName = name || "there";
  const safeDisplayName = escapeHtml(displayName);
  const safeResetUrl = escapeHtml(resetUrl);

  const info = await createTransporter().sendMail({
    from: { name: config.fromName, address: config.fromEmail },
    to,
    subject: "Reset your AI Customer Support password",
    text: [
      `Hi ${displayName},`,
      "",
      "Use this link to reset your password:",
      resetUrl,
      "",
      "This link expires in 1 hour. If you did not request it, you can ignore this email.",
      "",
      "This development email is captured by Ethereal and is not delivered to a real inbox.",
    ].join("\n"),
    html: `
      <p>Hi ${safeDisplayName},</p>
      <p>Use this link to reset your password:</p>
      <p><a href="${safeResetUrl}">${safeResetUrl}</a></p>
      <p>This link expires in 1 hour. If you did not request it, you can ignore this email.</p>
      <p>This development email is captured by Ethereal and is not delivered to a real inbox.</p>
    `,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    previewUrl: nodemailer.getTestMessageUrl(info),
  };
}
