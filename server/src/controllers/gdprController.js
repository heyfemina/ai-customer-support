import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";

async function exportUserData(userId) {
  const [profile, tickets, chats, messages, activityLogs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true, language: true, isActive: true, twoFactorOn: true, createdAt: true, updatedAt: true } }),
    prisma.ticket.findMany({ where: { customerId: userId }, include: { attachments: true, messages: true } }),
    prisma.chatSession.findMany({ where: { customerId: userId }, include: { messages: true } }),
    prisma.message.findMany({ where: { senderId: userId } }),
    prisma.activityLog.findMany({ where: { userId } }),
  ]);
  return { exportedAt: new Date().toISOString(), profile, tickets, chatSessions: chats, messages, activityLogs };
}

export async function requestExport(req, res, next) {
  try {
    const userId = req.body.userId || req.user.id;
    if (req.user.role !== "ADMIN" && userId !== req.user.id) return res.status(403).json({ success: false, message: "Access denied" });
    const request = await prisma.gDPRRequest.create({ data: { userId, requestedById: req.user.id, type: "EXPORT", reason: req.body.reason } });
    await prisma.activityLog.create({ data: { userId: req.user.id, action: `GDPR export requested for ${userId}`, ipAddress: req.ip } });
    success(res, request, "Export request created", 201);
  } catch (error) { next(error); }
}

export async function exportData(req, res, next) {
  try {
    if (req.user.role !== "ADMIN" && req.params.userId !== req.user.id) return res.status(403).json({ success: false, message: "Access denied" });
    await prisma.activityLog.create({ data: { userId: req.user.id, action: `GDPR data exported for ${req.params.userId}`, ipAddress: req.ip } });
    success(res, await exportUserData(req.params.userId));
  } catch (error) { next(error); }
}

export async function requestDelete(req, res, next) {
  try {
    const userId = req.body.userId || req.user.id;
    if (req.user.role !== "ADMIN" && userId !== req.user.id) return res.status(403).json({ success: false, message: "Access denied" });
    const request = await prisma.gDPRRequest.create({ data: { userId, requestedById: req.user.id, type: "DELETE", reason: req.body.reason } });
    await prisma.activityLog.create({ data: { userId: req.user.id, action: `GDPR delete requested for ${userId}`, ipAddress: req.ip } });
    success(res, request, "Deletion request created", 201);
  } catch (error) { next(error); }
}

export async function getGDPRRequests(req, res, next) {
  try {
    success(res, await prisma.gDPRRequest.findMany({ include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "desc" } }));
  } catch (error) { next(error); }
}

export async function approveRequest(req, res, next) {
  try {
    const request = await prisma.gDPRRequest.update({ where: { id: req.params.id }, data: { status: "APPROVED", reviewedById: req.user.id, adminNote: req.body.adminNote } });
    await prisma.activityLog.create({ data: { userId: req.user.id, action: `GDPR request approved ${request.id}`, ipAddress: req.ip } });
    success(res, request, "GDPR request approved");
  } catch (error) { next(error); }
}

export async function rejectRequest(req, res, next) {
  try {
    const request = await prisma.gDPRRequest.update({ where: { id: req.params.id }, data: { status: "REJECTED", reviewedById: req.user.id, adminNote: req.body.adminNote } });
    await prisma.activityLog.create({ data: { userId: req.user.id, action: `GDPR request rejected ${request.id}`, ipAddress: req.ip } });
    success(res, request, "GDPR request rejected");
  } catch (error) { next(error); }
}

export async function anonymizeUser(req, res, next) {
  try {
    const anonymousEmail = `anonymous-${req.params.userId}@deleted.local`;
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { name: "Deleted User", email: anonymousEmail, isActive: false },
      select: { id: true, name: true, email: true, isActive: true },
    });
    await prisma.activityLog.create({ data: { userId: req.user.id, action: `User anonymized ${req.params.userId}`, ipAddress: req.ip } });
    success(res, user, "User anonymized");
  } catch (error) { next(error); }
}
