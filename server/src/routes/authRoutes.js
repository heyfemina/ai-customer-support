import { Router } from "express";
import {
  forgotPassword,
  forgotPasswordSchema,
  login,
  loginSchema,
  profile,
  register,
  registerSchema,
  resetPassword,
  resetPasswordSchema,
  updateProfile,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";

const router = Router();
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password/:token", validate(resetPasswordSchema), resetPassword);
router.get("/profile", protect, profile);
router.put("/profile", protect, updateProfile);
export default router;
