import express from "express";
import Task from "../models/taskModel.js";
import Notification from "../models/notificationModel.js";
import Project from "../models/projectModel.js";
import Employee from "../models/employeeModel.js";
import multer from "multer";
import path from "path";

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

// Helper to create notifications
async function createNotification(recipient, recipientRole, title, message, relatedId) {
  try {
    await Notification.create({
      recipient,
      recipientRole,
      title,
      message,
      type: "Task",
      relatedId,
    });
  } catch (err) {
    console.error("Error creating task notification:", err.message);
  }
}

// 1. GET /api/tasks - Fetch all tasks (filtered by role)
router.get("/", async (req, res) => {
  try {
    const { project, assignedEmployee, priority, status, search, page = 1, limit = 10 } = req.query;

    const query = {};

    // Role restriction
    if (req.user.role === "Employee") {
      query.assignedEmployee = req.user._id;
    } else if (assignedEmployee) {
      query.assignedEmployee = assignedEmployee;
    }

    if (project) query.project = project;
    if (priority) query.priority = priority;
    if (status) query.status = status;
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate("project", "projectName projectId")
      .populate("assignedEmployee", "fullName employeeId companyEmail department designation")
      .sort({ dueDate: 1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      tasks,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks list.", error: error.message });
  }
});

// 2. GET /api/tasks/:id - Fetch single task details
router.get("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("project", "projectName projectId")
      .populate("assignedEmployee", "fullName employeeId companyEmail department designation");

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    // Role check
    if (req.user.role === "Employee" && task.assignedEmployee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied. You are not assigned to this task." });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Error fetching task details.", error: error.message });
  }
});

// 3. POST /api/tasks - Create a task (Admin only)
router.post("/", upload.array("files", 10), async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const { title, project, assignedEmployee, priority, dueDate, description } = req.body;

    if (!title || !project || !assignedEmployee || !dueDate) {
      return res.status(400).json({ message: "Please enter Title, Project, Assignee, and Due Date." });
    }

    // Attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          fileName: file.filename,
          originalName: file.originalname,
          uploadDate: new Date(),
        });
      });
    }

    const employee = await Employee.findById(assignedEmployee);
    if (!employee) {
      return res.status(404).json({ message: "Assigned employee not found." });
    }

    const newTask = new Task({
      title,
      project,
      assignedEmployee,
      assignedBy: {
        id: req.user._id,
        name: req.user.fullName || "Admin",
        role: req.user.role,
      },
      priority: priority || "Medium",
      dueDate: new Date(dueDate),
      description: description || "",
      attachments,
      status: "Pending",
      timeline: [
        {
          user: req.user.fullName || req.user.email,
          description: `Task created and assigned to ${employee.fullName}.`,
        },
      ],
    });

    const saved = await newTask.save();

    // Create Notification
    await createNotification(
      employee._id,
      "Employee",
      "New Task Assigned",
      `You have been assigned a new task: "${title}".`,
      saved._id
    );

    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Error creating task.", error: error.message });
  }
});

// 4. PUT /api/tasks/:id - Update task (Admin edits all, Employee edits status only)
router.put("/:id", upload.array("files", 10), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const isAssigned = task.assignedEmployee.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "Admin";

    if (!isAdmin && !isAssigned) {
      return res.status(403).json({ message: "Access denied. You cannot modify this task." });
    }

    const updates = req.body;
    const oldStatus = task.status;
    const oldAssigneeId = task.assignedEmployee.toString();

    // If Employee, only allow status update
    if (!isAdmin) {
      // Retain only status
      const statusUpdate = updates.status;
      Object.keys(updates).forEach(key => delete updates[key]);
      updates.status = statusUpdate;
    }

    // Apply updates
    Object.keys(updates).forEach(key => {
      if (key !== "attachments" && key !== "comments" && key !== "timeline" && key !== "taskId") {
        task[key] = updates[key];
      }
    });

    // Handle new attachments
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        task.attachments.push({
          fileName: file.filename,
          originalName: file.originalname,
          uploadDate: new Date(),
        });
      });
      task.timeline.push({
        user: req.user.fullName || req.user.email,
        description: `Uploaded ${req.files.length} new attachment(s).`,
      });
    }

    // Timeline and notification triggers
    let notifyAssignee = false;
    let notifyAdmin = false;

    // Status change log
    if (updates.status && updates.status !== oldStatus) {
      task.timeline.push({
        user: req.user.fullName || req.user.email,
        description: `Status changed from "${oldStatus}" to "${updates.status}".`,
      });

      notifyAdmin = true;
      notifyAssignee = true;

      // Log completion
      if (updates.status === "Completed") {
        task.timeline.push({
          user: req.user.fullName || req.user.email,
          description: `Task marked as Completed.`,
        });
      }
    }

    // Reassignment log (Admin only)
    if (updates.assignedEmployee && updates.assignedEmployee.toString() !== oldAssigneeId) {
      const newEmp = await Employee.findById(updates.assignedEmployee);
      if (newEmp) {
        task.timeline.push({
          user: req.user.fullName || req.user.email,
          description: `Reassigned task to ${newEmp.fullName}.`,
        });
        
        notifyAssignee = true; // notify new assignee
        
        // Notify old assignee they were removed
        await createNotification(
          oldAssigneeId,
          "Employee",
          "Task Unassigned",
          `You have been unassigned from the task: "${task.title}".`,
          task._id
        );
      }
    }

    const saved = await task.save();

    // Trigger notifications
    if (notifyAssignee && saved.assignedEmployee) {
      await createNotification(
        saved.assignedEmployee,
        "Employee",
        "Task Updated",
        `Task "${saved.title}" was updated to status "${saved.status}".`,
        saved._id
      );
    }
    if (notifyAdmin && task.assignedBy?.id) {
      await createNotification(
        task.assignedBy.id,
        "Admin",
        "Task Status Updated",
        `Employee "${req.user.fullName}" set task "${saved.title}" to "${saved.status}".`,
        saved._id
      );
    }

    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: "Error updating task.", error: error.message });
  }
});

// 5. DELETE /api/tasks/:id - Delete a task (Admin only)
router.get("/delete/:id", async (req, res) => {
  res.status(405).json({ message: "Use DELETE method" });
});

router.delete("/:id", async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    res.json({ message: "Task deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task.", error: error.message });
  }
});

// 6. POST /api/tasks/:id/comments - Add a comment
router.post("/:id/comments", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Comment content is required." });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const isAssigned = task.assignedEmployee.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "Admin";

    if (!isAdmin && !isAssigned) {
      return res.status(403).json({ message: "Access denied. You cannot comment on this task." });
    }

    const newComment = {
      authorId: req.user._id,
      authorName: req.user.fullName || "User",
      authorRole: req.user.role,
      content,
    };

    task.comments.push(newComment);
    task.timeline.push({
      user: req.user.fullName || req.user.email,
      description: `Added a comment.`,
    });

    const saved = await task.save();

    // Trigger Notification
    if (req.user.role === "Employee" && task.assignedBy?.id) {
      await createNotification(
        task.assignedBy.id,
        "Admin",
        "New Task Comment",
        `Employee "${req.user.fullName}" commented on task "${task.title}".`,
        task._id
      );
    } else if (req.user.role === "Admin" && task.assignedEmployee) {
      await createNotification(
        task.assignedEmployee,
        "Employee",
        "New Task Comment",
        `Admin "${req.user.fullName}" commented on your task "${task.title}".`,
        task._id
      );
    }

    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Error posting comment.", error: error.message });
  }
});

export default router;
