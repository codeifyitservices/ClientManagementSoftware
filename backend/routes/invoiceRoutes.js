import express from "express";
import {
  getNextNumber,
  getInvoices,
  downloadZip,
  downloadCombinedPDF,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  markPaid,
  resendEmail,
  downloadPDF,
} from "../controllers/invoiceController.js";

const router = express.Router();

// GET /api/invoices/next-number - Fetch next sequential invoice number
router.get("/next-number", getNextNumber);

// GET /api/invoices - Fetch invoices (populated with client references)
router.get("/", getInvoices);

// GET /api/invoices/download-zip - Bulk download selected invoices as ZIP (MUST BE BEFORE /:id)
router.get("/download-zip", downloadZip);

// GET /api/invoices/download-combined-pdf - Bulk download selected invoices as single combined PDF (MUST BE BEFORE /:id)
router.get("/download-combined-pdf", downloadCombinedPDF);

// POST /api/invoices - Create a GST invoice
router.post("/", createInvoice);

// PUT /api/invoices/:id - Edit an invoice
router.put("/:id", updateInvoice);

// DELETE /api/invoices/:id - Delete an invoice
router.delete("/:id", deleteInvoice);

// POST /api/invoices/:id/mark-paid - Mark as Paid
router.post("/:id/mark-paid", markPaid);

// POST /api/invoices/:id/resend-email - Send invoice PDF email manually
router.post("/:id/resend-email", resendEmail);

// GET /api/invoices/:id/download-pdf - Stream single PDF to browser
router.get("/:id/download-pdf", downloadPDF);

export default router;
