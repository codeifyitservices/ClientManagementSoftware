import express from "express";
import {
  getSubscriptions,
  getSubscriptionById,
  getAlerts,
  createSubscription,
  bulkDeleteSubscriptions,
  updateSubscription,
  deleteSubscription,
  addSubscriptionPayment,
  deleteSubscriptionPayment,
  addSubscriptionService,
  removeSubscriptionService,
  dismissAlert,
  runCheck,
  sendEmail,
} from "../controllers/subscriptionController.js";

const router = express.Router();

// GET /api/subscriptions - Fetch all subscriptions
router.get("/", getSubscriptions);

// GET /api/subscriptions/alerts - Get all active undismissed alerts
router.get("/alerts", getAlerts);

// GET /api/subscriptions/:id - Get single subscription by ID
router.get("/:id", getSubscriptionById);

// POST /api/subscriptions - Create subscription
router.post("/", createSubscription);

// POST /api/subscriptions/bulk-delete - Bulk delete subscriptions
router.post("/bulk-delete", bulkDeleteSubscriptions);

// POST /api/subscriptions/run-check - Manual trigger for testing emails
router.post("/run-check", runCheck);

// PUT /api/subscriptions/:id - Update subscription
router.put("/:id", updateSubscription);

// POST /api/subscriptions/:id/payments - Add payment record
router.post("/:id/payments", addSubscriptionPayment);

// DELETE /api/subscriptions/:id/payments/:paymentId - Delete payment record
router.delete("/:id/payments/:paymentId", deleteSubscriptionPayment);

// POST /api/subscriptions/:id/services - Add service/addon
router.post("/:id/services", addSubscriptionService);

// DELETE /api/subscriptions/:id/services/:serviceId - Soft-delete service/addon
router.delete("/:id/services/:serviceId", removeSubscriptionService);

// DELETE /api/subscriptions/:id - Delete subscription
router.delete("/:id", deleteSubscription);

// POST /api/subscriptions/:id/dismiss-alert - Dismiss/Acknowledge an active app alert
router.post("/:id/dismiss-alert", dismissAlert);

// POST /api/subscriptions/:id/send-email - Manually send reminder email to client
router.post("/:id/send-email", sendEmail);

export default router;
