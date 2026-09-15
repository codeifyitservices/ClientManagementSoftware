import express from "express";
import protect from "../middleware/authMiddleware.js";
import { requireAgentAuth } from "../middleware/agentAuth.js";
import {
  generatePairingToken,
  pairAgentDevice,
  receiveHeartbeat,
  updateAgentStatus,
  disconnectAgentDevice,
  logoutAgentDevice,
  downloadAgentInstaller,
} from "../controllers/agentController.js";

const router = express.Router();

router.get("/download", downloadAgentInstaller);
router.post("/generate-token", protect, generatePairingToken);
router.post("/pair", pairAgentDevice);
router.post("/heartbeat", requireAgentAuth, receiveHeartbeat);
router.post("/status", requireAgentAuth, updateAgentStatus);
router.post("/disconnect", requireAgentAuth, disconnectAgentDevice);
router.post("/logout", requireAgentAuth, logoutAgentDevice);

export default router;
