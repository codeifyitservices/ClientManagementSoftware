const apiClient = require("./apiClient");
const logger = require("../logger/logger");

class AgentApi {
  /**
   * Exchange temporary pairing token for long-lived device token
   */
  static async pairDevice(pairingToken, deviceMetadata) {
    try {
      const response = await apiClient.post("/pair", {
        pairingToken,
        ...deviceMetadata,
      });
      return response.data;
    } catch (error) {
      logger.error("API pairDevice failed", error);
      throw error;
    }
  }

  /**
   * Send periodic heartbeat status to backend
   */
  static async sendHeartbeat(heartbeatPayload) {
    try {
      const response = await apiClient.post("/heartbeat", heartbeatPayload);
      return response.data;
    } catch (error) {
      // Don't throw error here to allow heartbeat service to handle queuing silently
      return null;
    }
  }

  /**
   * Send manual status update (e.g. On Break, Resume Work)
   */
  static async updateStatus(deviceId, status) {
    try {
      const response = await apiClient.post("/status", { deviceId, status });
      return response.data;
    } catch (error) {
      logger.error("API updateStatus failed", error);
      throw error;
    }
  }

  /**
   * Revoke device pairing on server
   */
  static async logoutDevice(deviceId) {
    try {
      const response = await apiClient.post("/logout", { deviceId });
      return response.data;
    } catch (error) {
      logger.error("API logoutDevice failed", error);
      throw error;
    }
  }
}

module.exports = AgentApi;
