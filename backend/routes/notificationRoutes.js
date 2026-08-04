import express from "express";
import { getNotifications, markAsRead, markAllAsRead } from "../controllers/notificationController.js";

const router = express.Router();

// GET /api/notifications - Retrieve active notifications with dynamic deadlining
router.get("/", getNotifications);

// POST /api/notifications/read-all - Mark all notifications as read (must be before /:id)
router.post("/read-all", markAllAsRead);

// POST /api/notifications/:id/read - Mark single notification as read
router.post("/:id/read", markAsRead);

export default router;
