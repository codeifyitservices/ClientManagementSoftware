const storage = require("../utils/storage");
const machineInfo = require("../utils/machineInfo");
const agentApi = require("../api/agentApi");
const logger = require("../logger/logger");
const notifier = require("../utils/notifier");
const config = require("../config");

class AuthManager {
  constructor() {
    this.deviceId = storage.getDeviceId() || machineInfo.getUniqueDeviceId();
    storage.setDeviceId(this.deviceId);
  }

  getDeviceId() {
    return this.deviceId;
  }

  getEmployeeId() {
    return storage.getEmployeeId();
  }

  isPaired() {
    const token = storage.getDeviceToken();
    return !!token;
  }

  /**
   * Pair agent using temporary pairing token from web application
   */
  async pairWithToken(pairingToken, customEmployeeId = null) {
    try {
      logger.logPairing("Attempting pairing with token", { pairingToken: pairingToken?.substring(0, 8) + "..." });

      const deviceMetadata = {
        deviceId: this.deviceId,
        computerName: machineInfo.getComputerName(),
        operatingSystem: machineInfo.getOperatingSystem(),
        agentVersion: config.version,
        employeeId: customEmployeeId || "EMP-DEFAULT",
      };

      const result = await agentApi.pairDevice(pairingToken, deviceMetadata);

      if (result && result.success && result.deviceToken) {
        storage.setDeviceToken(result.deviceToken);
        storage.setEmployeeId(result.employeeId || customEmployeeId || "EMP-DEFAULT");
        storage.setDeviceId(result.deviceId || this.deviceId);
        storage.setLastSync(new Date().toISOString());

        logger.logPairing("Pairing successful", { employeeId: result.employeeId });
        logger.logLogin(result.employeeId);
        notifier.notifyPaired(result.employeeId);

        return { success: true, employeeId: result.employeeId, deviceToken: result.deviceToken };
      }

      throw new Error(result?.message || "Invalid response from server");
    } catch (error) {
      logger.error("Pairing failed", error);
      return { success: false, message: error.response?.data?.message || error.message || "Pairing failed" };
    }
  }

  /**
   * Handle deep-link protocol URL (e.g. desktop-agent://pair?token=PAIR-12345&emp=EMP-99)
   */
  async handleProtocolUrl(url) {
    if (!url || typeof url !== "string") return;
    logger.info("Processing deep link protocol URL", { url });

    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname === "pair" || parsedUrl.pathname.includes("pair")) {
        const token = parsedUrl.searchParams.get("token");
        const empId = parsedUrl.searchParams.get("emp");

        if (token) {
          return await this.pairWithToken(token, empId);
        }
      }
    } catch (err) {
      logger.error("Failed to parse deep link URL", err);
    }
  }

  /**
   * Unpair and logout device
   */
  async logout() {
    try {
      logger.logLogout("User initiated logout");
      await agentApi.logoutDevice(this.deviceId).catch(() => {});
    } finally {
      storage.clear();
      // Re-persist hardware device ID so future pairing reuses the same device ID
      storage.setDeviceId(this.deviceId);
    }
  }
}

module.exports = new AuthManager();
