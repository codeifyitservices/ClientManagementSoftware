import mongoose from "mongoose";
import Invoice from "../models/invoiceModel.js";
import Client from "../models/clientModel.js";
import Config from "../models/configModel.js";
import {
  generateInvoicePDF,
  generateCombinedInvoicesPDF,
  generateInvoicesZIP,
} from "../services/pdfService.js";
import { sendInvoiceEmail } from "../services/emailService.js";
import Project from "../models/projectModel.js";

// Helper to retrieve active configuration, creating one with defaults if none exists
const getActiveConfig = async () => {
  let config = await Config.findOne();
  if (!config) {
    config = new Config();
    await config.save();
  }
  return config;
};

export const getNextInvoiceNumber = async (date) => {
  const now = date ? new Date(date) : new Date();
  const validDate = isNaN(now.getTime()) ? new Date() : now;
  const yy = validDate.getFullYear().toString().slice(-2);
  const mm = String(validDate.getMonth() + 1).padStart(2, "0");
  const prefix = `CN${yy}${mm}`;

  const regex = new RegExp(`^${prefix}(\\d{4})$`);
  const matchingInvoices = await Invoice.find({ invoiceNumber: regex })
    .select("invoiceNumber")
    .lean();

  let maxSerial = 9; // Starting serial will be 10 ("0010")

  matchingInvoices.forEach((inv) => {
    const match = inv.invoiceNumber?.match(regex);
    if (match && match[1]) {
      const serialNum = parseInt(match[1], 10);
      if (!isNaN(serialNum) && serialNum > maxSerial) {
        maxSerial = serialNum;
      }
    }
  });

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const nextSerial = maxSerial + 1 + attempt;
    const candidate = `${prefix}${String(nextSerial).padStart(4, "0")}`;
    const existing = await Invoice.exists({ invoiceNumber: candidate });
    if (!existing) return candidate;
  }

  return `${prefix}${Date.now().toString().slice(-4)}`;
};

// Helper to update only the date (YYMM) part of an existing invoice number
export const updateInvoiceNumberDatePart = (currentInvoiceNumber, newDate) => {
  if (!currentInvoiceNumber || !newDate) return currentInvoiceNumber;
  const d = new Date(newDate);
  if (isNaN(d.getTime())) return currentInvoiceNumber;

  const yy = d.getFullYear().toString().slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const fullYear = d.getFullYear().toString();

  // Pattern 1: Standard prefix (e.g. CN) followed by 2-digit YY, 2-digit MM, and serial suffix (e.g. CN26030010 -> CN26040010)
  const stdMatch = currentInvoiceNumber.match(
    /^([A-Za-z]+)(\d{2})(\d{2})(.*)$/,
  );
  if (stdMatch) {
    const [, prefix, , , suffix] = stdMatch;
    return `${prefix}${yy}${mm}${suffix}`;
  }

  // Pattern 2: Hyphenated with 4-digit year (e.g. CN-2026-03-001 or CN-202603-001)
  const hyphen4Match = currentInvoiceNumber.match(
    /^([A-Za-z]+[-_])(\d{4})[-_]?(\d{2})([-_].*)$/,
  );
  if (hyphen4Match) {
    const [, prefix, , , suffix] = hyphen4Match;
    return `${prefix}${fullYear}-${mm}${suffix.startsWith("-") || suffix.startsWith("_") ? suffix : "-" + suffix}`;
  }

  // Pattern 3: Hyphenated with 2-digit year (e.g. CN-26-03-001)
  const hyphen2Match = currentInvoiceNumber.match(
    /^([A-Za-z]+[-_])(\d{2})[-_]?(\d{2})([-_].*)$/,
  );
  if (hyphen2Match) {
    const [, prefix, , , suffix] = hyphen2Match;
    return `${prefix}${yy}-${mm}${suffix.startsWith("-") || suffix.startsWith("_") ? suffix : "-" + suffix}`;
  }

  // Pattern 4: Fallback for any alpha prefix + 4-digit date part + rest
  const generalMatch = currentInvoiceNumber.match(/^([A-Za-z]+)(\d{4})(.*)$/);
  if (generalMatch) {
    const [, prefix, , suffix] = generalMatch;
    return `${prefix}${yy}${mm}${suffix}`;
  }

  return currentInvoiceNumber;
};

