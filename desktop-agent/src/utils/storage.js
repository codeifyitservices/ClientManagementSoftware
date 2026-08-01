const { safeStorage } = require("electron");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const logger = require("../logger/logger");

const STORAGE_FILE_NAME = "agent_store.json";

class Storage {
  constructor() {
    this.storagePath = path.join(
      process.env.APPDATA || (process.platform === "darwin" ? process.env.HOME + "/Library/Preferences" : "/var/local"),
      "company-desktop-agent",
      STORAGE_FILE_NAME
    );
    this.ensureDirectory();
    this.fallbackKey = crypto.scryptSync("company-agent-secret", "salt-12345", 32);
    this.data = this.loadFromFile();
  }

  ensureDirectory() {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Load JSON storage file from disk
   */
  loadFromFile() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, "utf8");
        return JSON.parse(raw);
      }
    } catch (err) {
      logger.error("Failed to load agent storage file", err);
    }
    return {};
  }

  /**
   * Save JSON storage file to disk
   */
  saveToFile() {
    try {
      fs.writeFileSync(this.storagePath, JSON.stringify(this.data, null, 2), "utf8");
    } catch (err) {
      logger.error("Failed to write agent storage file", err);
    }
  }

  /**
   * Encrypt sensitive string data
   */
  encrypt(text) {
    if (!text) return null;
    try {
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const buffer = safeStorage.encryptString(text);
        return { encrypted: true, type: "safeStorage", data: buffer.toString("base64") };
      }
    } catch (err) {
      logger.warn("safeStorage failed, using fallback AES encryption", err);
    }

    // Fallback AES-256-GCM encryption
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.fallbackKey, iv);
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");
    const authTag = cipher.getAuthTag().toString("base64");
    return {
      encrypted: true,
      type: "crypto",
      iv: iv.toString("base64"),
      data: encrypted,
      authTag,
    };
  }

  /**
   * Decrypt sensitive string data
   */
  decrypt(encObject) {
    if (!encObject) return null;
    if (typeof encObject === "string") return encObject; // plain string fallback

    try {
      if (encObject.type === "safeStorage" && safeStorage) {
        const buffer = Buffer.from(encObject.data, "base64");
        return safeStorage.decryptString(buffer);
      }
      if (encObject.type === "crypto") {
        const iv = Buffer.from(encObject.iv, "base64");
        const authTag = Buffer.from(encObject.authTag, "base64");
        const decipher = crypto.createDecipheriv("aes-256-gcm", this.fallbackKey, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encObject.data, "base64", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
      }
    } catch (err) {
      logger.error("Decryption failed for stored secret", err);
    }
    return null;
  }

  // --- Public Storage Getters & Setters ---

  setDeviceToken(token) {
    this.data.deviceToken = this.encrypt(token);
    this.saveToFile();
  }

  getDeviceToken() {
    return this.decrypt(this.data.deviceToken);
  }

  setEmployeeId(id) {
    this.data.employeeId = id;
    this.saveToFile();
  }

  getEmployeeId() {
    return this.data.employeeId || null;
  }

  setDeviceId(id) {
    this.data.deviceId = id;
    this.saveToFile();
  }

  getDeviceId() {
    return this.data.deviceId || null;
  }

  setLastSync(timestamp) {
    this.data.lastSync = timestamp;
    this.saveToFile();
  }

  getLastSync() {
    return this.data.lastSync || null;
  }

  setConfig(configObj) {
    this.data.config = { ...this.data.config, ...configObj };
    this.saveToFile();
  }

  getConfig() {
    return this.data.config || {};
  }

  clear() {
    this.data = {};
    this.saveToFile();
  }
}

module.exports = new Storage();
