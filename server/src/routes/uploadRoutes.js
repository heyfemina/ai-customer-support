import { Router } from "express";
import { uploadMultiple, uploadSingle } from "../controllers/uploadController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../services/fileService.js";

const router = Router();

router.post("/", protect, upload.single("file"), uploadSingle);
router.post("/multiple", protect, upload.array("files", 8), uploadMultiple);

export default router;
