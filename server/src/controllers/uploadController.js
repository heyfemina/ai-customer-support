import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";

function publicFile(file) {
  const fileUrl = `/uploads/${file.filename}`;
  return {
    fileName: file.originalname,
    fileUrl,
    fileType: file.mimetype,
    messageType: file.mimetype.startsWith("image/") ? "IMAGE" : "FILE",
  };
}

export async function uploadSingle(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "File is required" });
    const file = publicFile(req.file);
    let attachment = null;

    if (req.body.ticketId) {
      attachment = await prisma.attachment.create({
        data: {
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          fileType: file.fileType,
          ticketId: req.body.ticketId,
        },
      });
    }

    success(res, { ...file, attachment }, "File uploaded", 201);
  } catch (error) {
    next(error);
  }
}

export async function uploadMultiple(req, res, next) {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ success: false, message: "At least one file is required" });

    const uploaded = [];
    for (const file of files) {
      const item = publicFile(file);
      let attachment = null;
      if (req.body.ticketId) {
        attachment = await prisma.attachment.create({
          data: {
            fileName: item.fileName,
            fileUrl: item.fileUrl,
            fileType: item.fileType,
            ticketId: req.body.ticketId,
          },
        });
      }
      uploaded.push({ ...item, attachment });
    }

    success(res, uploaded, "Files uploaded", 201);
  } catch (error) {
    next(error);
  }
}
