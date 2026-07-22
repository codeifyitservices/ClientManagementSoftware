import express from "express";
import mongoose from "mongoose";
import Invoice from "../models/invoiceModel.js";
import Client from "../models/clientModel.js";
import Config from "../models/configModel.js";
import { generateInvoicePDF } from "../services/pdfService.js";
import { sendInvoiceEmail } from "../services/emailService.js";

const router = express.Router();

// Helper to retrieve active configuration, creating one with defaults if none exists
const getActiveConfig = async () => {
  let config = await Config.findOne();
  if (!config) {
    config = new Config();
    await config.save();
  }
  return config;
};

const getNextInvoiceNumber = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const latestNumericInvoice = await Invoice.findOne({
      invoiceNumber: /^INV-\d+$/,
    }).sort({ invoiceNumber: -1 });

    let count = 0;
    if (latestNumericInvoice?.invoiceNumber) {
      const lastNum = parseInt(latestNumericInvoice.invoiceNumber.split("-")[1], 10);
      if (!isNaN(lastNum)) count = lastNum;
    }

    const candidate = `INV-${String(count + attempt + 1).padStart(4, "0")}`;
    const existing = await Invoice.exists({ invoiceNumber: candidate });
    if (!existing) return candidate;
  }

  return `INV-${Date.now()}`;
};

// 1. GET /api/invoices - Fetch invoices (populated with client references)
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search, "i");
      // Find client profile IDs matching name or company name search terms
      const matchedClients = await Client.find({
        $or: [
          { clientName: searchRegex },
          { companyName: searchRegex },
        ],
      }).select("_id");

      const clientIds = matchedClients.map((c) => c._id);

      query = {
        $or: [
          { invoiceNumber: searchRegex },
          { serviceDescription: searchRegex },
          { client: { $in: clientIds } },
        ],
      };
    }

    const invoices = await Invoice.find(query)
      .populate("client")
      .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: "Error fetching invoices", error: error.message });
  }
});

// 2. POST /api/invoices - Create a GST invoice
router.post("/", async (req, res) => {
  try {
    const { client, invoiceDate, dueDate, invoiceType, currency, notes, items, paymentStatus } = req.body;

    if (!client || !dueDate || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Please provide Client Profile, Due Date, and at least one Invoice Item." });
    }

    const invoiceNumber = await getNextInvoiceNumber();

    const newInvoice = new Invoice({
      invoiceNumber,
      client,
      invoiceDate: invoiceDate || undefined,
      dueDate,
      invoiceType: invoiceType || "Tax Invoice",
      currency: currency || "INR (₹)",
      notes: notes || "",
      items: items,
      paymentStatus: paymentStatus || "Pending",
    });

    const savedInvoice = await newInvoice.save();
    const populated = await savedInvoice.populate("client");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Error creating invoice", error: error.message });
  }
});

// 3. PUT /api/invoices/:id - Edit an invoice
router.put("/:id", async (req, res) => {
  try {
    const { client, invoiceDate, dueDate, invoiceType, currency, notes, items, paymentStatus } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    invoice.client = client ?? invoice.client;
    invoice.invoiceDate = invoiceDate ?? invoice.invoiceDate;
    invoice.dueDate = dueDate ?? invoice.dueDate;
    invoice.invoiceType = invoiceType ?? invoice.invoiceType;
    invoice.currency = currency ?? invoice.currency;
    invoice.notes = notes ?? invoice.notes;
    invoice.items = items ?? invoice.items;
    invoice.paymentStatus = paymentStatus ?? invoice.paymentStatus;

    const updatedInvoice = await invoice.save();
    const populated = await updatedInvoice.populate("client");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Error updating invoice", error: error.message });
  }
});

// 4. DELETE /api/invoices/:id - Delete an invoice
router.delete("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }
    res.json({ message: "Invoice deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting invoice", error: error.message });
  }
});

// 5. POST /api/invoices/:id/mark-paid - Mark as Paid
router.post("/:id/mark-paid", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate("client");
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    invoice.paymentStatus = "Paid";
    await invoice.save();

    res.json({
      success: true,
      invoice,
    });
  } catch (error) {
    res.status(500).json({ message: "Error marking invoice as paid", error: error.message });
  }
});

// 6. POST /api/invoices/:id/resend-email - Send invoice PDF email manually
router.post("/:id/resend-email", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate("client");
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    if (!invoice.client || !invoice.client.email) {
      return res.status(400).json({ message: "Client email is missing for this invoice." });
    }

    const config = await getActiveConfig();
    const pdfBuffer = await generateInvoicePDF(invoice, config);

    const emailMeta = {
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.client.clientName,
      email: invoice.client.email,
      serviceDescription: invoice.serviceDescription || "Services",
      amount: invoice.totalAmount || invoice.amount || 0,
    };

    const emailResult = await sendInvoiceEmail(emailMeta, pdfBuffer, config);
    res.json({
      message: `Invoice email sent to ${invoice.client.email}`,
      isFallback: !!emailResult?.isFallback,
      previewUrl: emailResult?.previewUrl || "",
    });
  } catch (error) {
    console.error("Manual email send error:", error);
    res.status(500).json({ message: error.message || "Error sending email." });
  }
});

// 7. GET /api/invoices/:id/download-pdf - Stream PDF to browser
router.get("/:id/download-pdf", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate("client");
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    const config = await getActiveConfig();
    const pdfBuffer = await generateInvoicePDF(invoice, config);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Invoice_${invoice.invoiceNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: "Error generating PDF download", error: error.message });
  }
});

export default router;
