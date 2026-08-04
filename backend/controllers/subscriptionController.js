import Subscription from "../models/subscriptionModel.js";
import Client from "../models/clientModel.js";
import Config from "../models/configModel.js";
import { sendSubscriptionReminderEmail } from "../services/emailService.js";
import { checkAndSendReminders } from "../services/subscriptionScheduler.js";

// GET /api/subscriptions - Fetch all subscriptions
export const getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate("client")
      .sort({ endDate: 1 });
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subscriptions", error: error.message });
  }
};

// GET /api/subscriptions/alerts - Get all active undismissed alerts
export const getAlerts = async (req, res) => {
  try {
    const subscriptions = await Subscription.find().populate("client");
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Normalize to midnight

    const activeAlerts = [];

    for (const sub of subscriptions) {
      if (!sub.client) continue;

      const endDate = new Date(sub.endDate);
      const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

      // If already expired, it's no longer an active approaching warning alert
      if (today >= endMidnight) continue;

      // 15 days before alert
      const fifteenDaysBefore = new Date(sub.endDate);
      fifteenDaysBefore.setDate(fifteenDaysBefore.getDate() - 15);
      const alert15DaysMidnight = new Date(fifteenDaysBefore.getFullYear(), fifteenDaysBefore.getMonth(), fifteenDaysBefore.getDate());

      // 1 month before alert
      const oneMonthBefore = new Date(sub.endDate);
      oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);
      const alert1MonthMidnight = new Date(oneMonthBefore.getFullYear(), oneMonthBefore.getMonth(), oneMonthBefore.getDate());

      if (today >= alert15DaysMidnight) {
        if (!sub.alertDismissed15Days) {
          activeAlerts.push({
            subscriptionId: sub._id,
            client: sub.client,
            type: sub.type,
            amount: sub.amount,
            endDate: sub.endDate,
            alertType: "15days",
            message: `${sub.client.companyName}'s ${sub.type} subscription expires in 15 days (on ${endDate.toLocaleDateString("en-IN")})`
          });
        }
      } else if (today >= alert1MonthMidnight) {
        if (!sub.alertDismissed1Month) {
          activeAlerts.push({
            subscriptionId: sub._id,
            client: sub.client,
            type: sub.type,
            amount: sub.amount,
            endDate: sub.endDate,
            alertType: "1month",
            message: `${sub.client.companyName}'s ${sub.type} subscription expires in 1 month (on ${endDate.toLocaleDateString("en-IN")})`
          });
        }
      }
    }

    res.json(activeAlerts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching active subscription alerts", error: error.message });
  }
};

// POST /api/subscriptions - Create subscription
export const createSubscription = async (req, res) => {
  try {
    const { client, type, startDate, durationValue, durationUnit, amount, inclusiveGst, isPersonalAccount } = req.body;

    if (!client || !type || !startDate || !durationValue || !durationUnit || amount === undefined) {
      return res.status(400).json({ message: "Missing required subscription parameters" });
    }

    const clientExists = await Client.findById(client);
    if (!clientExists) {
      return res.status(404).json({ message: "Client not found" });
    }

    const sub = new Subscription({
      client,
      type,
      startDate: new Date(startDate),
      durationValue: Number(durationValue),
      durationUnit,
      amount: Number(amount),
      isPersonalAccount: isPersonalAccount !== undefined ? Boolean(isPersonalAccount) : false,
      inclusiveGst: inclusiveGst !== undefined ? Boolean(inclusiveGst) : true,
    });

    await sub.save();

    // Fetch populated version to send back
    const populatedSub = await Subscription.findById(sub._id).populate("client");
    res.status(201).json(populatedSub);
  } catch (error) {
    console.error("[Backend] Error creating subscription:", error);
    res.status(500).json({ message: "Error creating subscription", error: error.message });
  }
};

// POST /api/subscriptions/bulk-delete - Bulk delete subscriptions
export const bulkDeleteSubscriptions = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No subscription IDs provided for deletion" });
    }

    const result = await Subscription.deleteMany({ _id: { $in: ids } });
    res.json({ message: `Successfully deleted ${result.deletedCount} subscriptions.` });
  } catch (error) {
    console.error("[Backend] Error bulk deleting subscriptions:", error);
    res.status(500).json({ message: "Error bulk deleting subscriptions", error: error.message });
  }
};

