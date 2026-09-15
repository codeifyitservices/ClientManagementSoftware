const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const config = require("../config");
const logger = require("../logger/logger");
const trayManager = require("../tray/trayManager");
const authManager = require("../auth/authManager");
const idleDetector = require("../idle/idleDetector");
const heartbeatService = require("../heartbeat/heartbeatService");
const autoUpdater = require("../updater/autoUpdater");
const storage = require("../utils/storage");
const machineInfo = require("../utils/machineInfo");
const socketClient = require("../api/socketClient");
const localHttpServer = require("../server/localHttpServer");

// Prevent multiple instances of the desktop agent
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  logger.info(
    "Another instance of Desktop Agent is already running. Exiting current process.",
  );
  app.quit();
  process.exit(0);
}

let mainWindow = null;

// Register custom protocol scheme: desktop-agent://
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(config.appProtocol, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(config.appProtocol);
}

/**
 * Configure Windows Startup launch
 */
function configureWindowsAutoStart() {
  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true, // Launch silently in tray on Windows startup
      path: process.execPath,
      args: ["--hidden"],
    });
    logger.info("Windows Startup auto-launch registered successfully.");
  } catch (err) {
    logger.warn("Failed to set Windows login item settings", err);
  }
}

/**
 * Create Settings / Pairing UI Window
 */
function createSettingsWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 620,
    height: 680,
    resizable: false,
    show: false, // Don't show until ready
    frame: false, // Custom sleek window frame
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    icon: path.join(__dirname, "../../assets/icon.ico"),
  });

  mainWindow.loadFile(path.join(__dirname, "../ui/settings.html"));

  // Closing the window hides to system tray so the background agent continues running
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Process second instance command line arguments (e.g. Deep Link protocol)
 */
app.on("second-instance", (event, commandLine) => {
  logger.info("Second instance launched with command line", { commandLine });

  // Find deep link URL argument
  const urlArg = commandLine.find((arg) =>
    arg.startsWith(`${config.appProtocol}://`),
  );

  // Only restore & focus window if it is NOT a background status change
  if (!urlArg || !urlArg.includes("status")) {
    if (!mainWindow) {
      createSettingsWindow();
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }

  if (urlArg) {
    authManager.handleProtocolUrl(urlArg).then(() => {
      if (mainWindow) mainWindow.webContents.send("agent:status-updated");
    });
  }
});

/**
 * Handle deep link on macOS / Windows protocol event
 */
app.on("open-url", (event, url) => {
  event.preventDefault();
  authManager.handleProtocolUrl(url).then(() => {
    if (mainWindow) mainWindow.webContents.send("agent:status-updated");
  });
});

// App ready initialization
app.whenReady().then(() => {
  logger.logStartup();

  // Configure Auto-Start with Windows
  configureWindowsAutoStart();

  // Create System Tray Icon
  trayManager.init(() => {
    createSettingsWindow();
    mainWindow.show();
  });

  // Start Local Loopback HTTP Server (for local dashboard probe on 127.0.0.1:49152)
  localHttpServer.start();

  // Only start presence tracking, heartbeats, and socket client if already paired
  if (authManager.isPaired()) {
    idleDetector.setStatus("Active");
    idleDetector.start();
    heartbeatService.start();
    socketClient.connect();
  } else {
    idleDetector.setStatus("Offline");
    logger.info("Agent running in unpaired state. Awaiting pairing from web application.");
  }

  // Initialize Auto Updater
  autoUpdater.init();
  autoUpdater.checkForUpdates();

  // Check process.argv for deep link URL on startup
  const urlArg = process.argv.find((arg) =>
    arg.startsWith(`${config.appProtocol}://`),
  );
  if (urlArg) {
    logger.info("Startup deep link detected in process.argv", { urlArg });
    authManager.handleProtocolUrl(urlArg).then(() => {
      if (mainWindow) mainWindow.webContents.send("agent:status-updated");
      heartbeatService.forceSyncNow();
    });
  } else {
    // Show window if manually launched by user (unless started silently with --hidden)
    const isHiddenLaunch = process.argv.includes("--hidden");
    if (!isHiddenLaunch) {
      createSettingsWindow();
      mainWindow.show();
      mainWindow.focus();
    }
  }

  // Register IPC Handlers for Settings UI
  ipcMain.handle("agent:get-status", () => {
    return {
      isPaired: authManager.isPaired(),
      employeeId: authManager.getEmployeeId(),
      deviceId: authManager.getDeviceId(),
      currentStatus: idleDetector.getCurrentStatus(),
      isOnBreak: idleDetector.isBreak(),
      lastSync: storage.getLastSync(),
      computerName: machineInfo.getComputerName(),
      version: config.version,
      config: {
        apiBaseUrl: config.apiBaseUrl,
        heartbeatIntervalMs: config.heartbeatIntervalMs,
        idleTimeoutSeconds: config.idleTimeoutSeconds,
      },
    };
  });

  ipcMain.handle("agent:pair", async (event, pairingToken) => {
    const res = await authManager.pairWithToken(pairingToken);
    trayManager.updateTrayStatus(idleDetector.getCurrentStatus());
    if (res && res.success) {
      socketClient.connect();
    }
    return res;
  });

  ipcMain.handle("agent:force-sync", async () => {
    await heartbeatService.forceSyncNow();
    return { success: true };
  });

  ipcMain.handle("agent:check-updates", () => {
    autoUpdater.checkForUpdates();
    return { success: true };
  });

  ipcMain.handle("agent:logout", async () => {
    socketClient.disconnect();
    await authManager.logout();
    trayManager.updateTrayStatus("Offline");
    return { success: true };
  });

  ipcMain.on("agent:minimize-window", () => {
    if (mainWindow) {
      mainWindow.minimize(); // Minimize window to the Windows Taskbar
      logger.debug("Window minimized to taskbar");
    }
  });

  ipcMain.on("agent:close-app", async () => {
    app.isQuitting = true;
    try {
      await authManager.disconnect();
    } catch (err) {
      logger.error("Error disconnecting on close-app", err);
    }
    app.quit(); // Fully quits application and destroys tray icon
  });

  // Always create and show settings window on manual launch (unless --hidden arg passed by Windows startup)
  if (!process.argv.includes("--hidden")) {
    createSettingsWindow();
    if (mainWindow) mainWindow.show();
  }
});

let isDisconnecting = false;
// App shutdown lifecycle
app.on("before-quit", async (event) => {
  if (!isDisconnecting) {
    isDisconnecting = true;
    event.preventDefault();
    logger.logShutdown();
    socketClient.disconnect();
    localHttpServer.stop();
    idleDetector.stop();
    heartbeatService.stop();
    trayManager.destroy();
    try {
      await authManager.disconnect();
    } catch (err) {
      logger.error("Error disconnecting on before-quit", err);
    }
    app.isQuitting = true;
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
