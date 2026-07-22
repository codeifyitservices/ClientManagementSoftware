import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

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
      // 1. Header (Company details Left, Logo Right)
      if (hasLogo) {
        doc.image(logoPath, 415, 40, { fit: [140, 50], align: "right" });
      }

      doc.fillColor("#0F172A").fontSize(15).text(companyName, 40, 40, { bold: true });
      doc.fillColor("#64748B").fontSize(9)
        .text(companyAddress, 40, 60, { width: 350 })
        .text(`GSTIN: ${companyGst}`, 40, 85);

      // Horizontal Divider Line
      doc.moveTo(40, 110).lineTo(555, 110).strokeColor("#E2E8F0").lineWidth(1).stroke();

      // 2. Tax Invoice Centered Pill Banner
      const invType = (invoice.invoiceType || "TAX INVOICE").toUpperCase();
      doc.rect(225, 120, 145, 22).fill("#0F172A");
      doc.fillColor("#FFFFFF").fontSize(10).text(invType, 225, 126, { width: 145, align: "center", bold: true });

      // 3. Bill To & Invoice Info Split
      const client = invoice.client || {};
      const infoTop = 155;

      // Bill To (Left Column: 40 to 280)
      doc.fillColor("#94A3B8").fontSize(8).text("BILL TO", 40, infoTop, { bold: true });
      doc.fillColor("#0F172A").fontSize(11).text(client.companyName || client.clientName || "Client Name", 40, infoTop + 14, { bold: true });
      
      let addrY = infoTop + 30;
      if (client.clientName && client.companyName) {
        doc.fillColor("#475569").fontSize(9).text(`Attn: ${client.clientName}`, 40, addrY);
        addrY += 14;
      }

      const fullAddr = `${client.address || ""}${client.city ? `, ${client.city}` : ""}${client.pincode ? ` - ${client.pincode}` : ""}`;
      if (fullAddr.trim()) {
        doc.fillColor("#475569").fontSize(9).text(fullAddr, 40, addrY, { width: 250 });
        addrY += doc.heightOfString(fullAddr, { width: 250 }) + 4;
      }

      if (client.gstNumber) {
        doc.fillColor("#475569").fontSize(9).text(`GSTIN: ${client.gstNumber}`, 40, addrY);
        addrY += 14;
      }

      // Invoice Metadata (Right Column: 320 to 555)
      doc.fillColor("#475569").fontSize(9)
        .text(`Invoice No:`, 320, infoTop + 14, { width: 100, align: "right" })
        .text(`${invoice.invoiceNumber}`, 430, infoTop + 14, { width: 125, align: "left", bold: true })
        
        .text(`Invoice Date:`, 320, infoTop + 30, { width: 100, align: "right" })
        .text(`${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString("en-IN")}`, 430, infoTop + 30, { width: 125, align: "left" })
        
        .text(`Payment Status:`, 320, infoTop + 46, { width: 100, align: "right" });

      const isPaid = (invoice.paymentStatus || "").toLowerCase() === "paid";
      doc.fillColor(isPaid ? "#16A34A" : "#D97706").fontSize(9)
        .text(isPaid ? "Paid" : "Pending", 430, infoTop + 46, { width: 125, align: "left", bold: true });

      // Determine Table Top
      const tableTop = Math.max(235, addrY + 15);

      // 4. Items Table Header
      doc.rect(40, tableTop, 515, 22).fill("#F8FAFC");
      doc.moveTo(40, tableTop).lineTo(555, tableTop).strokeColor("#CBD5E1").lineWidth(1).stroke();
      doc.moveTo(40, tableTop + 22).lineTo(555, tableTop + 22).strokeColor("#CBD5E1").lineWidth(1).stroke();

      doc.fillColor("#475569").fontSize(8)
        .text("#", 45, tableTop + 6, { width: 25, align: "center", bold: true })
        .text("Description", 75, tableTop + 6, { width: 225, bold: true })
        .text("SAC Code", 305, tableTop + 6, { width: 60, align: "center", bold: true })
        .text("Qty", 370, tableTop + 6, { width: 35, align: "center", bold: true })
        .text("Rate (Rs.)", 410, tableTop + 6, { width: 65, align: "right", bold: true })
        .text("Amount (Rs.)", 480, tableTop + 6, { width: 70, align: "right", bold: true });

      // 5. Items Table Rows
      let currentY = tableTop + 28;
      const items = invoice.items && invoice.items.length > 0 ? invoice.items : [{
        description: invoice.serviceDescription || "Services",
        sacCode: invoice.sacCode || "998314",
        qty: 1,
        rate: invoice.amount || 0,
        gstRate: invoice.gstRate || 18,
      }];

      let subTotal = 0;
      let totalGst = 0;

      items.forEach((item, idx) => {
        const lineBase = (item.qty || 1) * (item.rate || 0);
        const lineGst = lineBase * ((item.gstRate || 18) / 100);
        subTotal += lineBase;
        totalGst += lineGst;

        const descHeight = doc.heightOfString(item.description || "Item", { width: 225 });
        const rowHeight = Math.max(20, descHeight + 6);

        doc.fillColor("#334155").fontSize(9)
          .text(`${idx + 1}`, 45, currentY, { width: 25, align: "center" })
          .text(item.description || "Item", 75, currentY, { width: 225 })
          .text(item.sacCode || "998314", 305, currentY, { width: 60, align: "center" })
          .text(`${item.qty || 1}`, 370, currentY, { width: 35, align: "center" })
          .text(lineBase.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 410, currentY, { width: 65, align: "right" })
          .text(lineBase.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 480, currentY, { width: 70, align: "right" });

        currentY += rowHeight;
        doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor("#F1F5F9").lineWidth(0.5).stroke();
        currentY += 4;
      });

      const grandTotal = invoice.totalAmount || (subTotal + totalGst);

      // 6. Tax Breakdown & Totals Summary
      currentY += 10;
      const totalBlockX = 330;

      // Detect Interstate vs Intrastate tax label
      const companyStateCode = companyGst ? companyGst.slice(0, 2) : "06";
      const clientStateCode = client.gstNumber ? client.gstNumber.slice(0, 2) : "";
      const isInterstate = clientStateCode && companyStateCode !== clientStateCode;
      const primaryRate = items[0]?.gstRate || 18;

      doc.fillColor("#64748B").fontSize(9)
        .text("Sub Total:", totalBlockX, currentY, { width: 110, align: "right" })
        .text(`Rs. ${subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 450, currentY, { width: 100, align: "right" });

      currentY += 16;
      if (isInterstate) {
        doc.fillColor("#64748B").fontSize(9)
          .text(`IGST (${primaryRate}%):`, totalBlockX, currentY, { width: 110, align: "right" })
          .text(`Rs. ${totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 450, currentY, { width: 100, align: "right" });
        currentY += 16;
      } else {
        const halfGst = totalGst / 2;
        const halfRate = primaryRate / 2;
        doc.fillColor("#64748B").fontSize(9)
          .text(`CGST (${halfRate}%):`, totalBlockX, currentY, { width: 110, align: "right" })
          .text(`Rs. ${halfGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 450, currentY, { width: 100, align: "right" });
        currentY += 16;

        doc.fillColor("#64748B").fontSize(9)
          .text(`SGST (${halfRate}%):`, totalBlockX, currentY, { width: 110, align: "right" })
          .text(`Rs. ${halfGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 450, currentY, { width: 100, align: "right" });
        currentY += 16;
      }

      // Grand Total Line
      doc.moveTo(totalBlockX, currentY).lineTo(555, currentY).strokeColor("#CBD5E1").lineWidth(1).stroke();
      currentY += 6;

      doc.fillColor("#0F172A").fontSize(11)
        .text("Grand Total (Rs.):", totalBlockX, currentY, { width: 110, align: "right", bold: true })
        .text(`Rs. ${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 450, currentY, { width: 100, align: "right", bold: true });

      currentY += 25;

      // 7. Amount in Words & Terms
      doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor("#E2E8F0").lineWidth(1).stroke();
      currentY += 12;

      doc.fillColor("#475569").fontSize(9)
        .text("Amount in Words: ", 40, currentY, { continued: true, bold: true })
        .fillColor("#0F172A").text(numberToWords(grandTotal));

      currentY += 20;
      doc.fillColor("#94A3B8").fontSize(8).text(invoiceTerms, 40, currentY, { width: 515, align: "left", italic: true });

      // 8. Footer Contact Details
      doc.moveTo(40, 780).lineTo(555, 780).strokeColor("#E2E8F0").lineWidth(0.5).stroke();
      doc.fillColor("#94A3B8").fontSize(8)
        .text(`Phone: ${companyPhone}`, 40, 788, { width: 160, align: "left" })
        .text(`Email: ${companyEmail}`, 200, 788, { width: 160, align: "center" })
        .text("www.codenap.in", 395, 788, { width: 160, align: "right" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
