import express from "express";
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

// GET /api/projects - Get all projects (or assigned projects if employee)
router.get("/", getProjects);

// GET /api/projects/:id - Get project by ID
router.get("/:id", getProjectById);

// POST /api/projects - Create a project
router.post("/", createProject);

// PUT /api/projects/:id - Update project (including milestones & assigned employees)
router.put("/:id", updateProject);

// POST /api/projects/bulk-delete - Delete multiple projects
router.post("/bulk-delete", bulkDeleteProjects);

// DELETE /api/projects/:id - Delete a project
router.delete("/:id", deleteProject);

// Expenses endpoints
router.post("/:id/expenses", addProjectExpense);
router.put("/:id/expenses/:expenseId", updateProjectExpense);
router.delete("/:id/expenses/:expenseId", deleteProjectExpense);

// Commission endpoint
router.put("/:id/commission", updateProjectCommission);

export default router;
