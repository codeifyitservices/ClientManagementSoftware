import express from "express";
import {
  getSubscriptions,
  getAlerts,
  createSubscription,
  bulkDeleteSubscriptions,
  updateSubscription,
  deleteSubscription,
  dismissAlert,
  runCheck,
  sendEmail,
} from "../controllers/subscriptionController.js";

const router = express.Router();

// GET /api/subscriptions - Fetch all subscriptions
router.get("/", getSubscriptions);

// GET /api/subscriptions/alerts - Get all active undismissed alerts
router.get("/alerts", getAlerts);

// POST /api/subscriptions - Create subscription
router.post("/", createSubscription);

// POST /api/subscriptions/bulk-delete - Bulk delete subscriptions
router.post("/bulk-delete", bulkDeleteSubscriptions);

// POST /api/subscriptions/run-check - Manual trigger for testing emails
router.post("/run-check", runCheck);

// PUT /api/subscriptions/:id - Update subscription
router.put("/:id", updateSubscription);

// DELETE /api/subscriptions/:id - Delete subscription
router.delete("/:id", deleteSubscription);

// POST /api/subscriptions/:id/dismiss-alert - Dismiss/Acknowledge an active app alert
router.post("/:id/dismiss-alert", dismissAlert);

// POST /api/subscriptions/:id/send-email - Manually send reminder email to client
router.post("/:id/send-email", sendEmail);

export default router;
