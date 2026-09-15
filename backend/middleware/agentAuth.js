import AgentSession from "../models/agentSessionModel.js";

/**
 * Middleware to authenticate Desktop Agent requests using the persistent deviceToken.
 * Applied to /api/agent/heartbeat, /api/agent/status, /api/agent/disconnect, /api/agent/logout.
 */
export const requireAgentAuth = async (req, res, next) => {
  try {
    const headerToken = req.headers["x-device-token"];
    const authHeader = req.headers.authorization;
    let token = headerToken;

    if (!token && authHeader && authHeader.startsWith("Bearer DEV-")) {
      token = authHeader.split(" ")[1];
    }

    if (!token && req.body && req.body.deviceToken) {
      token = req.body.deviceToken;
    }

    const deviceId = req.body?.deviceId || req.query?.deviceId || req.headers["x-device-id"];

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "deviceId is required for agent authentication",
      });
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Missing device authentication token (X-Device-Token)",
      });
    }

    const session = await AgentSession.findOne({ deviceId });

    if (!session || !session.isPaired) {
      return res.status(401).json({
        success: false,
        pairingValid: false,
        message: "Device is not paired. Please pair the desktop agent from the web application.",
      });
    }

    if (!session.deviceToken || session.deviceToken !== token) {
      return res.status(401).json({
        success: false,
        pairingValid: false,
        message: "Invalid or revoked device authorization token.",
      });
    }

    // Attach validated agent session to request object
    req.agentSession = session;
    next();
  } catch (error) {
    console.error("Agent authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during agent authentication",
      error: error.message,
    });
  }
};
