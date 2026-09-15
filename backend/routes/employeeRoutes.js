import express from "express";
import multer from "multer";
import path from "path";
import protect from "../middleware/authMiddleware.js";
import adminOnly from "../middleware/adminOnly.js";
import {
  getDashboard,
  exportEmployees,
  importEmployees,
  getEmployees,
  getMyProfile,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  bulkAction,
  resetPassword,
  uploadDocuments,
  deleteDocument,
  addNote,
  deleteNote,
} from "../controllers/employeeController.js";

const router = express.Router();

// Multer Disk Storage Configuration for Employee Documents and CSV Importer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `empdoc-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// GET /api/employees/dashboard - Statistics widgets (Admin only)
router.get("/dashboard", protect, adminOnly, getDashboard);

// GET /api/employees/export - Export employee directory as CSV (Admin only)
router.get("/export", protect, adminOnly, exportEmployees);

// POST /api/employees/import - Import employees via CSV (Admin only)
router.post("/import", protect, adminOnly, upload.single("file"), importEmployees);

// GET /api/employees/me - Fetch the currently authenticated employee's own profile
router.get("/me", protect, getMyProfile);

// GET /api/employees - Get list of employees (Admin only)
router.get("/", protect, adminOnly, getEmployees);

// GET /api/employees/:id - Fetch details of single employee (Admin or own profile)
router.get("/:id", protect, getEmployeeById);

// POST /api/employees - Add a new employee (Admin only)
router.post("/", protect, adminOnly, upload.array("files", 20), createEmployee);

// PUT /api/employees/:id - Edit an employee profile (Admin only)
router.put("/:id", protect, adminOnly, upload.array("files", 20), updateEmployee);

// DELETE /api/employees/:id - Delete an employee profile (Admin only)
router.delete("/:id", protect, adminOnly, deleteEmployee);

// POST /api/employees/bulk - Perform bulk updates (Admin only)
router.post("/bulk", protect, adminOnly, bulkAction);

// POST /api/employees/:id/reset-password - Reset password (Admin only)
router.post("/:id/reset-password", protect, adminOnly, resetPassword);

// POST /api/employees/:id/documents - Upload multiple documents / images
router.post("/:id/documents", protect, upload.array("files", 20), uploadDocuments);

// DELETE /api/employees/:id/documents/:docId - Delete document
router.delete("/:id/documents/:docId", protect, deleteDocument);

// POST /api/employees/:id/notes - Add notes (Admin only)
router.post("/:id/notes", protect, adminOnly, addNote);

// DELETE /api/employees/:id/notes/:noteId - Delete notes (Admin only)
router.delete("/:id/notes/:noteId", protect, adminOnly, deleteNote);

export default router;
