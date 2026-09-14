import express from "express";
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
router.post("/generate-token", generatePairingToken);
router.post("/pair", pairAgentDevice);
router.post("/heartbeat", receiveHeartbeat);
router.post("/status", updateAgentStatus);
router.post("/disconnect", disconnectAgentDevice);
router.post("/logout", logoutAgentDevice);

export default router;
