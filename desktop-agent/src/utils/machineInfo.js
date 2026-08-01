const os = require("os");
const crypto = require("crypto");

/**
 * Utility module to extract device metadata securely
 */
class MachineInfo {
  /**
   * Get Computer Hostname
   */
  static getComputerName() {
    return os.hostname() || "Windows-PC";
  }

  /**
   * Get Operating System String
   */
  static getOperatingSystem() {
    const type = os.type();
    const release = os.release();
    const arch = os.arch();
    return `${type} ${release} (${arch})`;
  }

  /**
   * Get system architecture
   */
  static getArchitecture() {
    return os.arch();
  }

  /**
   * Generate or obtain a unique hardware fingerprint ID
   */
  static getUniqueDeviceId() {
    const networkInterfaces = os.networkInterfaces();
    let macAddress = "";

    // Search for non-internal MAC address
    for (const interfaceName of Object.keys(networkInterfaces)) {
      const ifaceList = networkInterfaces[interfaceName];
      for (const iface of ifaceList) {
        if (!iface.internal && iface.mac && iface.mac !== "00:00:00:00:00:00") {
          macAddress = iface.mac;
          break;
        }
      }
      if (macAddress) break;
    }

    const rawString = `${os.hostname()}-${os.type()}-${os.arch()}-${macAddress || "default-mac"}`;
    const hash = crypto.createHash("sha256").update(rawString).digest("hex").substring(0, 24);
    return `AGENT-DEV-${hash.toUpperCase()}`;
  }
}

module.exports = MachineInfo;