// PUT /api/subscriptions/:id - Update subscription
export const updateSubscription = async (req, res) => {
  try {
    const { client, type, startDate, durationValue, durationUnit, amount, inclusiveGst, isPersonalAccount } = req.body;

    const sub = await Subscription.findById(req.params.id);
    if (!sub) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    if (client) {
      const clientExists = await Client.findById(client);
      if (!clientExists) {
        return res.status(404).json({ message: "Client not found" });
      }
      sub.client = client;
    }

    if (type) sub.type = type;
    if (startDate) sub.startDate = startDate;
    if (durationValue) sub.durationValue = durationValue;
    if (durationUnit) sub.durationUnit = durationUnit;
    if (amount !== undefined) sub.amount = Number(amount);
    if (inclusiveGst !== undefined) sub.inclusiveGst = Boolean(inclusiveGst);
    if (isPersonalAccount !== undefined) sub.isPersonalAccount = Boolean(isPersonalAccount);

    await sub.save();

    const populatedSub = await Subscription.findById(sub._id).populate("client");
    res.json(populatedSub);
  } catch (error) {
    console.error("[Backend] Error updating subscription:", error);
    res.status(500).json({ message: "Error updating subscription", error: error.message });
  }
};

// DELETE /api/subscriptions/:id - Delete subscription
export const deleteSubscription = async (req, res) => {
  try {
    const sub = await Subscription.findByIdAndDelete(req.params.id);
    if (!sub) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    res.json({ message: "Subscription deleted successfully" });
  } catch (error) {
    console.error("[Backend] Error deleting subscription:", error);
    res.status(500).json({ message: "Error deleting subscription", error: error.message });
  }
};

// POST /api/subscriptions/:id/dismiss-alert - Dismiss/Acknowledge an active app alert
export const dismissAlert = async (req, res) => {
  try {
    const { alertType } = req.body;
    if (!alertType || (alertType !== "1month" && alertType !== "15days")) {
      return res.status(400).json({ message: "Invalid alertType. Must be '1month' or '15days'." });
    }

    const sub = await Subscription.findById(req.params.id);
    if (!sub) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    if (alertType === "15days") {
      sub.alertDismissed15Days = true;
    } else {
      sub.alertDismissed1Month = true;
    }

    await sub.save();
    res.json({ message: `Alert '${alertType}' dismissed successfully` });
  } catch (error) {
    res.status(500).json({ message: "Error dismissing alert", error: error.message });
  }
};

// POST /api/subscriptions/run-check - Manual trigger for testing emails
export const runCheck = async (req, res) => {
  try {
    await checkAndSendReminders();
    res.json({ message: "Subscription check executed successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error running subscription check", error: error.message });
  }
};

// POST /api/subscriptions/:id/send-email - Manually send reminder email to client
export const sendEmail = async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id).populate("client");
    if (!sub) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    if (!sub.client || !sub.client.email) {
      return res.status(400).json({ message: "Client profile has no associated email address" });
    }

    const activeConfig = await Config.findOne() || {};

    // Calculate days remaining
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(sub.endDate);
    const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    const diffTime = endMidnight.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const result = await sendSubscriptionReminderEmail(sub, sub.client, activeConfig, diffDays);
    if (result.success) {
      // Mark flags as sent depending on the days left window
      if (diffDays <= 15) {
        sub.emailSent15Days = true;
        sub.emailSent1Month = true;
      } else if (diffDays <= 30) {
        sub.emailSent1Month = true;
      }
      await sub.save();

      res.json({
        message: `Email sent successfully to ${sub.client.email} indicating ${diffDays} days remaining.`,
        previewUrl: result.previewUrl,
        isFallback: result.isFallback
      });
    } else {
      res.status(500).json({ message: "Failed to send subscription reminder email" });
    }
  } catch (error) {
    console.error("[Backend] Error manually sending subscription email:", error);
    res.status(500).json({ message: "Error manually sending subscription email", error: error.message });
  }
};
