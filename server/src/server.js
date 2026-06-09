import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDatabase } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import integrationRoutes from "./routes/integrationRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import backupRoutes from "./routes/backupRoutes.js";
import gdprRoutes from "./routes/gdprRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import widgetRoutes from "./routes/widgetRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import internalChatRoutes from "./routes/internalChatRoutes.js";
import { health } from "./controllers/healthController.js";
import { widgetScript } from "./controllers/widgetController.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import chatSocket from "./sockets/chatSocket.js";
import { assertEncryptionReady } from "./utils/encryption.js";

const localClientUrls = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
];
const configuredClientUrls = (process.env.CLIENT_URLS || process.env.CLIENT_URL || localClientUrls.join(","))
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);
const allowedOrigins = Array.from(new Set([...configuredClientUrls, ...localClientUrls]));
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, "");
    return allowedOrigins.includes(normalizedOrigin)
      ? callback(null, true)
      : callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
};

const app = express();
assertEncryptionReady();
const server = createServer(app);
const io = new Server(server, { cors: corsOptions });

app.set("io", io);
app.set("startedAt", new Date().toISOString());
app.set("activeSocketConnections", () => io.engine.clientsCount || 0);
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (req, res) => res.json({ success: true, message: "AI Customer Support API running" }));
app.get("/api/health", health);
app.get("/widget.js", widgetScript);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/activity-logs", activityRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/backups", backupRoutes);
app.use("/api/gdpr", gdprRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/widget", widgetRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/internal-chats", internalChatRoutes);

app.use(notFound);
app.use(errorHandler);
chatSocket(io);

const PORT = process.env.PORT || 5000;
connectDatabase()
  .then(() => {
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Stop the existing backend process or set a different PORT in server/.env.`);
        process.exit(1);
      }
      throw error;
    });
    server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => {
    console.error("Database connection failed", error);
    process.exit(1);
  });
