import express from "express";
import protect from "../middleware/authMiddleware.js";
import { login, updatePassword } from "../controllers/authController.js";

const router = express.Router();

// POST /api/auth/login - User Authentication (Admin & Employee)
router.post("/login", login);

// POST /api/auth/update-password - Change current user password
router.post("/update-password", protect, updatePassword);

export default router;
