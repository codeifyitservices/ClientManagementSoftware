import express from "express";
import multer from "multer";
import path from "path";
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  addLeadJourneyStage,
  updateLeadJourneyStage,
  deleteLeadJourneyStage,
  deleteLead,
  bulkDeleteLeads,
} from "../controllers/leadController.js";

const router = express.Router();

// Multer Disk Storage Configuration for Lead Journey Attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `lead-att-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOCX, XLSX, and Image files are allowed."));
    }
  },
});

// GET /api/leads - Get all leads
router.get("/", getLeads);

// GET /api/leads/:id - Get lead details
router.get("/:id", getLeadById);

// POST /api/leads - Create a lead
router.post("/", createLead);

// PUT /api/leads/:id - Update core lead details
router.put("/:id", updateLead);

// POST /api/leads/:id/journey - Add a new journey stage update (with optional attachments)
router.post("/:id/journey", upload.array("files", 10), addLeadJourneyStage);

// PUT /api/leads/:id/journey/:stageId - Update only the most recent stage update
router.put("/:id/journey/:stageId", upload.array("files", 10), updateLeadJourneyStage);

// DELETE /api/leads/:id/journey/:stageId - Delete only the most recent stage update
router.delete("/:id/journey/:stageId", deleteLeadJourneyStage);

// POST /api/leads/bulk-delete - Delete multiple leads
router.post("/bulk-delete", bulkDeleteLeads);

// DELETE /api/leads/:id - Delete a lead profile
router.delete("/:id", deleteLead);

export default router;
