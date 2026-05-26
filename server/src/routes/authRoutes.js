import { Router } from "express";
import { login, loginSchema, profile, register, registerSchema, updateProfile } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";

const router = Router();
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/profile", protect, profile);
router.put("/profile", protect, updateProfile);
export default router;
