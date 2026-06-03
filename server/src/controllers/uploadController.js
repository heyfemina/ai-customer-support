import prisma from "../config/prisma.js";
import { success } from "../utils/responseHandler.js";
import { publicUploadFile } from "../services/fileService.js";

export async function uploadSingle(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "File is required" });
    const file = publicUploadFile(req.file);
    let attachment = null;

    if (req.body.ticketId) {
      attachment = await prisma.attachment.create({
        data: {
          fileName: file.fileName,
          originalName: file.originalName,
          fileUrl: file.fileUrl,
          fileType: file.fileType,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          uploadedById: req.user?.id,
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
      const item = publicUploadFile(file);
      let attachment = null;
      if (req.body.ticketId) {
        attachment = await prisma.attachment.create({
          data: {
            fileName: item.fileName,
            originalName: item.originalName,
            fileUrl: item.fileUrl,
            fileType: item.fileType,
            mimeType: item.mimeType,
            fileSize: item.fileSize,
            uploadedById: req.user?.id,
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
