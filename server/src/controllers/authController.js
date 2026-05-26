import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../config/prisma.js";
import generateToken from "../utils/generateToken.js";
import { success } from "../utils/responseHandler.js";

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

export async function register(req, res, next) {
  try {
    const { name, email, password, role, language } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
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
    const user = await prisma.user.findUnique({ where: { email } });
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
