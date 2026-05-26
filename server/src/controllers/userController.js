import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";

const select = { id: true, name: true, email: true, role: true, language: true, isActive: true, twoFactorOn: true, createdAt: true, updatedAt: true };

export async function getUsers(req, res, next) {
  try {
    success(res, await prisma.user.findMany({ select, orderBy: { createdAt: "desc" } }));
  } catch (error) { next(error); }
}

export async function getUser(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    success(res, user);
  } catch (error) { next(error); }
}

export async function createUser(req, res, next) {
  try {
    const hashed = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.create({ data: { ...req.body, password: hashed }, select });
    success(res, user, "User created", 201);
  } catch (error) { next(error); }
}

export async function updateUser(req, res, next) {
  try {
    const data = { ...req.body };
    if (data.password) data.password = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.update({ where: { id: req.params.id }, data, select });
    success(res, user, "User updated");
  } catch (error) { next(error); }
}

export async function deleteUser(req, res, next) {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    success(res, null, "User deactivated");
  } catch (error) { next(error); }
}
