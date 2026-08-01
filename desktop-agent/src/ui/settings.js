document.addEventListener("DOMContentLoaded", async () => {
  const elAppVersion = document.getElementById("appVersion");
  const elStatusBadge = document.getElementById("statusBadge");
  const elEmployeeId = document.getElementById("employeeId");
  const elDeviceId = document.getElementById("deviceId");
  const elActivityState = document.getElementById("activityState");
  const elLastSyncTime = document.getElementById("lastSyncTime");
  const elPairingCard = document.getElementById("pairingCard");
  const elActionsCard = document.getElementById("actionsCard");
  const elPairingTokenInput = document.getElementById("pairingTokenInput");
  const elPairingError = document.getElementById("pairingError");
  const elBtnPair = document.getElementById("btnPair");
  const elBtnToggleBreak = document.getElementById("btnToggleBreak");
  const elBtnForceSync = document.getElementById("btnForceSync");
  const elBtnCheckUpdates = document.getElementById("btnCheckUpdates");
  const elBtnLogout = document.getElementById("btnLogout");
  const elBtnClose = document.getElementById("btnClose");

  const elCfgIdle = document.getElementById("cfgIdle");
  const elCfgComputer = document.getElementById("cfgComputer");

  // Load Initial Agent Info
  async function refreshAgentStatus() {
    if (!window.electronAPI) return;
    try {
      const state = await window.electronAPI.getAgentStatus();
      
      elAppVersion.textContent = `v${state.version || "1.0.0"}`;
      elDeviceId.textContent = state.deviceId || "Unknown";
      elEmployeeId.textContent = state.employeeId || "Not Paired";
      elActivityState.textContent = state.currentStatus || "Active";
      elLastSyncTime.textContent = state.lastSync ? new Date(state.lastSync).toLocaleTimeString() : "Never";

      if (elCfgIdle) elCfgIdle.textContent = `${(state.config?.idleTimeoutSeconds || 900) / 60} minutes`;
      if (elCfgComputer) elCfgComputer.textContent = state.computerName || "Windows-PC";

      // Badge Styling
      elStatusBadge.className = "badge";
      if (!state.isPaired) {
        elStatusBadge.classList.add("badge-offline");
        elStatusBadge.textContent = "Not Paired";
        elPairingCard.style.display = "block";
        elActionsCard.style.display = "none";
      } else {
        elPairingCard.style.display = "none";
        elActionsCard.style.display = "block";
        switch (state.currentStatus) {
          case "Active":
            elStatusBadge.classList.add("badge-active");
            elStatusBadge.textContent = "Active";
            break;
          case "Idle":
            elStatusBadge.classList.add("badge-idle");
            elStatusBadge.textContent = "Idle";
            break;
          case "On Break":
            elStatusBadge.classList.add("badge-break");
            elStatusBadge.textContent = "On Break";
            break;
          case "Offline":
          default:
            elStatusBadge.classList.add("badge-offline");
            elStatusBadge.textContent = "Offline";
            break;
        }
      }

      // Update Break Button Text
      if (state.isOnBreak) {
        elBtnToggleBreak.textContent = "▶️ Resume Work";
      } else {
        elBtnToggleBreak.textContent = "⏸️ Take Break";
      }
    } catch (err) {
      console.error("Failed to load agent status", err);
    }
  }

  // Handle Pairing Button
  elBtnPair.addEventListener("click", async () => {
    const token = elPairingTokenInput.value.trim();
    if (!token) {
      elPairingError.textContent = "Please enter a valid pairing token";
      return;
    }
    elPairingError.textContent = "";
    elBtnPair.disabled = true;
    elBtnPair.textContent = "Pairing...";

    try {
      const res = await window.electronAPI.pairDevice(token);
      if (res.success) {
        elPairingTokenInput.value = "";
        await refreshAgentStatus();
      } else {
        elPairingError.textContent = res.message || "Pairing failed. Check token.";
      }
    } catch (err) {
      elPairingError.textContent = "Network error during pairing.";
    } finally {
      elBtnPair.disabled = false;
      elBtnPair.textContent = "Pair Device";
    }
  });

  // Handle Break Toggle
  elBtnToggleBreak.addEventListener("click", async () => {
    const state = await window.electronAPI.getAgentStatus();
    const newBreakState = !state.isOnBreak;
    await window.electronAPI.toggleBreak(newBreakState);
    await refreshAgentStatus();
  });

  // Handle Manual Force Sync
  elBtnForceSync.addEventListener("click", async () => {
    elBtnForceSync.disabled = true;
    elBtnForceSync.textContent = "Syncing...";
    await window.electronAPI.forceSync();
    setTimeout(async () => {
      await refreshAgentStatus();
      elBtnForceSync.disabled = false;
      elBtnForceSync.textContent = "🔄 Sync Now";
    }, 1000);
  });

  // Handle Check Updates
  elBtnCheckUpdates.addEventListener("click", async () => {
    await window.electronAPI.checkUpdates();
    alert("Checking for updates in the background...");
  });

  // Handle Logout
  elBtnLogout.addEventListener("click", async () => {
    if (confirm("Are you sure you want to unpair this desktop agent?")) {
      await window.electronAPI.logout();
      await refreshAgentStatus();
    }
  });

  // Handle Window Minimize (hide to tray & keep running background)
  const elBtnMinimize = document.getElementById("btnMinimize");
  if (elBtnMinimize) {
    elBtnMinimize.addEventListener("click", () => {
      window.electronAPI.minimizeToTray();
    });
  }

  // Handle Window Close (quit & exit agent completely)
  elBtnClose.addEventListener("click", () => {
    window.electronAPI.closeApp();
  });

  // Event Listener for status updates from main process
  if (window.electronAPI?.onStatusUpdate) {
    window.electronAPI.onStatusUpdate(() => {
      refreshAgentStatus();
    });
  }

  // Initial call
  await refreshAgentStatus();
  setInterval(refreshAgentStatus, 3000);
});
