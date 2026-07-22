import express from "express";
import cors from "cors";
import connectMongo from "./config/db.js";
import "./config/dotenv.js";
import clientRoutes from "./routes/clientRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import protect from "./middleware/authMiddleware.js";
import Service from "./models/serviceModel.js";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 5000;

connectMongo();

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

