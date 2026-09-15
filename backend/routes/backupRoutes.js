import express from "express";
import multer from "multer";
import protect from "../middleware/authMiddleware.js";
import adminOnly from "../middleware/adminOnly.js";
import { exportBackup, importBackup } from "../controllers/backupController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/backup/export?type=full|clients|invoices|services|config
router.get("/export", protect, adminOnly, exportBackup);

// POST /api/backup/import - Upload JSON file or ZIP backup file to restore database
router.post("/import", protect, adminOnly, upload.single("backupFile"), importBackup);

export default router;
