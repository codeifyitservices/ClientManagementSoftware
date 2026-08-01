const { autoUpdater } = require("electron-updater");
const config = require("../config");
const logger = require("../logger/logger");
const notifier = require("../utils/notifier");

class AutoUpdaterService {
  constructor() {
    this.updateAvailable = false;
    this.updateDownloaded = false;
  }

  init() {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.logger = logger;

    if (config.updateUrl) {
      try {
        autoUpdater.setFeedURL({
          provider: "generic",
          url: config.updateUrl,
        });
      } catch (err) {
        logger.warn("Could not set updater feed URL", err);
      }
    }

    autoUpdater.on("checking-for-update", () => {
      logger.info("Checking for application updates...");
    });

    autoUpdater.on("update-available", (info) => {
      this.updateAvailable = true;
      logger.info(`Update available: ${info.version}`);
      notifier.notifyUpdateAvailable(info.version);
    });

    autoUpdater.on("update-not-available", () => {
      logger.info("Application is up to date");
    });

    autoUpdater.on("error", (err) => {
      logger.warn("Auto-updater encountered an issue (can be ignored in dev environment)", err);
    });

    autoUpdater.on("download-progress", (progressObj) => {
      logger.debug(`Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent.toFixed(1)}%`);
    });

    autoUpdater.on("update-downloaded", (info) => {
      this.updateDownloaded = true;
      logger.info(`Update downloaded: ${info.version}. Ready to restart and install.`);
      notifier.notifyUpdateReady(info.version);
    });
  }

  checkForUpdates() {
    if (config.environment === "development") {
      logger.info("AutoUpdater skipped in development environment");
      return;
    }

    try {
      autoUpdater.checkForUpdates();
    } catch (err) {
      logger.warn("Failed to trigger update check", err);
    }
  }

  quitAndInstall() {
    if (this.updateDownloaded) {
      autoUpdater.quitAndInstall();
    } else {
      logger.warn("No update downloaded to install");
    }
  }
}

module.exports = new AutoUpdaterService();
