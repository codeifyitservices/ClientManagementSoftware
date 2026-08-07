import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import * as archiverModule from "archiver";

const createArchiver =
  typeof archiverModule.default === "function"
    ? archiverModule.default
    : typeof archiverModule === "function"
      ? archiverModule
      : (format, opts) => new archiverModule.ZipArchive(opts);



const numberToWords = (num) => {
  if (num === 0) return "Zero Only";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const makeGroup = (n) => {
    let s = "";
    if (n >= 100) {
      s += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      s += b[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      s += a[n] + " ";
    }
    return s.trim();
  };

  let cleanNum = Math.floor(num);
  let words = "";
  if (cleanNum === 0) return "Zero Rupees Only";

  let initialGroup = cleanNum % 1000;
  if (initialGroup > 0) {
    words = makeGroup(initialGroup) + " " + words;
  }
  cleanNum = Math.floor(cleanNum / 1000);

  if (cleanNum > 0) {
    let group = cleanNum % 100;
    if (group > 0) {
      words = makeGroup(group) + " Thousand " + words;
    }
    cleanNum = Math.floor(cleanNum / 100);
  }

  if (cleanNum > 0) {
    let group = cleanNum % 100;
    if (group > 0) {
      words = makeGroup(group) + " Lakh " + words;
    }
    cleanNum = Math.floor(cleanNum / 100);
  }

  if (cleanNum > 0) {
    words = makeGroup(cleanNum) + " Crore " + words;
  }

  return (words.trim() + " Rupees Only").replace(/\s+/g, " ");
};

/**
 * Renders a single invoice onto a PDFKit document instance.
 */

const renderInvoicePage = (doc, invoice, config = {}, isFirstPage = true) => {
  if (!isFirstPage) {
    doc.addPage({ margin: 40, size: "A4" });
  }

  const companyName = config.companyName || "Codenap IT Services";
  const companyAddress = config.companyAddress || "SCO 123, Sector 15, Faridabad, Haryana - 121007";
  const companyPhone = config.companyPhone || "+91 97175 70933";
  const companyEmail = config.companyEmail || "info@codenap.in";
  const companyGst = config.companyGst || "06AABCT1234Q1Z5";
  const invoiceTerms = config.invoiceTerms || "Thank you for your business!";

  let hasLogo = false;
  let logoPath = "";
  if (config.companyLogo) {
    logoPath = path.join(process.cwd(), "uploads", config.companyLogo);
    if (fs.existsSync(logoPath)) {
      hasLogo = true;
    }
  }

  // Printable page width = 515pt (from x=40 to x=555)
  let headerTop = 40;

  // 1. Logo (if present, top-left above company name)
  if (hasLogo) {
    doc.image(logoPath, 40, headerTop, { fit: [120, 45], align: "left" });
    headerTop += 50;
  }

  // Left Column: Company Details ("From")
  doc.font("Helvetica").fontSize(8).fillColor("#64748B").text("FROM", 40, headerTop);
  headerTop += 12;
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#0F172A").text(companyName.toUpperCase(), 40, headerTop);
  doc.font("Helvetica").fontSize(8).fillColor("#475569")
    .text(companyAddress, 40, headerTop + 14, { width: 220 })
    .text(`GSTIN ${companyGst}`, 40, headerTop + 36);

  // Right Column: TAX INVOICE Title & Invoice Number
  doc.font("Helvetica-Bold").fontSize(20).fillColor("#0F172A").text("TAX INVOICE", 380, 40, { width: 175, align: "right" });
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#475569").text(`# ${invoice.invoiceNumber || ""}`, 380, 64, { width: 175, align: "right" });

  // Horizontal Divider Line
  const dividerY = Math.max(125, headerTop + 54);
  doc.moveTo(40, dividerY).lineTo(555, dividerY).strokeColor("#CBD5E1").lineWidth(1).stroke();

  // 2. Bill To (Client) & Invoice Metadata Split
  const client = invoice.client || {};
  const infoTop = dividerY + 12;

  // Bill To (Left Column: 40 to 280)
  doc.font("Helvetica").fontSize(8).fillColor("#64748B").text("BILL TO", 40, infoTop);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#0F172A").text((client.companyName || "Client Company Name").toUpperCase(), 40, infoTop + 12);

  let addrY = infoTop + 26;

  const fullAddr = `${client.address || ""}${client.city ? `, ${client.city}` : ""}${client.pincode ? ` - ${client.pincode}` : ""}`;
  if (fullAddr.trim()) {
    doc.font("Helvetica").fontSize(8).fillColor("#475569").text(fullAddr, 40, addrY, { width: 240 });
    addrY += doc.heightOfString(fullAddr, { width: 240 }) + 3;
  }

  if (client.gstNumber) {
    doc.font("Helvetica").fontSize(8).fillColor("#475569").text(`GSTIN: ${client.gstNumber}`, 40, addrY);
    addrY += 12;
  }

  // Invoice Metadata (Right Column: 340 to 555)
  const isPaid = (invoice.paymentStatus || "").toLowerCase() === "paid";

  doc.font("Helvetica").fontSize(8).fillColor("#475569")
    .text("Invoice Date :", 360, infoTop + 12, { width: 90, align: "right" });
  doc.font("Helvetica").fontSize(8).fillColor("#0F172A")
    .text(`${new Date(invoice.invoiceDate || invoice.createdAt || Date.now()).toLocaleDateString("en-IN")}`, 455, infoTop + 12, { width: 100, align: "left" });

  doc.font("Helvetica").fontSize(8).fillColor("#475569")
    .text("Status :", 360, infoTop + 26, { width: 90, align: "right" });
  doc.font("Helvetica-Bold").fontSize(8).fillColor(isPaid ? "#16A34A" : "#D97706")
    .text(isPaid ? "Paid" : "Pending", 455, infoTop + 26, { width: 100, align: "left" });

  // Determine Table Top
  const tableTop = Math.max(225, addrY + 15);

  // 4. Items Table Header
  doc.rect(40, tableTop, 515, 22).fill("#333333");

  doc.font("Helvetica-Bold").fontSize(8).fillColor("#FFFFFF")
    .text("#", 45, tableTop + 6, { width: 25, align: "center" })
    .text("Description", 75, tableTop + 6, { width: 330 })
    .text("SAC Code", 410, tableTop + 6, { width: 60, align: "center" })
    .text("Amount (Rs.)", 475, tableTop + 6, { width: 75, align: "right" });

  // 5. Items Table Rows
  let currentY = tableTop + 28;
  const items = invoice.items && invoice.items.length > 0 ? invoice.items : [{
    description: invoice.serviceDescription || "Services",
    sacCode: invoice.sacCode || "998314",
    amount: invoice.amount || 0,
    rate: invoice.amount || 0,
    qty: 1,
    gstRate: (invoice.gstRate !== undefined && invoice.gstRate !== null) ? invoice.gstRate : 18,
  }];

  let subTotal = 0;
  let totalGst = 0;

  items.forEach((item, idx) => {
    const lineBase = Number(item.amount !== undefined && item.amount !== null && item.amount !== 0 ? item.amount : ((item.qty || 1) * (item.rate || 0))) || 0;
    const effectiveGstRate = client.isForeign ? 0 : (item.gstRate !== undefined && item.gstRate !== null ? item.gstRate : 18);
    const lineGst = item.isInclusive && item.originalAmount > 0
      ? (item.originalAmount - lineBase)
      : (lineBase * (effectiveGstRate / 100));

    const roundedBase = Math.round(lineBase * 100) / 100;
    const roundedGst = Math.round(lineGst * 100) / 100;

    subTotal += roundedBase;
    totalGst += roundedGst;

    const descHeight = doc.heightOfString(item.description || "Item", { width: 330 });
    const rowHeight = Math.max(20, descHeight + 6);

    doc.font("Helvetica").fontSize(8.5).fillColor("#475569")
      .text(`${idx + 1}`, 45, currentY, { width: 25, align: "center" });
    doc.font("Helvetica").fontSize(8.5).fillColor("#0F172A")
      .text(item.description || "Item", 75, currentY, { width: 330 });
    doc.font("Helvetica").fontSize(8.5).fillColor("#475569")
      .text(item.sacCode || "998314", 410, currentY, { width: 60, align: "center" });
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0F172A")
      .text(lineBase.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 475, currentY, { width: 75, align: "right" });

    currentY += rowHeight;
    doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor("#E2E8F0").lineWidth(0.5).stroke();
    currentY += 4;
  });

  const grandTotal = invoice.totalAmount || (subTotal + totalGst);

  // 6. Tax Breakdown & Totals Summary
  currentY += 10;
  const totalBlockX = 330;

  // Detect Interstate vs Intrastate tax label
  const detectStateCode = (c) => {
    if (!c) return "";
    if (c.gstNumber && typeof c.gstNumber === "string" && /^\d{2}/.test(c.gstNumber.trim())) {
      return c.gstNumber.trim().slice(0, 2);
    }
    const text = `${c.address || ""} ${c.city || ""}`.toLowerCase();
    if (text.includes("west bengal") || text.includes("kolkata") || text.includes("calcutta") || text.includes("wb")) return "19";
    if (text.includes("maharashtra") || text.includes("mumbai") || text.includes("pune") || text.includes("nagpur") || text.includes("mh")) return "27";
    if (text.includes("delhi") || text.includes("new delhi") || text.includes("ncr")) return "07";
    if (text.includes("karnataka") || text.includes("bengaluru") || text.includes("bangalore") || text.includes("ka")) return "29";
    if (text.includes("tamil nadu") || text.includes("chennai") || text.includes("tn")) return "33";
    if (text.includes("telangana") || text.includes("hyderabad") || text.includes("ts")) return "36";
    if (text.includes("gujarat") || text.includes("ahmedabad") || text.includes("surat") || text.includes("gj")) return "24";
    if (text.includes("uttar pradesh") || text.includes("noida") || text.includes("lucknow") || text.includes("kanpur") || text.includes("up")) return "09";
    if (text.includes("punjab") || text.includes("chandigarh") || text.includes("ludhiana") || text.includes("pb")) return "03";
    if (text.includes("rajasthan") || text.includes("jaipur") || text.includes("rj")) return "08";
    if (text.includes("haryana") || text.includes("gurgaon") || text.includes("gurugram") || text.includes("faridabad") || text.includes("hr")) return "06";
    if (text.includes("uttarakhand") || text.includes("dehradun") || text.includes("uk")) return "05";
    if (text.includes("kerala") || text.includes("kochi") || text.includes("cochin") || text.includes("trivandrum") || text.includes("kl")) return "32";
    if (text.includes("madhya pradesh") || text.includes("bhopal") || text.includes("indore") || text.includes("mp")) return "23";
    if (text.includes("bihar") || text.includes("patna") || text.includes("br")) return "10";
    if (text.includes("jharkhand") || text.includes("ranchi") || text.includes("jh")) return "20";
    if (text.includes("odisha") || text.includes("orissa") || text.includes("bhubaneswar") || text.includes("or")) return "21";
    if (text.includes("chhattisgarh") || text.includes("raipur") || text.includes("cg")) return "22";
    if (text.includes("assam") || text.includes("guwahati") || text.includes("as")) return "18";
    if (text.includes("goa") || text.includes("panaji")) return "30";
    if (text.includes("jammu") || text.includes("srinagar") || text.includes("j&k")) return "01";
    if (text.includes("himachal") || text.includes("shimla")) return "02";
    return "";
  };

  const companyStateCode = companyGst ? companyGst.slice(0, 2) : "06";
  const clientStateCode = detectStateCode(client);
  const isInterstate = !!(clientStateCode && companyStateCode !== clientStateCode);
  const primaryRate = client.isForeign ? 0 : (items[0]?.gstRate !== undefined && items[0]?.gstRate !== null ? items[0].gstRate : 18);

  doc.font("Helvetica").fontSize(8.5).fillColor("#475569")
    .text("Sub Total:", totalBlockX, currentY, { width: 110, align: "right" });
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0F172A")
    .text(`Rs. ${subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 450, currentY, { width: 100, align: "right" });

  currentY += 16;
  if (client.isForeign) {
    // Completely remove GST row from the totals breakdown - do nothing
  } else if (isInterstate) {
    doc.font("Helvetica").fontSize(8.5).fillColor("#475569")
      .text(`IGST (${primaryRate}%):`, totalBlockX, currentY, { width: 110, align: "right" });
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0F172A")
      .text(`Rs. ${totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 450, currentY, { width: 100, align: "right" });
    currentY += 16;
  } else {
    const halfGst = totalGst / 2;
    const halfRate = primaryRate / 2;
    doc.font("Helvetica").fontSize(8.5).fillColor("#475569")
      .text(`CGST (${halfRate}%):`, totalBlockX, currentY, { width: 110, align: "right" });
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0F172A")
      .text(`Rs. ${halfGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 450, currentY, { width: 100, align: "right" });
    currentY += 16;

    doc.font("Helvetica").fontSize(8.5).fillColor("#475569")
      .text(`SGST (${halfRate}%):`, totalBlockX, currentY, { width: 110, align: "right" });
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0F172A")
      .text(`Rs. ${halfGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 450, currentY, { width: 100, align: "right" });
    currentY += 16;
  }

  // Grand Total Line Box
  doc.rect(totalBlockX, currentY - 2, 225, 20).fill("#F3F4F6");
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#0F172A")
    .text("Total", totalBlockX + 5, currentY + 3, { width: 105, align: "left" })
    .text(`Rs. ${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 450, currentY + 3, { width: 100, align: "right" });

  currentY += 28;

  // 7. Amount in Words & Terms
  doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor("#E2E8F0").lineWidth(1).stroke();
  currentY += 12;

  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0F172A").text("Amount in Words: ", 40, currentY, { continued: true })
    .font("Helvetica").fillColor("#475569").text(numberToWords(grandTotal));

  currentY += 20;
  doc.font("Helvetica").fontSize(8).fillColor("#64748B").text(invoiceTerms, 40, currentY, { width: 515, align: "left", italic: true });

  // 8. Footer Contact Details
  const companyWebsite = config.companyWebsite || "";
  doc.moveTo(40, 780).lineTo(555, 780).strokeColor("#E2E8F0").lineWidth(0.5).stroke();
  doc.font("Helvetica").fontSize(8).fillColor("#64748B")
    .text(`Phone: ${companyPhone}`, 40, 788, { width: 160, align: "left" })
    .text(`Email: ${companyEmail}`, 200, 788, { width: 160, align: "center" });
  
  if (companyWebsite) {
    doc.text(companyWebsite, 395, 788, { width: 160, align: "right" });
  }
};

/**
 * Generates a professional GST PDF invoice matching the Invoice Preview layout exactly.
 * @param {Object} invoice - The invoice document populated with Client details.
 * @param {Object} config - The company configuration document.
 * @returns {Promise<Buffer>} - Resolves to PDF Buffer.
 */
export const generateInvoicePDF = (invoice, config = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      renderInvoicePage(doc, invoice, config, true);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generates a single multi-page PDF document combining multiple invoices.
 * @param {Array<Object>} invoices - List of invoice documents populated with Client details.
 * @param {Object} config - The company configuration document.
 * @returns {Promise<Buffer>} - Resolves to PDF Buffer.
 */
export const generateCombinedInvoicesPDF = (invoices = [], config = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      invoices.forEach((inv, index) => {
        renderInvoicePage(doc, inv, config, index === 0);
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generates a ZIP archive containing individual PDFs for each selected invoice.
 * @param {Array<Object>} invoices - List of invoice documents populated with Client details.
 * @param {Object} config - The company configuration document.
 * @returns {Promise<Buffer>} - Resolves to ZIP Buffer.
 */
export const generateInvoicesZIP = async (invoices = [], config = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const archive = createArchiver("zip", { zlib: { level: 9 } });
      const buffers = [];

      archive.on("data", (data) => buffers.push(data));
      archive.on("end", () => resolve(Buffer.concat(buffers)));
      archive.on("error", (err) => reject(err));

      for (const invoice of invoices) {
        const pdfBuffer = await generateInvoicePDF(invoice, config);
        const invNum = invoice.invoiceNumber || `INV_${invoice._id}`;
        const cleanInvNum = String(invNum).replace(/[^a-zA-Z0-9_-]/g, "_");
        archive.append(pdfBuffer, { name: `Invoice_${cleanInvNum}.pdf` });
      }

      await archive.finalize();
    } catch (error) {
      reject(error);
    }
  });
};


