import nodemailer from "nodemailer";

export function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

export async function sendTestEmail(to) {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes("your_email")) return { skipped: true };
  return createTransporter().sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "AI Customer Support test email",
    text: "Email integration is configured.",
  });
}
