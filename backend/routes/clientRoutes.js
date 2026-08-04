import express from "express";
import multer from "multer";
import path from "path";
import {
  gstinLookup,
  getConfig,
  saveConfig,
  uploadLogo,
  getClients,
  createClient,
  updateClient,
  deleteClient,
} from "../controllers/clientController.js";

const router = express.Router();

// Multer Disk Storage Configuration for Company Logos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed."));
    }
  },
});

// GET /api/clients/gstin-lookup/:gstin - Fetch company name & details from GSTIN
router.get("/gstin-lookup/:gstin", gstinLookup);

// GET /api/clients/config - Fetch company settings
router.get("/config", getConfig);

// POST /api/clients/config - Save or update company settings
router.post("/config", saveConfig);

// POST /api/clients/config/logo - Upload brand logo image
router.post("/config/logo", upload.single("logo"), uploadLogo);

// GET /api/clients - Get all clients with search and sorting
router.get("/", getClients);

// POST /api/clients - Create a client profile
router.post("/", createClient);

// PUT /api/clients/:id - Edit client profile
router.put("/:id", updateClient);

// DELETE /api/clients/:id - Delete a client profile (cascade delete invoices & projects)
router.delete("/:id", deleteClient);

export default router;
