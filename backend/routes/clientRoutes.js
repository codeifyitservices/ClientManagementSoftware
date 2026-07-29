import express from "express";
import Client from "../models/clientModel.js";
import Config from "../models/configModel.js";
import Invoice from "../models/invoiceModel.js";
import multer from "multer";
import fs from "fs";
import path from "path";

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

// Helper to retrieve active configuration, creating one with defaults if none exists
const getActiveConfig = async () => {
  let config = await Config.findOne();
  if (!config) {
    config = new Config();
    await config.save();
  }
  return config;
};

// State Lookup Table
const stateLookup = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
  "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
  "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
  "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
  "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra", "29": "Karnataka",
  "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
  "34": "Puducherry", "35": "Andaman & Nicobar Islands", "36": "Telangana",
  "37": "Andhra Pradesh", "38": "Ladakh"
};

// 0. GET /api/clients/gstin-lookup/:gstin - Fetch company name & details from GSTIN
router.get("/gstin-lookup/:gstin", async (req, res) => {
  try {
    const rawGstin = (req.params.gstin || "").trim().toUpperCase();
    if (!rawGstin || rawGstin.length !== 15) {
      return res.status(400).json({ message: "Invalid GSTIN length. Must be 15 characters." });
    }

    const stateCode = rawGstin.slice(0, 2);
    const stateName = stateLookup[stateCode] || "";

    let companyName = "";
    let tradeName = "";
    let legalName = "";
    let address = "";
    let city = "";
    let pincode = "";
    let fetched = false;
    let note = "";

    const apiKey = process.env.GSTIN_API_KEY || process.env.GST_API_KEY || "";
    const primaryUrl = apiKey
      ? `https://sheet.gstincheck.co.in/check/${apiKey}/${rawGstin}`
      : `https://sheet.gstincheck.co.in/check/free/${rawGstin}`;

    try {
      const apiRes = await fetch(primaryUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(4000),
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && data.flag) {
          const d = data.data || {};
          tradeName = d.tradeNam || "";
          legalName = d.lgnm || "";
          companyName = tradeName || legalName || "";

          const pradr = d.pradr || {};
          const addrObj = pradr.addr || {};
          address = pradr.adr || [addrObj.bnm, addrObj.st, addrObj.loc, addrObj.dst]
            .filter(Boolean)
            .join(", ");
          city = addrObj.dst || addrObj.city || "";
          pincode = addrObj.pncd || "";
          fetched = true;
        } else if (data && data.message) {
          note = data.message;
        }
      }
    } catch (err) {
      note = err.message || "Network timeout";
    }

    return res.json({
      success: true,
      gstin: rawGstin,
      companyName,
      tradeName,
      legalName,
      stateCode,
      stateName,
      address,
      city,
      pincode,
      fetched,
      note,
    });
  } catch (error) {
    res.status(500).json({ message: "Error performing GST lookup", error: error.message });
  }
});

// 1. GET /api/clients/config - Fetch company settings
router.get("/config", async (req, res) => {
  try {
    const config = await getActiveConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: "Error fetching configuration", error: error.message });
  }
});

// 2. POST /api/clients/config - Save or update company settings
router.post("/config", async (req, res) => {
  try {
    const { companyName, companyEmail, companyPhone, companyAddress, companyGst, companyWebsite, invoiceTerms } = req.body;
    
    let config = await Config.findOne();
    if (!config) {
      config = new Config();
    }
    
    config.companyName = companyName ?? config.companyName;
    config.companyEmail = companyEmail ?? config.companyEmail;
    config.companyPhone = companyPhone ?? config.companyPhone;
    config.companyAddress = companyAddress ?? config.companyAddress;
    config.companyGst = companyGst ?? config.companyGst;
    config.companyWebsite = companyWebsite ?? config.companyWebsite;
    config.invoiceTerms = invoiceTerms ?? config.invoiceTerms;

    const savedConfig = await config.save();
    res.json(savedConfig);
  } catch (error) {
    res.status(500).json({ message: "Error saving configuration", error: error.message });
  }
});

// 2b. POST /api/clients/config/logo - Upload brand logo image
router.post("/config/logo", upload.single("logo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No logo image file was uploaded." });
    }

    const config = await getActiveConfig();

    // Remove the previous logo file from disk if present
    if (config.companyLogo) {
      const oldFilePath = path.join(process.cwd(), "uploads", config.companyLogo);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          console.error("Failed to delete outdated logo file:", err.message);
        }
      }
    }

    config.companyLogo = req.file.filename;
    await config.save();

    res.json({
      message: "Company logo updated successfully.",
      companyLogo: config.companyLogo,
    });
  } catch (error) {
    res.status(500).json({ message: "Error uploading logo", error: error.message });
  }
});

// 3. GET /api/clients - Get all clients with search and sorting
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query = {
        $or: [
          { clientName: searchRegex },
          { companyName: searchRegex },
          { email: searchRegex },
        ],
      };
    }

    const clients = await Client.find(query).sort({ companyName: 1 });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: "Error fetching clients", error: error.message });
  }
});

// 4. POST /api/clients - Create a client profile
router.post("/", async (req, res) => {
  try {
    const { companyName, clientName, email, phone, gstRegistered, gstNumber, address, city, pincode, website, industry, notes, isForeign } = req.body;

    if (!companyName || !clientName) {
      return res.status(400).json({ message: "Please provide Company Name and Client Name." });
    }

    const newClient = new Client({
      companyName,
      clientName,
      email: email || "",
      phone,
      gstRegistered: gstRegistered !== false,
      gstNumber,
      address,
      city,
      pincode,
      website,
      industry,
      notes,
      isForeign: isForeign === true,
    });

    const savedClient = await newClient.save();
    res.status(201).json(savedClient);
  } catch (error) {
    res.status(500).json({ message: "Error creating client", error: error.message });
  }
});

// 5. PUT /api/clients/:id - Edit client profile
router.put("/:id", async (req, res) => {
  try {
    const { companyName, clientName, email, phone, gstRegistered, gstNumber, address, city, pincode, website, industry, notes, isForeign } = req.body;
    
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found." });
    }

    client.companyName = companyName ?? client.companyName;
    client.clientName = clientName ?? client.clientName;
    client.email = email ?? client.email;
    client.phone = phone ?? client.phone;
    client.gstRegistered = gstRegistered !== undefined ? gstRegistered : client.gstRegistered;
    client.gstNumber = gstNumber ?? client.gstNumber;
    client.address = address ?? client.address;
    client.city = city ?? client.city;
    client.pincode = pincode ?? client.pincode;
    client.website = website ?? client.website;
    client.industry = industry ?? client.industry;
    client.notes = notes ?? client.notes;
    client.isForeign = isForeign !== undefined ? isForeign : client.isForeign;

    const updatedClient = await client.save();
    res.json(updatedClient);
  } catch (error) {
    res.status(500).json({ message: "Error updating client", error: error.message });
  }
});

// 6. DELETE /api/clients/:id - Delete a client profile (cascade delete invoices)
router.delete("/:id", async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found." });
    }

    // Cascade delete all invoices associated with this client
    await Invoice.deleteMany({ client: req.params.id });

    res.json({ message: "Client profile and all associated invoices deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting client", error: error.message });
  }
});

export default router;
