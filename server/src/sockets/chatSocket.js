import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

export default function chatSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || token.startsWith("demo-")) return next();
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, name: true, role: true } });
      if (user) socket.user = user;
      next();
    } catch {
      next(new Error("Socket authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join_chat", (chatId) => {
      socket.join(chatId);
      socket.emit("chat_notification", { chatSessionId: chatId, message: "Joined chat room" });
    });
    socket.on("leave_chat", (chatId) => socket.leave(chatId));
    socket.on("send_message", async (payload, callback) => {
      try {
        const senderId = payload.senderId || socket.user?.id;
        if (!senderId || !payload.chatSessionId) throw new Error("senderId and chatSessionId are required");
        const message = await prisma.message.create({
          data: {
            content: payload.content || payload.fileName || "Attachment",
            senderId,
            chatSessionId: payload.chatSessionId,
            fileUrl: payload.fileUrl,
            messageType: payload.messageType || (payload.fileUrl ? "FILE" : "TEXT"),
          },
          include: { sender: { select: { id: true, name: true, role: true } } },
        });
        await prisma.chatSession.update({ where: { id: payload.chatSessionId }, data: { status: "ACTIVE" } });
        io.to(payload.chatSessionId).emit("receive_message", message);
        socket.broadcast.emit("chat_notification", { chatSessionId: payload.chatSessionId, message: "New message" });
        callback?.({ success: true, data: message });
      } catch (error) {
        callback?.({ success: false, message: error.message });
      }
    });
    socket.on("typing", (payload) => socket.to(payload.chatSessionId).emit("typing", payload));
    socket.on("stop_typing", (payload) => socket.to(payload.chatSessionId).emit("stop_typing", payload));
    socket.on("agent_transfer", (payload) => io.to(payload.chatSessionId).emit("agent_transfer", payload));
    socket.on("disconnect", () => {});
  });
}
