import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";

const select = { id: true, name: true, email: true, role: true, language: true, isActive: true, twoFactorOn: true, department: true, categories: true, agentStatus: true, maxActiveChats: true, createdAt: true, updatedAt: true };
const manageableRoles = new Set(["AGENT", "CUSTOMER"]);

function normalizeManagedUserPayload(body, editing = false) {
  const data = { ...body };
  if (!manageableRoles.has(data.role)) data.role = editing ? undefined : "CUSTOMER";
  if (data.role === undefined) delete data.role;
  if (data.role === "CUSTOMER") {
    data.department = "General Support";
    data.categories = ["General"];
    data.agentStatus = "OFFLINE";
    data.maxActiveChats = 0;
  }
  if (data.role === "AGENT") {
    data.department = data.department || "General Support";
    data.categories = Array.isArray(data.categories) && data.categories.length ? data.categories : ["General"];
    data.agentStatus = data.agentStatus || "ONLINE";
    data.maxActiveChats = Number(data.maxActiveChats) || 3;
  }
  return data;
}

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
    const payload = normalizeManagedUserPayload(req.body);
    if (!manageableRoles.has(payload.role)) return res.status(400).json({ success: false, message: "Admin panel can create only agents or customers." });
    const hashed = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.create({ data: { ...payload, password: hashed }, select });
    success(res, user, "User created", 201);
  } catch (error) { next(error); }
}

export async function updateUser(req, res, next) {
  try {
    const current = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true } });
    if (!current) return res.status(404).json({ success: false, message: "User not found" });
    if (current.role === "ADMIN") return res.status(403).json({ success: false, message: "The seed admin account cannot be edited from user management." });
    const data = normalizeManagedUserPayload(req.body, true);
    if (data.password) data.password = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.update({ where: { id: req.params.id }, data, select });
    success(res, user, "User updated");
  } catch (error) { next(error); }
}

export async function deleteUser(req, res, next) {
  try {
    const current = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true } });
    if (current?.role === "ADMIN") return res.status(403).json({ success: false, message: "The seed admin account cannot be deactivated." });
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    success(res, null, "User deactivated");
  } catch (error) { next(error); }
}
