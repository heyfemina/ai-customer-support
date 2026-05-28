import { Router } from "express";
import { createBackupNow, deleteBackup, downloadBackup, getBackups } from "../controllers/backupController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(protect, authorize("ADMIN"));
router.post("/create", createBackupNow);
router.get("/", getBackups);
router.get("/:id/download", downloadBackup);
router.delete("/:id", deleteBackup);

export default router;
