import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";

export async function getActivityLogs(req, res, next) {
  try {
    success(res, await prisma.activityLog.findMany({ include: { user: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: "desc" } }));
  } catch (error) { next(error); }
}
