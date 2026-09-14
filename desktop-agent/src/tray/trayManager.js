const { Tray, Menu, nativeImage, app } = require("electron");
const path = require("path");
const logger = require("../logger/logger");
const idleDetector = require("../idle/idleDetector");
const heartbeatService = require("../heartbeat/heartbeatService");
const authManager = require("../auth/authManager");
const autoUpdater = require("../updater/autoUpdater");
const config = require("../config");

class TrayManager {
  constructor() {
    this.tray = null;
    this.onOpenSettings = null;
  }

  init(onOpenSettingsCallback) {
    this.onOpenSettings = onOpenSettingsCallback;

    const iconPath = this.getIconForStatus("Active");
    let icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      // Fallback empty image if asset PNG not generated yet
      icon = nativeImage.createEmpty();
    }

    this.tray = new Tray(icon);
    this.tray.setToolTip("Company Desktop Agent - Active");

    // Double click to open Settings
    this.tray.on("double-click", () => {
      if (this.onOpenSettings) this.onOpenSettings();
    });

    this.updateContextMenu();
  }

  onStatusChange(newStatus) {
    if (this.tray) {
      this.updateTrayStatus(newStatus);
    }
  }

  onNetworkChange(isOnline) {
    if (this.tray) {
      if (!isOnline) {
        this.updateTrayStatus("Offline");
      } else {
        this.updateTrayStatus(idleDetector.getCurrentStatus());
      }
    }
  }

  getIconForStatus(status) {
    const assetFolder = path.join(__dirname, "../../assets");
    switch (status) {
      case "Active":
        return path.join(assetFolder, "tray-active.png");
      case "Idle":
        return path.join(assetFolder, "tray-idle.png");
      case "On Break":
        return path.join(assetFolder, "tray-break.png");
      case "Offline":
      default:
        return path.join(assetFolder, "tray-offline.png");
    }
  }

  updateTrayStatus(status) {
    if (!this.tray) return;

    let tooltipText = "Company Desktop Agent - Offline";
    if (authManager.isPaired()) {
      tooltipText = `Company Desktop Agent - ${status}`;
    }
    this.tray.setToolTip(tooltipText);

    const iconPath = this.getIconForStatus(status);
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      this.tray.setImage(icon);
    }

    this.updateContextMenu();
  }

  updateContextMenu() {
    if (!this.tray) return;

    const currentStatus = idleDetector.getCurrentStatus();
    const isOnBreak = idleDetector.isManualBreak();
    const isPaired = authManager.isPaired();
    const employeeId = authManager.getEmployeeId() || "Not Paired";

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Company Desktop Agent (v${config.version})`,
        enabled: false,
      },
      {
        label: `Employee: ${employeeId}`,
        enabled: false,
      },
      {
        label: `Status: ${currentStatus}`,
        enabled: false,
      },
      { type: "separator" },
      {
        label: "⚙️ Open Settings",
        click: () => {
          if (this.onOpenSettings) this.onOpenSettings();
        },
      },
      { type: "separator" },
      {
        label: "🔄 Sync Now",
        enabled: isPaired,
        click: () => {
          heartbeatService.forceSyncNow();
        },
      },
      {
        label: "🚀 Check for Updates",
        click: () => {
          autoUpdater.checkForUpdates();
        },
      },
      { type: "separator" },
      {
        label: "🚪 Logout",
        enabled: isPaired,
        click: async () => {
          await authManager.logout();
          this.updateTrayStatus("Offline");
          if (this.onOpenSettings) this.onOpenSettings();
        },
      },
      {
        label: "❌ Exit",
        click: () => {
          logger.logShutdown();
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

module.exports = new TrayManager();
