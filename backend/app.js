import "./config/dotenv.js";
import express from "express";
import cors from "cors";
import connectMongo from "./config/db.js";
import clientRoutes from "./routes/clientRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import backupRoutes from "./routes/backupRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import protect from "./middleware/authMiddleware.js";
import { startSubscriptionScheduler } from "./services/subscriptionScheduler.js";
import { sendEmail } from "./services/emailService.js";
import Service from "./models/serviceModel.js";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 5000;

connectMongo();
startSubscriptionScheduler();

// Ensure uploads directory exists on boot
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

app.use("/api/auth", authRoutes);
app.use("/api/clients", protect, clientRoutes);
app.use("/api/invoices", protect, invoiceRoutes);
app.use("/api/services", protect, serviceRoutes);
app.use("/api/backup", protect, backupRoutes);
app.use("/api/subscriptions", protect, subscriptionRoutes);
app.use("/api/projects", protect, projectRoutes);
app.use("/api/employees", protect, employeeRoutes);
app.use("/api/tasks", protect, taskRoutes);
app.use("/api/tickets", protect, ticketRoutes);
app.use("/api/notifications", protect, notificationRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/attendance", protect, attendanceRoutes);
app.use("/api/leads", protect, leadRoutes);

app.post("/api/test-email", async (req, res) => {
  const { to } = req.body;
  if (!to) {
    return res.status(400).json({ success: false, message: "Please provide a 'to' email address in request body JSON." });
  }

  const result = await sendEmail({
    to: to.trim(),
    subject: "Test Email from Codenap CRM (Brevo HTTP API)",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; margin: 0 auto;">
        <h2 style="color: #4F46E5; margin-top: 0;">Brevo Email Integration Success 🎉</h2>
        <p>Hello,</p>
        <p>This test email confirms that your <strong>Brevo Transactional Email HTTP API</strong> integration is working seamlessly on <strong>Render Free</strong>!</p>
        <div style="background-color: #f8fafc; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #475569; margin: 16px 0;">
          <strong>Timestamp:</strong> ${new Date().toLocaleString("en-IN")}<br/>
          <strong>Transport:</strong> Brevo API v3 (HTTPS Port 443)
        </div>
        <p>Best regards,<br/><strong>Codenap - Professional IT Solutions</strong></p>
      </div>
    `,
    text: `Brevo Email Integration Success! Sent at: ${new Date().toLocaleString("en-IN")}`,
  });

  if (result.success) {
    return res.json({ success: true, message: `Test email successfully sent to ${to}`, messageId: result.messageId });
  } else {
    return res.status(500).json({ success: false, message: result.error || "Failed to send test email" });
  }
});

app.use("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is up and running🎉",
  });
});

app.listen(PORT, () => {
  // Force nodemon reload after fixing mongoose save hook
  console.log("server is running on port:", PORT);
});
