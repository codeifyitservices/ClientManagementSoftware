import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/client-management";

async function run() {
  try {
    try {
      dns.setServers(["8.8.8.8", "8.8.4.4"]);
    } catch (dnsErr) {
      console.warn("Could not set DNS servers:", dnsErr.message);
    }
    await mongoose.connect(MONGO_URI);
    console.log("Watching heartbeats...");

    for (let i = 0; i < 7; i++) {
      const session = await mongoose.connection.db.collection("agentsessions").findOne({
        deviceId: "AGENT-DEV-5780A9EED27A97518B8C286C"
      });
      if (session) {
        console.log(`[${new Date().toLocaleTimeString()}] Last Heartbeat: ${new Date(session.lastHeartbeatAt).toLocaleTimeString()} | Status: ${session.currentStatus} | Idle: ${session.idleTimeSeconds}s`);
      } else {
        console.log("No session found");
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