// GET /api/invoices/next-number - Fetch next sequential invoice number
export const getNextNumber = async (req, res) => {
  try {
    const nextInvoiceNumber = await getNextInvoiceNumber(req.query.date);
    res.json({ invoiceNumber: nextInvoiceNumber });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error generating next invoice number",
        error: error.message,
      });
  }
};

// GET /api/invoices - Fetch invoices (populated with client references)
export const getInvoices = async (req, res) => {
  try {
    const { search, clientId, startDate, endDate } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search, "i");
      // Find client profile IDs matching name or company name search terms
      const matchedClients = await Client.find({
        $or: [{ clientName: searchRegex }, { companyName: searchRegex }],
      }).select("_id");

      const clientIds = matchedClients.map((c) => c._id);

      query.$or = [
        { invoiceNumber: searchRegex },
        { serviceDescription: searchRegex },
        { client: { $in: clientIds } },
      ];
    }

    if (clientId) {
      query.client = clientId;
    }

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.invoiceDate.$lte = end;
      }
    }

    const invoices = await Invoice.find(query)
      .populate("client")
      .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching invoices", error: error.message });
  }
};

// GET /api/invoices/:id - Fetch single invoice details (by ObjectId or invoiceNumber)
export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    let invoice = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      invoice = await Invoice.findById(id).populate("client");
    }

    if (!invoice) {
      invoice = await Invoice.findOne({ invoiceNumber: id }).populate("client");
    }

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    res.json(invoice);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching invoice", error: error.message });
  }
};

// GET /api/invoices/download-zip - Bulk download selected invoices as ZIP
export const downloadZip = async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ message: "No invoice IDs provided." });
    }

    const idArray = String(ids)
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (idArray.length === 0) {
      return res.status(400).json({ message: "Invalid invoice IDs provided." });
    }

    const invoices = await Invoice.find({ _id: { $in: idArray } }).populate(
      "client",
    );
    if (!invoices || invoices.length === 0) {
      return res.status(404).json({ message: "No matching invoices found." });
    }

    const config = await getActiveConfig();
    const zipBuffer = await generateInvoicesZIP(invoices, config);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Invoices_Archive_${Date.now()}.zip`,
    );
    res.send(zipBuffer);
  } catch (error) {
    console.error("ZIP generation error:", error);
    res
      .status(500)
      .json({ message: "Error generating ZIP download", error: error.message });
  }
};

// GET /api/invoices/download-combined-pdf - Bulk download selected invoices as single combined PDF
export const downloadCombinedPDF = async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ message: "No invoice IDs provided." });
    }

    const idArray = String(ids)
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (idArray.length === 0) {
      return res.status(400).json({ message: "Invalid invoice IDs provided." });
    }

    const invoices = await Invoice.find({ _id: { $in: idArray } }).populate(
      "client",
    );
    if (!invoices || invoices.length === 0) {
      return res.status(404).json({ message: "No matching invoices found." });
    }

    const config = await getActiveConfig();
    const pdfBuffer = await generateCombinedInvoicesPDF(invoices, config);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Invoices_Combined_${Date.now()}.pdf`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Combined PDF generation error:", error);
    res
      .status(500)
      .json({
        message: "Error generating combined PDF download",
        error: error.message,
      });
  }
};

