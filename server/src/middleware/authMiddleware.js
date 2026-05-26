import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : null;
    if (!token) return res.status(401).json({ success: false, message: "Authentication required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, name: true, email: true, role: true, language: true, isActive: true } });
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: "Invalid or inactive user" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
}
