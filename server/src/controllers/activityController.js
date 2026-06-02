import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";

export async function getActivityLogs(req, res, next) {
  try {
    const { userId, role, search, action, dateFrom, dateTo } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: "insensitive" };
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
      };
    }
    if (role || search) {
      where.user = {
        is: {
          ...(role ? { role } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
      };
    }
    success(res, await prisma.activityLog.findMany({ where, include: { user: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: "desc" } }));
  } catch (error) { next(error); }
}
