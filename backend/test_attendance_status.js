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
    const attendance = await mongoose.connection.db.collection("attendances").findOne({
      employee: new mongoose.Types.ObjectId("6a6c8ccbd6b5b27dadbf35fe"),
      date: "2026-08-03"
    });
    if (attendance) {
      console.log("Current Status:", attendance.currentStatus);
      console.log("Timeline events count:", attendance.timeline.length);
      console.log("Timeline events:", attendance.timeline.map(e => `${new Date(e.timestamp).toLocaleTimeString()} - ${e.eventType} - ${e.description}`));
    } else {
      console.log("No attendance record found for today");
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
