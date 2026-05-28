import { Router } from "express";
import {
  forgotPassword,
  forgotPasswordSchema,
  disable2FA,
  enable2FA,
  generateRecoveryCodes,
  login,
  loginSchema,
  profile,
  register,
  registerSchema,
  resend2FA,
  resetPassword,
  resetPasswordSchema,
  useRecoveryCode,
  verify2FA,
  updateProfile,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";

const router = Router();
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/verify-2fa", verify2FA);
router.post("/resend-2fa", resend2FA);
router.post("/use-recovery-code", useRecoveryCode);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password/:token", validate(resetPasswordSchema), resetPassword);
router.get("/profile", protect, profile);
router.put("/profile", protect, updateProfile);
router.post("/enable-2fa", protect, enable2FA);
router.post("/disable-2fa", protect, disable2FA);
router.post("/generate-recovery-codes", protect, generateRecoveryCodes);
export default router;
