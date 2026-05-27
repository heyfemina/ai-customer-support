import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import prisma from "../config/prisma.js";
import generateToken from "../utils/generateToken.js";
import { success } from "../utils/responseHandler.js";
import { sendPasswordResetEmail } from "../services/emailService.js";

const publicUser = { id: true, name: true, email: true, role: true, language: true, isActive: true, twoFactorOn: true, createdAt: true };

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["ADMIN", "AGENT", "CUSTOMER"]).default("CUSTOMER"),
    language: z.string().default("en"),
  }),
});

export const loginSchema = z.object({
  body: z.object({ email: z.string().email(), password: z.string().min(6) }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({ email: z.string().email() }),
});

export const resetPasswordSchema = z.object({
  params: z.object({ token: z.string().min(32) }),
  body: z.object({ password: z.string().min(6) }),
});

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function isMissingPasswordResetColumns(error) {
  return error.code === "P2022" && String(error.message).includes("resetPassword");
}

function isDatabaseConnectionError(error) {
  return error.code === "P1001" || String(error.message).includes("Can't reach database server");
}

function passwordResetSetupError(res) {
  return res.status(500).json({
    success: false,
    message: 'Password reset setup is incomplete. Run the Supabase SQL to add "resetPasswordToken" and "resetPasswordExpires" columns.',
  });
}

function passwordResetDatabaseError(res) {
  return res.status(503).json({
    success: false,
    message: "Database is temporarily unreachable. Restart the backend or try again in a moment.",
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withDatabaseRetry(operation) {
  try {
    return await operation();
  } catch (error) {
    if (!isDatabaseConnectionError(error)) throw error;
    await wait(600);
    return operation();
  }
}

export async function register(req, res, next) {
  try {
    const { name, email, password, role, language } = req.body;
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return res.status(409).json({ success: false, message: "Email already registered" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, password: hashed, role, language }, select: publicUser });
    await prisma.activityLog.create({ data: { userId: user.id, action: "Registered account", ipAddress: req.ip } });
    success(res, { user, token: generateToken(user) }, "Registered successfully", 201);
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        language: true,
        isActive: true,
        twoFactorOn: true,
        createdAt: true,
      },
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    await prisma.activityLog.create({ data: { userId: user.id, action: "Logged in", ipAddress: req.ip } });
    const { password: _, ...safeUser } = user;
    success(res, { user: safeUser, token: generateToken(user) }, "Logged in successfully");
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await withDatabaseRetry(() =>
      prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } })
    );

    if (!user) {
      if (process.env.EMAIL_PROVIDER === "ethereal") {
        return success(
          res,
          { accountFound: false },
          "No account found for this email. Create an account first, then request a reset link."
        );
      }

      return success(res, null, "If that email exists, a password reset link has been sent.");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const resetPasswordToken = hashResetToken(token);
    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);

    await withDatabaseRetry(() =>
      prisma.user.update({
        where: { id: user.id },
        data: { resetPasswordToken, resetPasswordExpires },
      })
    );

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl.replace(/\/$/, "")}/reset-password/${token}`;
    const emailResult = await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });

    await prisma.activityLog.create({ data: { userId: user.id, action: "Requested password reset", ipAddress: req.ip } });
    success(res, { accountFound: true, previewUrl: emailResult.previewUrl }, "Password reset link sent");
  } catch (error) {
    if (isMissingPasswordResetColumns(error)) return passwordResetSetupError(res);
    if (isDatabaseConnectionError(error)) return passwordResetDatabaseError(res);
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const resetPasswordToken = hashResetToken(req.params.token);
    const user = await withDatabaseRetry(() =>
      prisma.user.findFirst({
        where: {
          resetPasswordToken,
          resetPasswordExpires: { gt: new Date() },
        },
      })
    );

    if (!user) {
      return res.status(400).json({ success: false, message: "Password reset link is invalid or expired" });
    }

    const hashed = await bcrypt.hash(req.body.password, 10);
    await withDatabaseRetry(() =>
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashed,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      })
    );

    await prisma.activityLog.create({ data: { userId: user.id, action: "Reset password", ipAddress: req.ip } });
    success(res, null, "Password reset successfully");
  } catch (error) {
    if (isMissingPasswordResetColumns(error)) return passwordResetSetupError(res);
    if (isDatabaseConnectionError(error)) return passwordResetDatabaseError(res);
    next(error);
  }
}

export async function profile(req, res) {
  success(res, req.user);
}

export async function updateProfile(req, res, next) {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name: req.body.name, language: req.body.language, twoFactorOn: req.body.twoFactorOn },
      select: publicUser,
    });
    success(res, user, "Profile updated");
  } catch (error) {
    next(error);
  }
}
