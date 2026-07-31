import express from "express";
import Notification from "../models/notificationModel.js";
import Task from "../models/taskModel.js";

const router = express.Router();

// 1. GET /api/notifications - Retrieve active notifications with dynamic deadlining
router.get("/", async (req, res) => {
  try {
    const isEmployee = req.user.role === "Employee";
    
    // Dynamic deadline check (overdue & due today)
    const taskQuery = { status: { $ne: "Completed" } };
    if (isEmployee) {
      taskQuery.assignedEmployee = req.user._id;
    }

    const uncompletedTasks = await Task.find(taskQuery);
    const todayStr = new Date().toDateString();

    for (const task of uncompletedTasks) {
      const taskDueString = new Date(task.dueDate).toDateString();
      const taskDueTime = new Date(task.dueDate).getTime();
      const nowTime = new Date().getTime();

      // Check if due today
      if (taskDueString === todayStr) {
        const queryAlert = {
          recipient: isEmployee ? req.user._id : null,
          recipientRole: req.user.role,
          title: "Task Due Today",
          relatedId: task._id,
        };
        const exists = await Notification.findOne(queryAlert);
        if (!exists) {
          await Notification.create({
            ...queryAlert,
            message: `Task "${task.title}" is due today.`,
            type: "Task",
          });
        }
      } 
      // Check if overdue
      else if (taskDueTime < nowTime && taskDueString !== todayStr) {
        const queryAlert = {
          recipient: isEmployee ? req.user._id : null,
          recipientRole: req.user.role,
          title: "Task Overdue",
          relatedId: task._id,
        };
        const exists = await Notification.findOne(queryAlert);
        if (!exists) {
          await Notification.create({
            ...queryAlert,
            message: `Task "${task.title}" is overdue! Due date was ${new Date(task.dueDate).toLocaleDateString("en-IN")}.`,
            type: "Task",
          });
        }
      }
    }

    // Now query notifications
    const searchFilter = {};
    if (isEmployee) {
      searchFilter.recipient = req.user._id;
    } else {
      searchFilter.recipientRole = "Admin";
    }

    // Fetch notifications (limit to last 30 for performance)
    const notifications = await Notification.find(searchFilter)
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications.", error: error.message });
  }
});

// 2. POST /api/notifications/:id/read - Mark single notification as read
router.post("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    // Access check
    if (req.user.role === "Employee" && notification.recipient?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied." });
    }

    notification.isRead = true;
    await notification.save();
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: "Error marking notification as read.", error: error.message });
  }
});

// 3. POST /api/notifications/read-all - Mark all notifications as read
router.post("/read-all", async (req, res) => {
  try {
    const isEmployee = req.user.role === "Employee";
    const searchFilter = {};
    
    if (isEmployee) {
      searchFilter.recipient = req.user._id;
    } else {
      searchFilter.recipientRole = "Admin";
    }

    await Notification.updateMany(searchFilter, { $set: { isRead: true } });
    res.json({ message: "All notifications marked as read." });
  } catch (error) {
    res.status(500).json({ message: "Error marking all notifications as read.", error: error.message });
  }
});

export default router;
