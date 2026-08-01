const { Notification } = require("electron");
const logger = require("../logger/logger");

class Notifier {
  /**
   * Display native Windows Desktop notification
   * @param {string} title - Notification title
   * @param {string} body - Notification body text
   * @param {Function} onClick - Optional click handler
   */
  static show(title, body, onClick = null) {
    try {
      if (!Notification.isSupported()) {
        logger.warn("Desktop notifications not supported on this OS");
        return;
      }

      const notification = new Notification({
        title: title || "Company Desktop Agent",
        body: body || "",
        silent: false,
      });

      if (onClick && typeof onClick === "function") {
        notification.on("click", onClick);
      }

      notification.show();
    } catch (err) {
      logger.error("Failed to show desktop notification", err);
    }
  }

  static notifyPaired(employeeId) {
    Notifier.show("Device Paired Successfully", `Agent linked to employee ${employeeId || "account"}.`);
  }

  static notifyConnectionLost() {
    Notifier.show("Connection Lost", "Agent is offline. Sync requests will be queued locally.");
  }

  static notifyConnectionRestored() {
    Notifier.show("Connection Restored", "Reconnected to server. Queueing background sync...");
  }

  static notifyBreakStarted() {
    Notifier.show("Break Mode Started", "You are marked as On Break.");
  }

  static notifyBreakEnded() {
    Notifier.show("Work Resumed", "Break ended. Activity tracking is active.");
  }

  static notifyUpdateAvailable(version) {
    Notifier.show("Update Available", `Version ${version || "new"} is downloading in the background.`);
  }

  static notifyUpdateReady(version) {
    Notifier.show("Update Ready to Install", `Version ${version || "new"} downloaded. Restart agent to update.`);
  }
}

module.exports = Notifier;
