import express from "express";
import multer from "multer";
import path from "path";
import protect from "../middleware/authMiddleware.js";
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

// GET /api/employees/dashboard - Statistics widgets
router.get("/dashboard", protect, getDashboard);

// GET /api/employees/export - Export employee directory as CSV
router.get("/export", protect, exportEmployees);

// POST /api/employees/import - Import employees via CSV
router.post("/import", protect, upload.single("file"), importEmployees);

// GET /api/employees/me - Fetch the currently authenticated employee's own profile
router.get("/me", protect, getMyProfile);

// GET /api/employees - Get list of employees with filters, sorting, and pagination
router.get("/", protect, getEmployees);

// GET /api/employees/:id - Fetch details of single employee
router.get("/:id", protect, getEmployeeById);

// POST /api/employees - Add a new employee (Admin only)
router.post("/", protect, upload.array("files", 20), createEmployee);

// PUT /api/employees/:id - Edit an employee profile
router.put("/:id", protect, upload.array("files", 20), updateEmployee);

// DELETE /api/employees/:id - Delete an employee profile (Admin only)
router.delete("/:id", protect, deleteEmployee);

// POST /api/employees/bulk - Perform bulk updates (Activate, Deactivate, Delete)
router.post("/bulk", protect, bulkAction);

// POST /api/employees/:id/reset-password - Reset password (Admin only)
router.post("/:id/reset-password", protect, resetPassword);

// POST /api/employees/:id/documents - Upload multiple documents / images
router.post("/:id/documents", protect, upload.array("files", 20), uploadDocuments);

// DELETE /api/employees/:id/documents/:docId - Delete document
router.delete("/:id/documents/:docId", protect, deleteDocument);

// POST /api/employees/:id/notes - Add notes (Admin only)
router.post("/:id/notes", protect, addNote);

// DELETE /api/employees/:id/notes/:noteId - Delete notes (Admin only)
router.delete("/:id/notes/:noteId", protect, deleteNote);

export default router;
