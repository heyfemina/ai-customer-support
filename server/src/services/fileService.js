import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`),
});

export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = [".png", ".jpg", ".jpeg", ".gif", ".pdf", ".doc", ".docx", ".txt"];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});
