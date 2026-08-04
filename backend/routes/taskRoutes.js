import express from "express";
import multer from "multer";
import path from "path";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  addComment,
} from "../controllers/taskController.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `taskdoc-${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// GET /api/tasks - Fetch all tasks (filtered by role)
router.get("/", getTasks);

// GET /api/tasks/:id - Fetch single task details
router.get("/:id", getTaskById);

// POST /api/tasks - Create a task (Admin only)
router.post("/", upload.array("files", 10), createTask);

// PUT /api/tasks/:id - Update task (Admin edits all, Employee edits status only)
router.put("/:id", upload.array("files", 10), updateTask);

// DELETE /api/tasks/:id - Delete a task (Admin only)
router.get("/delete/:id", (req, res) => res.status(405).json({ message: "Use DELETE method" }));
router.delete("/:id", deleteTask);

// POST /api/tasks/:id/comments - Add a comment
router.post("/:id/comments", addComment);

export default router;
