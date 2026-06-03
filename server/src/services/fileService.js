import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const uploadDir = path.join(process.cwd(), "uploads", "tickets");
const maxFileSize = 10 * 1024 * 1024;
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx"]);
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

function safeBaseName(name = "file") {
  return path.basename(name).replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "file";
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeBaseName(file.originalname)}${extension}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: maxFileSize, files: 8 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(file.mimetype)) {
      const error = new Error("Only JPG, PNG, WEBP, PDF, DOC, and DOCX files up to 10MB are allowed.");
      error.statusCode = 400;
      cb(error);
      return;
    }
    cb(null, true);
  },
});

export function publicUploadFile(file) {
  return {
    fileName: file.filename,
    originalName: file.originalname,
    fileUrl: `/uploads/tickets/${file.filename}`,
    fileType: path.extname(file.originalname).replace(".", "").toLowerCase(),
    mimeType: file.mimetype,
    fileSize: file.size,
    messageType: file.mimetype.startsWith("image/") ? "IMAGE" : "FILE",
  };
}
