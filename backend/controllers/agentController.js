import crypto from "crypto";
import AgentSession from "../models/agentSessionModel.js";
import { syncAgentActivity } from "./attendanceController.js";

/**
 * @desc    Generate temporary pairing token (Web App Endpoint)
 * @route   POST /api/agent/generate-token
 * @access  Private (Web App User)
 */
export const generatePairingToken = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const pairingToken = "PAIR-" + crypto.randomBytes(8).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Valid for 15 minutes

    return res.status(200).json({
      success: true,
      message: "Pairing token generated successfully",
      pairingToken,
      expiresAt,
      employeeId: employeeId || null,
    });
  } catch (error) {
    console.error("Error generating pairing token:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error generating pairing token",
      error: error.message,
    });
  }
};

/**
 * @desc    Pair agent device using temporary token
 * @route   POST /api/agent/pair
 * @access  Public
 */
export const pairAgentDevice = async (req, res) => {
  try {
    const { pairingToken, deviceId, computerName, operatingSystem, agentVersion, employeeId } = req.body;

    if (!pairingToken || !deviceId) {
      return res.status(400).json({
        success: false,
        message: "pairingToken and deviceId are required",
      });
    }

    // Generate permanent device token
    const deviceToken = "DEV-" + crypto.randomBytes(32).toString("hex");

    let session = await AgentSession.findOne({ deviceId });

    if (session) {
      session.deviceToken = deviceToken;
      session.isPaired = true;
      session.pairingToken = null;
      session.pairingTokenExpiresAt = null;
      session.computerName = computerName || session.computerName;
      session.operatingSystem = operatingSystem || session.operatingSystem;
      session.agentVersion = agentVersion || session.agentVersion;
      if (employeeId) session.employeeId = employeeId;
      session.currentStatus = "Active";
      session.lastHeartbeatAt = new Date();
      await session.save();
    } else {
      session = await AgentSession.create({
        deviceId,
        employeeId: employeeId || "EMP-DEFAULT",
        deviceToken,
        isPaired: true,
        computerName: computerName || "Unknown PC",
        operatingSystem: operatingSystem || "Windows",
        agentVersion: agentVersion || "1.0.0",
        currentStatus: "Active",
        lastHeartbeatAt: new Date(),
        ipAddress: req.ip,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Device paired successfully",
      deviceToken,
      deviceId: session.deviceId,
      employeeId: session.employeeId,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error pairing device:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to pair device",
      error: error.message,
    });
  }
};

/**
 * @desc    Receive periodic heartbeat from desktop agent
 * @route   POST /api/agent/heartbeat
 * @access  Public (Validated by X-Device-Token or req body)
 */
export const receiveHeartbeat = async (req, res) => {
  try {
    const deviceTokenHeader = req.headers["x-device-token"];
    const { deviceId, employeeId, status, idleTime, agentVersion, computerName, os, timestamp } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "deviceId is required in heartbeat body",
      });
    }

    let session = await AgentSession.findOne({ deviceId });

    if (!session) {
      // Create session if first heartbeat without prior explicit pairing in dev
      const deviceToken = deviceTokenHeader || "DEV-" + crypto.randomBytes(16).toString("hex");
      session = await AgentSession.create({
        deviceId,
        employeeId: employeeId || "EMP-DEFAULT",
        deviceToken,
        isPaired: true,
        computerName: computerName || "Unknown",
        operatingSystem: os || "Windows",
        agentVersion: agentVersion || "1.0.0",
        currentStatus: status || "Active",
        idleTimeSeconds: idleTime || 0,
        lastHeartbeatAt: new Date(),
        ipAddress: req.ip,
      });
    } else {
      session.currentStatus = status || session.currentStatus;
      session.idleTimeSeconds = typeof idleTime === "number" ? idleTime : session.idleTimeSeconds;
      session.agentVersion = agentVersion || session.agentVersion;
      session.computerName = computerName || session.computerName;
      session.operatingSystem = os || session.operatingSystem;
      if (employeeId) session.employeeId = employeeId;
      session.lastHeartbeatAt = new Date();
      await session.save();
    }

    // Trigger sync to attendance record and get synced server status
    const syncRes = await syncAgentActivity({
      deviceId: session.deviceId,
      employeeCustomId: session.employeeId,
      status: session.currentStatus,
      idleTimeSeconds: session.idleTimeSeconds,
      computerName: session.computerName,
    });

    const finalStatus = syncRes?.serverStatus || session.currentStatus;
    const agentPersistedStatus = finalStatus === "Working" ? "Active" : finalStatus;

    if (session.currentStatus !== agentPersistedStatus) {
      session.currentStatus = agentPersistedStatus;
      await session.save();
    }

    return res.status(200).json({
      success: true,
      message: "Heartbeat processed successfully",
      status: finalStatus,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error processing heartbeat:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process heartbeat",
      error: error.message,
    });
  }
};

