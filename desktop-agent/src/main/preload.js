const { contextBridge, ipcRenderer } = require("electron");

/**
 * Expose secure IPC bridge to Renderer (Settings UI)
 */
contextBridge.exposeInMainWorld("electronAPI", {
  getAgentStatus: () => ipcRenderer.invoke("agent:get-status"),
  pairDevice: (token) => ipcRenderer.invoke("agent:pair", token),
  toggleBreak: (onBreak) => ipcRenderer.invoke("agent:toggle-break", onBreak),
  forceSync: () => ipcRenderer.invoke("agent:force-sync"),
  checkUpdates: () => ipcRenderer.invoke("agent:check-updates"),
  logout: () => ipcRenderer.invoke("agent:logout"),
  minimizeToTray: () => ipcRenderer.send("agent:minimize-window"),
  closeApp: () => ipcRenderer.send("agent:close-app"),
  onStatusUpdate: (callback) => ipcRenderer.on("agent:status-updated", () => callback()),
});