// Helper function to sync milestone invoicedAmount, paidAmount, invoices list, and status across project milestones sequentially
export const syncMilestoneInvoiceStatus = async (projectId) => {
  if (!projectId) return;
  try {
    const ProjectModel = mongoose.model("Project");
    const project = await ProjectModel.findById(projectId);
    if (!project || !project.milestones || project.milestones.length === 0)
      return;

    // Find all invoices associated with this project
    const allProjectInvoices = await Invoice.find({
      $or: [
        { projectId: project._id },
        {
          _id: {
            $in: project.milestones.flatMap(
              (m) => m.invoices || (m.invoice ? [m.invoice] : []),
            ),
          },
        },
      ],
    });

    let carryOverInvoiced = 0;
    let carryOverPaid = 0;

    for (let i = 0; i < project.milestones.length; i++) {
      const m = project.milestones[i];

      // Find invoices directly associated with milestone m
      const directInvoices = allProjectInvoices.filter(
        (inv) =>
          inv.milestoneId?.toString() === m._id.toString() ||
          m.invoices?.some(
            (invId) => invId.toString() === inv._id.toString(),
          ) ||
          m.invoice?.toString() === inv._id.toString(),
      );

      let directInvoiced = 0;
      let directPaid = 0;
      const invoiceIds = [];

      directInvoices.forEach((inv) => {
        if (!invoiceIds.some((id) => id.toString() === inv._id.toString())) {
          invoiceIds.push(inv._id);
        }
        const invVal =
          inv.totalAmount !== undefined &&
          inv.totalAmount !== null &&
          inv.totalAmount > 0
            ? inv.totalAmount
            : inv.amount || 0;

        directInvoiced += invVal;
        if (inv.paymentStatus === "Paid") {
          directPaid += invVal;
        }
      });

      m.invoices = invoiceIds;
      m.invoice = invoiceIds[0] || null;

      // Add carried-over excess from previous milestone(s)
      const totalInvoiced =
        Math.round((directInvoiced + carryOverInvoiced) * 100) / 100;
      const totalPaid = Math.round((directPaid + carryOverPaid) * 100) / 100;

      // Amount credited to this milestone is capped at m.amount
      m.invoicedAmount = Math.min(m.amount, totalInvoiced);
      m.paidAmount = Math.min(m.amount, totalPaid);

      // Remaining excess cascades to next milestone
      carryOverInvoiced = Math.max(
        0,
        Math.round((totalInvoiced - m.amount) * 100) / 100,
      );
      carryOverPaid = Math.max(
        0,
        Math.round((totalPaid - m.amount) * 100) / 100,
      );

      // Set milestone status
      if (m.paidAmount >= m.amount && m.amount > 0) {
        m.status = "Paid";
      } else if (m.paidAmount > 0) {
        m.status = "Partially Paid";
      } else if (m.invoicedAmount >= m.amount && m.amount > 0) {
        m.status = "Invoiced";
      } else if (m.invoicedAmount > 0) {
        m.status = "Partially Invoiced";
      } else {
        m.status = "Pending";
      }
    }

    await project.save();
  } catch (err) {
    console.error("Error syncing project milestone invoice status:", err);
  }
};

// POST /api/invoices - Create a GST invoice
export const createInvoice = async (req, res) => {
  try {
    const {
      client,
      invoiceNumber: customInvoiceNumber,
      invoiceDate,
      dueDate,
      invoiceType,
      currency,
      notes,
      items,
      paymentStatus,
      projectId,
      milestoneId,
    } = req.body;

    if (
      !client ||
      !dueDate ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res
        .status(400)
        .json({
          message:
            "Please provide Client Profile, Due Date, and at least one Invoice Item.",
        });
    }

    let invoiceNumber = customInvoiceNumber
      ? String(customInvoiceNumber).trim().toUpperCase()
      : "";

    if (invoiceNumber) {
      const existing = await Invoice.findOne({ invoiceNumber });
      if (existing) {
        return res
          .status(400)
          .json({
            message: `Invoice number "${invoiceNumber}" is already in use.`,
          });
      }
    } else {
      invoiceNumber = await getNextInvoiceNumber(invoiceDate);
    }

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
      projectId: projectId || null,
      milestoneId: milestoneId || null,
    });

    const savedInvoice = await newInvoice.save();

    if (projectId) {
      await syncMilestoneInvoiceStatus(projectId);
    }

    const populated = await savedInvoice.populate("client");

    res.status(201).json(populated);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating invoice", error: error.message });
  }
};

