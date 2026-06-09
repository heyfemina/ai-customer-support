import { Router } from "express";
import { search } from "../controllers/searchController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();
router.use(protect);
router.get("/", search);

export default router;
