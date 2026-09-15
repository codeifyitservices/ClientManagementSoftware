import express from "express";
import adminOnly from "../middleware/adminOnly.js";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  bulkDeleteProjects,
  deleteProject,
  addProjectExpense,
  updateProjectExpense,
  deleteProjectExpense,
  updateProjectCommission,
} from "../controllers/projectController.js";

const router = express.Router();

// GET /api/projects - Get all projects (Admin only)
router.get("/", adminOnly, getProjects);

// GET /api/projects/:id - Get project by ID (Admin only)
router.get("/:id", adminOnly, getProjectById);

// POST /api/projects - Create a project (Admin only)
router.post("/", adminOnly, createProject);

// PUT /api/projects/:id - Update project (Admin only)
router.put("/:id", adminOnly, updateProject);

// POST /api/projects/bulk-delete - Delete multiple projects (Admin only)
router.post("/bulk-delete", adminOnly, bulkDeleteProjects);

// DELETE /api/projects/:id - Delete a project (Admin only)
router.delete("/:id", adminOnly, deleteProject);

// Expenses endpoints (Admin only)
router.post("/:id/expenses", adminOnly, addProjectExpense);
router.put("/:id/expenses/:expenseId", adminOnly, updateProjectExpense);
router.delete("/:id/expenses/:expenseId", adminOnly, deleteProjectExpense);

// Commission endpoint (Admin only)
router.put("/:id/commission", adminOnly, updateProjectCommission);

export default router;
