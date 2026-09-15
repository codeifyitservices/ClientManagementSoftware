const http = require("http");
const logger = require("../logger/logger");
const config = require("../config");
const authManager = require("../auth/authManager");

class LocalHttpServer {
  constructor() {
    this.server = null;
    this.port = 49152;
    this.isRunning = false;
  }

  start(port = 49152) {
    this.port = port;
    if (this.server) return;

    this.server = http.createServer((req, res) => {
      // Set permissive CORS headers for local browser dashboard
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://127.0.0.1:${this.port}`);

      if (url.pathname === "/health" || url.pathname === "/status" || url.pathname === "/") {
        let currentStatus = "Offline";
        try {
          const idleDetector = require("../idle/idleDetector");
          currentStatus = idleDetector.getCurrentStatus();
        } catch (err) {}

        const responseData = {
          running: true,
          paired: authManager.isPaired(),
          employeeId: authManager.getEmployeeId(),
          deviceId: authManager.getDeviceId(),
          currentStatus,
          version: config.version,
          appName: config.appName,
          timestamp: new Date().toISOString(),
        };

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(responseData));
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });

    this.server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        logger.warn(`[LocalHttpServer] Port ${this.port} is already in use by another agent instance.`);
      } else {
        logger.error("[LocalHttpServer] Error starting local server:", err);
      }
      this.isRunning = false;
    });

    try {
      this.server.listen(this.port, "127.0.0.1", () => {
        this.isRunning = true;
        logger.info(`[LocalHttpServer] Local loopback probe server listening on http://127.0.0.1:${this.port}`);
      });
    } catch (err) {
      logger.error("[LocalHttpServer] Exception starting listener", err);
    }
  }

  stop() {
    if (this.server) {
      try {
        this.server.close();
      } catch (err) {}
      this.server = null;
      this.isRunning = false;
      logger.info("[LocalHttpServer] Stopped local loopback server");
    }
  }
}

module.exports = new LocalHttpServer();
