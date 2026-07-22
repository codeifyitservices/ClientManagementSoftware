import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

/**
 * Generates a professional GST PDF invoice as a buffer.
 * @param {Object} invoice - The invoice document populated with Client details.
 * @param {Object} config - The company configuration document.
 * @returns {Promise<Buffer>} - A promise that resolves to the PDF file buffer.
 */
export const generateInvoicePDF = (invoice, config = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Resolve Company details from dynamic settings
      const companyName = config.companyName || "ClientFlow Inc.";
      const companyAddress = config.companyAddress || "123 Innovation Way, Tech Park, Bangalore, KA 560001";
      const companyPhone = config.companyPhone || "+91 98765 43210";
      const companyEmail = config.companyEmail || "contact@clientflow.com";
      const companyGst = config.companyGst || "29AAAAA0000A1Z5";
      const invoiceTerms = config.invoiceTerms || "Thank you for your business! Please pay within 15 days of invoice date.";

      // Check if Company Logo exists
      let hasLogo = false;
      let logoPath = "";
      if (config.companyLogo) {
        logoPath = path.join(process.cwd(), "uploads", config.companyLogo);
        if (fs.existsSync(logoPath)) {
          hasLogo = true;
        }
      }

      // 1. Header (Company details & Brand Logo)
      if (hasLogo) {
        doc.image(logoPath, 50, 45, { fit: [100, 55] });
        doc.fillColor("#4F46E5").fontSize(18).text(companyName, 165, 45, { bold: true });
        doc.fillColor("#4B5563").fontSize(9)
          .text(companyAddress, 165, 68, { width: 220 })
          .text(`Phone: ${companyPhone} | Email: ${companyEmail} | GSTIN: ${companyGst}`, 165, 92, { width: 220 });
      } else {
        doc.fillColor("#4F46E5").fontSize(24).text(companyName, 50, 45, { bold: true });
        doc.fillColor("#4B5563").fontSize(10)
          .text(companyAddress, 50, 75)
          .text(`Phone: ${companyPhone} | Email: ${companyEmail}`, 50, 90)
          .text(`GSTIN: ${companyGst}`, 50, 105);
      }

      // Horizontal line
      doc.moveTo(50, 125).lineTo(545, 125).strokeColor("#E5E7EB").lineWidth(1).stroke();

      // 2. Invoice Details (Top Right)
      const invType = invoice.invoiceType || "TAX INVOICE";
      doc.fillColor("#111827").fontSize(16).text(invType.toUpperCase(), 400, 45, { align: "right" });
      doc.fillColor("#4B5563").fontSize(10)
        .text(`Invoice No: ${invoice.invoiceNumber}`, 400, 70, { align: "right" })
        .text(`Date: ${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString("en-IN")}`, 400, 85, { align: "right" });

      // 3. Bill To Section
      doc.fillColor("#111827").fontSize(11).text("BILL TO:", 50, 140, { bold: true });
      
      let clientY = 158;
      const client = invoice.client || {};
      
      doc.fillColor("#374151").fontSize(10)
        .text(`Client Name: ${client.clientName || "N/A"}`, 50, clientY);
      clientY += 15;
      
      doc.text(`Company: ${client.companyName || "N/A"}`, 50, clientY);
      clientY += 15;
      
      if (client.email) {
        doc.text(`Email: ${client.email}`, 50, clientY);
        clientY += 15;
      }
      
      if (client.address) {
        const fullAddr = `${client.address}${client.city ? `, ${client.city}` : ""}${client.pincode ? ` - ${client.pincode}` : ""}`;
        doc.text(`Address: ${fullAddr}`, 50, clientY, { width: 260 });
        clientY += doc.heightOfString(`Address: ${fullAddr}`, { width: 260 }) + 5;
      }
      
      if (client.gstNumber) {
        doc.text(`GSTIN: ${client.gstNumber}`, 50, clientY);
        clientY += 15;
      }

      // 4. Payment Info Section (If Paid)
      const payStatusTop = 140;
      if (invoice.paymentStatus === "Paid") {
        doc.fillColor("#10B981").fontSize(11).text("STATUS: PAID", 400, payStatusTop, { bold: true, align: "right" });
        const paymentDate = invoice.invoiceSentAt ? new Date(invoice.invoiceSentAt) : new Date();
        doc.fillColor("#4B5563").fontSize(10).text(`Payment Date: ${paymentDate.toLocaleDateString("en-IN")}`, 400, payStatusTop + 15, { align: "right" });
      } else {
        doc.fillColor("#F59E0B").fontSize(11).text("STATUS: PENDING", 400, payStatusTop, { bold: true, align: "right" });
      }

      // Determine Table Top dynamically
      const tableTop = Math.max(270, clientY + 15);

      // 5. Table Header
      doc.rect(50, tableTop, 495, 20).fill("#F3F4F6");
      doc.fillColor("#374151").fontSize(9)
        .text("Description", 55, tableTop + 5, { width: 140 })
        .text("SAC Code", 200, tableTop + 5, { width: 60, align: "center" })
        .text("Taxable Amt", 260, tableTop + 5, { width: 70, align: "right" })
        .text("Qty / Rate", 335, tableTop + 5, { width: 60, align: "center" })
        .text("GST Rate", 400, tableTop + 5, { width: 50, align: "center" })
        .text("Total Value", 460, tableTop + 5, { width: 80, align: "right" });

      // 6. Table Rows
      let currentY = tableTop + 25;
      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item) => {
          const itemBase = item.qty * item.rate;
          doc.fillColor("#111827").fontSize(9)
            .text(item.description, 55, currentY, { width: 140 })
            .text(item.sacCode || "9983", 200, currentY, { width: 60, align: "center" })
            .text(`Rs. ${itemBase.toFixed(2)}`, 260, currentY, { width: 70, align: "right" })
            .text(`${item.qty} x Rs. ${item.rate}`, 335, currentY, { width: 60, align: "center" })
            .text(`${item.gstRate}%`, 400, currentY, { width: 50, align: "center" })
            .text(`Rs. ${(itemBase * (1 + item.gstRate / 100)).toFixed(2)}`, 460, currentY, { width: 80, align: "right" });
          
          currentY += 20;
        });
      } else {
        // Fallback for simple flat records
        doc.fillColor("#111827").fontSize(9)
          .text(invoice.serviceDescription, 55, currentY, { width: 140 })
          .text(invoice.sacCode, 200, currentY, { width: 60, align: "center" })
          .text(`Rs. ${invoice.amount.toFixed(2)}`, 260, currentY, { width: 70, align: "right" })
          .text(`1 x Rs. ${invoice.amount}`, 335, currentY, { width: 60, align: "center" })
          .text(`${invoice.gstRate}%`, 400, currentY, { width: 50, align: "center" })
          .text(`Rs. ${invoice.totalAmount.toFixed(2)}`, 460, currentY, { width: 80, align: "right" });
        currentY += 20;
      }

      // Horizontal line below row
      doc.moveTo(50, currentY + 10).lineTo(545, currentY + 10).strokeColor("#E5E7EB").lineWidth(1).stroke();

      // 7. Totals Summary
      const totalTop = currentY + 25;
      doc.fillColor("#4B5563").fontSize(10)
        .text("Taxable Value:", 330, totalTop, { align: "right" })
        .text(`GST Component:`, 330, totalTop + 15, { align: "right" })
        .text("Grand Total (INR):", 330, totalTop + 35, { align: "right" });

      doc.fillColor("#111827").fontSize(10)
        .text(`Rs. ${invoice.amount.toFixed(2)}`, 450, totalTop, { align: "right" })
        .text(`Rs. ${invoice.gstAmount.toFixed(2)}`, 450, totalTop + 15, { align: "right" });
      
      doc.fontSize(13).text(`Rs. ${invoice.totalAmount.toFixed(2)}`, 450, totalTop + 33, { bold: true, align: "right" });

      // 8. Footer Notes & Terms
      doc.fillColor("#9CA3AF").fontSize(9)
        .text("Thank you for your business!", 50, 680, { align: "center" })
        .text(invoiceTerms, 50, 695, { align: "center", width: 495 })
        .text(`If you have any questions, feel free to contact us at ${companyEmail}.`, 50, 725, { align: "center" });

      // End document
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