// PUT /api/invoices/:id - Edit an invoice
export const updateInvoice = async (req, res) => {
  try {
    const {
      client,
      invoiceNumber: customInvoiceNumber,
      invoiceDate,
      dueDate,
      invoiceType,
      currency,
      notes,
      items,
      paymentStatus,
      projectId,
      milestoneId,
    } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    const oldInvoiceNumber = invoice.invoiceNumber;

    if (customInvoiceNumber && customInvoiceNumber.trim()) {
      const cleanCustomNum = customInvoiceNumber.trim().toUpperCase();
      if (cleanCustomNum !== invoice.invoiceNumber) {
        const existing = await Invoice.findOne({
          invoiceNumber: cleanCustomNum,
          _id: { $ne: invoice._id },
        });
        if (existing) {
          return res
            .status(400)
            .json({
              message: `Invoice number "${cleanCustomNum}" is already in use by another invoice.`,
            });
        }
        invoice.invoiceNumber = cleanCustomNum;
      }
    } else if (invoiceDate && invoiceDate !== invoice.invoiceDate) {
      const newD = new Date(invoiceDate);
      if (!isNaN(newD.getTime())) {
        const updatedInvoiceNumber = updateInvoiceNumberDatePart(
          invoice.invoiceNumber,
          newD,
        );
        if (
          updatedInvoiceNumber &&
          updatedInvoiceNumber !== invoice.invoiceNumber
        ) {
          const existing = await Invoice.findOne({
            invoiceNumber: updatedInvoiceNumber,
            _id: { $ne: invoice._id },
          });
          if (!existing) {
            invoice.invoiceNumber = updatedInvoiceNumber;
          } else {
            invoice.invoiceNumber = await getNextInvoiceNumber(newD);
          }
        }
      }
    }

    invoice.client = client ?? invoice.client;
    if (invoiceDate) {
      invoice.invoiceDate = invoiceDate;
    }
    invoice.dueDate = dueDate ?? invoice.dueDate;
    invoice.invoiceType = invoiceType ?? invoice.invoiceType;
    invoice.currency = currency ?? invoice.currency;
    invoice.notes = notes ?? invoice.notes;
    invoice.items = items ?? invoice.items;
    invoice.paymentStatus = paymentStatus ?? invoice.paymentStatus;
    if (projectId !== undefined) invoice.projectId = projectId || null;
    if (milestoneId !== undefined) invoice.milestoneId = milestoneId || null;

    const updatedInvoice = await invoice.save();

    if (invoice.projectId) {
      await syncMilestoneInvoiceStatus(invoice.projectId);
    }

    // If invoiceNumber updated, keep subscription payments in sync
    if (oldInvoiceNumber && updatedInvoice.invoiceNumber !== oldInvoiceNumber) {
      try {
        const Subscription = mongoose.model("Subscription");
        await Subscription.updateMany(
          { "payments.invoiceNumber": oldInvoiceNumber },
          {
            $set: {
              "payments.$[p].invoiceNumber": updatedInvoice.invoiceNumber,
            },
          },
          { arrayFilters: [{ "p.invoiceNumber": oldInvoiceNumber }] },
        );
      } catch (subErr) {
        console.error(
          "Error updating subscription payments with new invoiceNumber:",
          subErr,
        );
      }
    }

    const populated = await updatedInvoice.populate("client");

    res.json(populated);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating invoice", error: error.message });
  }
};

// DELETE /api/invoices/:id - Delete an invoice
export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    const linkedProjId = invoice.projectId;

    await Invoice.findByIdAndDelete(req.params.id);

    // Pull invoice ID from any milestone invoices array
    await Project.updateMany(
      { "milestones.invoices": req.params.id },
      { $pull: { "milestones.$.invoices": req.params.id } },
    );
    await Project.updateMany(
      { "milestones.invoice": req.params.id },
      { $set: { "milestones.$.invoice": null } },
    );

    if (linkedProjId) {
      await syncMilestoneInvoiceStatus(linkedProjId);
    }

    res.json({ message: "Invoice deleted successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting invoice", error: error.message });
  }
};

// POST /api/invoices/:id/mark-paid - Mark as Paid
export const markPaid = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate("client");
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    invoice.paymentStatus = "Paid";
    await invoice.save();

    if (invoice.projectId) {
      await syncMilestoneInvoiceStatus(invoice.projectId);
    } else {
      // Check if any project milestone references this invoice ID
      const linkedProject = await Project.findOne({
        $or: [
          { "milestones.invoices": invoice._id },
          { "milestones.invoice": invoice._id },
        ],
      });
      if (linkedProject) {
        await syncMilestoneInvoiceStatus(linkedProject._id);
      }
    }

    res.json({
      success: true,
      invoice,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error marking invoice as paid", error: error.message });
  }
};

// POST /api/invoices/:id/resend-email - Send invoice PDF email manually
export const resendEmail = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate("client");
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    if (!invoice.client || !invoice.client.email) {
      return res
        .status(400)
        .json({ message: "Client email is missing for this invoice." });
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
};

// GET /api/invoices/:id/download-pdf - Stream single PDF to browser
export const downloadPDF = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate("client");
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    const config = await getActiveConfig();
    const pdfBuffer = await generateInvoicePDF(invoice, config);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Invoice_${invoice.invoiceNumber}.pdf`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error generating PDF download", error: error.message });
  }
};