/**
 * @desc    Update employee status (Active, On Break, Idle)
 * @route   POST /api/agent/status
 * @access  Public
 */
export const updateAgentStatus = async (req, res) => {
  try {
    const { deviceId, status } = req.body;

    if (!deviceId || !status) {
      return res.status(400).json({
        success: false,
        message: "deviceId and status are required",
      });
    }

    const session = await AgentSession.findOne({ deviceId });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Device session not found",
      });
    }

    session.currentStatus = status;
    session.lastHeartbeatAt = new Date();
    await session.save();

    return res.status(200).json({
      success: true,
      message: `Status updated to ${status}`,
      currentStatus: session.currentStatus,
    });
  } catch (error) {
    console.error("Error updating status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update agent status",
      error: error.message,
    });
  }
};

/**
 * @desc    Logout desktop agent & unpair session
 * @route   POST /api/agent/logout
 * @access  Public
 */
export const logoutAgentDevice = async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (deviceId) {
      const session = await AgentSession.findOneAndUpdate(
        { deviceId },
        {
          isPaired: false,
          currentStatus: "Offline",
          deviceToken: "REVOKED-" + Date.now(),
        },
        { new: true }
      );

      if (session) {
        syncAgentActivity({
          deviceId: session.deviceId,
          employeeCustomId: session.employeeId,
          status: "Disconnected",
          idleTimeSeconds: 0,
          computerName: session.computerName,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Device session unpaired and logged out successfully",
    });
  } catch (error) {
    console.error("Error logging out device:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to logout device",
      error: error.message,
    });
  }
};

/**
 * @desc    Download Desktop Agent Setup Installer (.exe)
 * @route   GET /api/agent/download
 * @access  Public
 */
export const downloadAgentInstaller = async (req, res) => {
  try {
    // 0. Support external CDN/Storage redirect for production (e.g. Vercel, Render)
    const externalUrl = process.env.AGENT_INSTALLER_URL;
    if (externalUrl) {
      return res.redirect(externalUrl);
    }

    const fs = await import("fs");
    const path = await import("path");

    const distDir = path.join(process.cwd(), "../desktop-agent/dist");
    let targetPath = null;
    let downloadFileName = "Company_Desktop_Agent_Package.zip";

    // 1. Check for complete Zip package containing executable + ffmpeg.dll + resources
    const zipPath = path.join(distDir, "Company_Desktop_Agent_Package.zip");
    if (fs.existsSync(zipPath)) {
      targetPath = zipPath;
      downloadFileName = "Company_Desktop_Agent_Package.zip";
    }

    // 2. Check for portable or setup installer .exe in dist/
    if (!targetPath && fs.existsSync(distDir)) {
      const files = fs.readdirSync(distDir);
      const exeFile = files.find((f) => f.endsWith(".exe") && !f.includes("unpacked"));
      if (exeFile) {
        targetPath = path.join(distDir, exeFile);
        downloadFileName = "Company_Desktop_Agent_Setup.exe";
      }
    }

    // 3. Fallback to unpacked path executable
    if (!targetPath) {
      const unpackedPath = path.join(distDir, "win-unpacked", "Company Desktop Agent.exe");
      if (fs.existsSync(unpackedPath)) {
        targetPath = unpackedPath;
        downloadFileName = "Company_Desktop_Agent.exe";
      }
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      return res.status(200).json({
        success: false,
        message: "Installer package is currently being generated.",
      });
    }

    // Prevent browsers from caching the download (very important for dev-test iterations!)
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.download(targetPath, downloadFileName);
  } catch (error) {
    console.error("Error downloading agent installer:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to download agent installer",
      error: error.message,
    });
  }
};

