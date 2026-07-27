import Subscription from "../models/subscriptionModel.js";
import Client from "../models/clientModel.js";
import Config from "../models/configModel.js";
import { sendSubscriptionReminderEmail } from "./emailService.js";

/**
 * Checks all active subscriptions and sends email notifications 
 * at 1 month and 15 days before expiration.
 */
export const checkAndSendReminders = async () => {
  console.log("[Scheduler] Running subscription expiration check...");
  try {
    const activeConfig = (await Config.findOne()) || {};
    const subscriptions = await Subscription.find().populate("client");

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Normalize to midnight

    let emailsSentCount = 0;

    for (const sub of subscriptions) {
      if (!sub.client || !sub.client.email) {
        continue;
      }

      const endDate = new Date(sub.endDate);
      const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

      // If already expired, don't send reminder notifications
      if (today >= endMidnight) {
        continue;
      }

      const diffTime = endMidnight.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Calculate 15 days before expiry date
      const fifteenDaysBefore = new Date(sub.endDate);
      fifteenDaysBefore.setDate(fifteenDaysBefore.getDate() - 15);
      const alert15DaysMidnight = new Date(fifteenDaysBefore.getFullYear(), fifteenDaysBefore.getMonth(), fifteenDaysBefore.getDate());

      // Calculate 1 month before expiry date
      const oneMonthBefore = new Date(sub.endDate);
      oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);
      const alert1MonthMidnight = new Date(oneMonthBefore.getFullYear(), oneMonthBefore.getMonth(), oneMonthBefore.getDate());

      // We prioritize sending 15-day alert first if both are due but not sent
      if (today >= alert15DaysMidnight) {
        if (!sub.emailSent15Days) {
          console.log(`[Scheduler] Expiry <= 15 days (${diffDays} days left) for ${sub.client.companyName}. Sending reminder.`);
          const result = await sendSubscriptionReminderEmail(sub, sub.client, activeConfig, diffDays);
          if (result.success) {
            sub.emailSent15Days = true;
            // Also mark 1-month email as true to avoid sending retroactively
            sub.emailSent1Month = true;
            await sub.save();
            emailsSentCount++;
          }
        }
      } else if (today >= alert1MonthMidnight) {
        if (!sub.emailSent1Month) {
          console.log(`[Scheduler] Expiry <= 1 month (${diffDays} days left) for ${sub.client.companyName}. Sending reminder.`);
          const result = await sendSubscriptionReminderEmail(sub, sub.client, activeConfig, diffDays);
          if (result.success) {
            sub.emailSent1Month = true;
            await sub.save();
            emailsSentCount++;
          }
        }
      }
    }

    console.log(`[Scheduler] Subscription expiration check complete. Sent ${emailsSentCount} email reminders.`);
  } catch (error) {
    console.error("[Scheduler] Error during subscription expiration check:", error.message);
  }
};

/**
 * Initializes the background interval scheduler.
 */
export const startSubscriptionScheduler = () => {
  // Run first check 5 seconds after server startup
  setTimeout(checkAndSendReminders, 5000);

  // Run subsequent checks every 12 hours
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;
  setInterval(checkAndSendReminders, TWELVE_HOURS);
  
  console.log("[Scheduler] Subscription background scheduler registered (12-hour intervals).");
};
