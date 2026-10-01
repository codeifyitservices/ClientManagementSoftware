import fs from "fs";
import path from "path";

const currencyName = (currency) => {
  const text = String(currency || "INR").toUpperCase();
  if (text.includes("USD")) return "Dollars";
  if (text.includes("AED")) return "Dirhams";
  if (text.includes("GBP")) return "Pounds";
  if (text.includes("EUR")) return "Euros";
  if (text.includes("AUD") || text.includes("A$")) return "Australian Dollars";
  return "Rupees";
};

const minorCurrencyName = (currency) => {
  const text = String(currency || "INR").toUpperCase();
  if (text.includes("AED")) return "Fils";
  if (text.includes("GBP")) return "Pence";
  if (text.includes("USD") || text.includes("EUR") || text.includes("AUD")) return "Cents";
  return "Paise";
};

const numberToWords = (num, currency) => {
  const name = currencyName(currency);
  const value = Math.max(0, Number(num) || 0);
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const group = (n) =>
    n < 20
      ? ones[n]
      : `${tens[Math.floor(n / 10)]}${n % 10 ? `-${ones[n % 10]}` : ""}`;
  let n = Math.floor(value);
  const minor = Math.round((value - n) * 100);
  let result = "";
  if (n >= 10000000) {
    result += `${group(Math.floor(n / 10000000))} Crore `;
    n %= 10000000;
  }
  if (n >= 100000) {
    result += `${group(Math.floor(n / 100000))} Lakh `;
    n %= 100000;
  }
  if (n >= 1000) {
    result += `${group(Math.floor(n / 1000))} Thousand `;
    n %= 1000;
  }
  if (n >= 100) {
    result += `${ones[Math.floor(n / 100)]} Hundred `;
    n %= 100;
  }
  if (n) result += `${n < 20 ? ones[n] : group(n)} `;
  const majorWords = result.trim() || "Zero";
  const minorWords = minor > 0 ? ` and ${group(minor)} ${minorCurrencyName(currency)}` : "";
  return `${majorWords} ${name}${minorWords} Only`;
};

const currencySymbol = (currency) => {
  const text = String(currency || "INR").toUpperCase();
  if (text.includes("USD")) return "$";
  if (text.includes("AED")) return "AED";
  if (text.includes("GBP")) return "GBP";
  if (text.includes("EUR")) return "EUR";
  if (text.includes("AUD")) return "A$";
  return "Rs.";
};

// PDFKit's built-in Helvetica font cannot render the Arabic symbol in labels
// such as "AED (د.إ)", so expose only the ASCII currency code in PDF metadata.
const currencyDisplay = (currency) => {
  const text = String(currency || "INR").toUpperCase();
  if (text.includes("AED")) return "AED";
  if (text.includes("USD")) return "USD";
  if (text.includes("GBP")) return "GBP";
  if (text.includes("EUR")) return "EUR";
  if (text.includes("AUD") || text.includes("A$")) return "AUD";
  return "INR";
};

const stateCode = (client) => {
  if (client?.gstNumber && /^\d{2}/.test(client.gstNumber))
    return client.gstNumber.slice(0, 2);
  const text = `${client?.address || ""} ${client?.city || ""}`.toLowerCase();
  const states = [
    ["west bengal", "19"],
    ["kolkata", "19"],
    ["maharashtra", "27"],
    ["mumbai", "27"],
    ["delhi", "07"],
    ["new delhi", "07"],
    ["karnataka", "29"],
    ["bengaluru", "29"],
    ["tamil nadu", "33"],
    ["chennai", "33"],
    ["telangana", "36"],
    ["hyderabad", "36"],
    ["gujarat", "24"],
    ["ahmedabad", "24"],
    ["uttar pradesh", "09"],
    ["noida", "09"],
    ["punjab", "03"],
    ["chandigarh", "03"],
    ["rajasthan", "08"],
    ["jaipur", "08"],
    ["haryana", "06"],
    ["faridabad", "06"],
    ["kerala", "32"],
    ["kochi", "32"],
    ["madhya pradesh", "23"],
    ["bhopal", "23"],
    ["bihar", "10"],
    ["patna", "10"],
    ["jharkhand", "20"],
    ["ranchi", "20"],
    ["odisha", "21"],
    ["bhubaneswar", "21"],
    ["chhattisgarh", "22"],
    ["raipur", "22"],
    ["assam", "18"],
    ["guwahati", "18"],
    ["goa", "30"],
    ["jammu", "01"],
    ["himachal", "02"],
  ];
  return states.find(([name]) => text.includes(name))?.[1] || "";
};

export const renderSyncedInvoicePage = (
  doc,
  invoice,
  config = {},
  isFirstPage = true,
) => {
  if (!isFirstPage) doc.addPage({ margin: 40, size: "A4" });
  const companyName = config.companyName || "Codenap IT Services";
  const companyAddress =
    config.companyAddress || "SCO 123, Sector 15, Faridabad, Haryana - 121007";
  const companyGst = config.companyGst || "06AABCT1234Q1Z5";
  const client = invoice.client || {};
  const symbol = currencySymbol(invoice.currency);
  const taxExempt = !!client.isForeign || symbol !== "Rs.";
  const paid = String(invoice.paymentStatus || "").toLowerCase() === "paid";
  const money = (n) =>
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const date = (n) =>
    n
      ? new Date(n).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "—";
  const rule = (y) =>
    doc
      .moveTo(40, y)
      .lineTo(555, y)
      .strokeColor("#E2E8F0")
      .lineWidth(0.7)
      .stroke();
  const text = (s, x, y, width, opts = {}) =>
    doc
      .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(opts.size || 8)
      .fillColor(opts.color || "#0F172A")
      .text(String(s ?? ""), x, y, {
        width,
        align: opts.align || "left",
        height: opts.height,
        ellipsis: opts.ellipsis,
      });
  const label = (s, x, y, width, align = "left") =>
    text(s, x, y, width, { color: "#64748B", align });

  let top = 40;
  const logo = config.companyLogo
    ? path.join(process.cwd(), "uploads", config.companyLogo)
    : "";
  if (logo && fs.existsSync(logo)) doc.image(logo, 40, top, { fit: [46, 42] });
  else {
    doc.roundedRect(40, top, 32, 32, 7).fill("#4F46E5");
    text(companyName[0].toUpperCase(), 40, top + 8, 32, {
      size: 14,
      color: "#FFFFFF",
      bold: true,
      align: "center",
    });
  }
  top += 50;
  label("FROM", 40, top, 280);
  text(companyName.toUpperCase(), 40, top + 12, 280, { bold: true });
  text(companyAddress, 40, top + 27, 280, { color: "#475569" });
  if (companyGst)
    text(`GSTIN ${companyGst}`, 40, top + 49, 280, { color: "#475569" });
  text("TAX INVOICE", 350, 40, 205, { size: 20, bold: true, align: "right" });
  text(`# ${invoice.invoiceNumber || ""}`, 350, 66, 205, {
    bold: true,
    color: "#475569",
    align: "right",
  });
  [
    [
      "Invoice Date :",
      date(invoice.invoiceDate || invoice.createdAt || Date.now()),
    ],
    ["Due Date :", date(invoice.dueDate)],
    ["Currency :", currencyDisplay(invoice.currency)],
    ["Status :", paid ? "Paid" : "Pending"],
  ].forEach(([k, v], i) => {
    label(k, 350, 96 + i * 15, 92, "right");
    text(v, 450, 96 + i * 15, 105, {
      bold: i === 3,
      color: i === 3 ? (paid ? "#047857" : "#92400E") : "#0F172A",
    });
  });
  rule(Math.max(177, top + 72));

  const infoTop = Math.max(189, top + 84);
  label("BILL TO", 40, infoTop, 270);
  text(
    (client.companyName || "Client Company Name").toUpperCase(),
    40,
    infoTop + 13,
    270,
    { bold: true },
  );
  const address = `${client.address || "Client Address"}${client.city ? `, ${client.city}` : ""}${client.pincode ? ` - ${client.pincode}` : ""}`;
  text(address, 40, infoTop + 28, 270, { color: "#475569" });
  if (client.gstNumber)
    text(`GSTIN: ${client.gstNumber}`, 40, infoTop + 51, 270, {
      color: "#475569",
    });

  const items = invoice.items?.length
    ? invoice.items
    : [
        {
          description: invoice.serviceDescription || "Website Development",
          sacCode: invoice.sacCode || "998314",
          amount: invoice.amount || 0,
          qty: 1,
          rate: invoice.amount || 0,
          gstRate: invoice.gstRate ?? 18,
        },
      ];
  let subtotal = 0;
  let gst = 0;
  items.forEach((item) => {
    const base = Number(item.amount ?? (item.qty || 1) * (item.rate || 0));
    const tax =
      item.isInclusive && item.originalAmount > 0 && !taxExempt
        ? item.originalAmount - base
        : taxExempt
          ? 0
          : (base * (item.gstRate ?? 18)) / 100;
    subtotal += Math.round(base * 100) / 100;
    gst += Math.round(tax * 100) / 100;
  });
  const total = subtotal + gst;
  const interstate =
    !!client.gstNumber && stateCode(client) !== companyGst.slice(0, 2);
  const rate = taxExempt ? 0 : (items[0].gstRate ?? 18);
  const tableTop = Math.max(264, infoTop + 76);
  doc.roundedRect(40, tableTop, 515, 23, 3).fill("#333333");
  [
    ["#", 48, 20, "center"],
    ["Description", 78, 290],
    ["SAC Code", 390, 70, "center"],
    [`Amount (${symbol})`, 465, 85, "right"],
  ].forEach(([s, x, w, align]) =>
    text(s, x, tableTop + 7, w, {
      size: 8,
      color: "#FFFFFF",
      bold: true,
      align,
    }),
  );
  let y = tableTop + 31;
  items.forEach((item, i) => {
    const base = Number(item.amount ?? (item.qty || 1) * (item.rate || 0));
    const desc = item.description || "Website Development";
    const h = Math.max(28, doc.heightOfString(desc, { width: 290 }) + 18);
    text(i + 1, 48, y + 6, 20, {
      size: 8.5,
      color: "#64748B",
      align: "center",
    });
    text(desc, 78, y + 6, 290, { size: 8.5 });
    text(item.sacCode || "998314", 390, y + 6, 70, {
      size: 8,
      color: "#64748B",
      align: "center",
    });
    text(money(base), 465, y + 6, 85, {
      size: 8.5,
      bold: true,
      align: "right",
    });
    rule(y + h);
    y += h;
  });
  y += 12;
  rule(y);
  y += 11;
  const row = (name, amount) => {
    label(name, 326, y, 112, "right");
    text(`${symbol} ${money(amount)}`, 450, y, 105, {
      bold: true,
      align: "right",
    });
    y += 16;
  };
  row("Sub Total", subtotal);
  if (!taxExempt && interstate) row(`IGST (${rate}%)`, gst);
  if (!taxExempt && !interstate) {
    row(`CGST (${String(rate / 2).replace(/\.0$/, "")}%)`, gst / 2);
    row(`SGST (${String(rate / 2).replace(/\.0$/, "")}%)`, gst / 2);
  }
  doc.roundedRect(326, y - 3, 229, 25, 5).fillAndStroke("#F1F5F9", "#E2E8F0");
  text("Total", 335, y + 5, 100, { bold: true });
  text(`${symbol} ${money(total)}`, 450, y + 5, 105, {
    bold: true,
    align: "right",
  });
  y += 38;
  rule(y);
  y += 12;
  text("Amount in Words:", 40, y, 130, { bold: true });
  text(numberToWords(total, invoice.currency), 40, y + 14, 340, { color: "#475569" });
  y += 40;

  if (paid) {
    const charges = Number(invoice.bankCharges || 0);
    const cells = [
      ["Invoice Amount", `${symbol} ${money(invoice.totalAmount || total)}`],
      ["Payment Status", "Paid"],
      ["Invoice Date", date(invoice.invoiceDate)],
      [
        "Payment Reference",
        items
          .map((i) => i.description)
          .filter(Boolean)
          .join(", ") || "No service description",
      ],
      [
        "Amount Received in Bank",
        `${symbol} ${money((invoice.totalAmount || total) - charges)}`,
      ],
    ];
    if (charges)
      cells.push([
        "Bank / Intermediary Charges",
        `${symbol} ${money(charges)}${invoice.bankChargesDescription ? ` (${invoice.bankChargesDescription})` : ""}`,
      ]);

    // Three columns over two rows gives long labels enough room and prevents
    // the final payment fields from colliding with their neighbours.
    const columns = 3;
    const rows = Math.ceil(cells.length / columns);
    const paymentHeight = 47 + rows * 31;
    doc
      .roundedRect(40, y, 515, paymentHeight, 8)
      .fillAndStroke("#F4F8FE", "#DCE6F7");
    text("Payment Details", 58, y + 11, 160, { bold: true, color: "#1A3FBF" });
    const cellWidth = 495 / columns;
    cells.forEach(([key, cellValue], index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = 50 + column * cellWidth;
      const cellY = y + 31 + row * 31;
      if (column > 0)
        doc
          .moveTo(x - 8, cellY - 3)
          .lineTo(x - 8, cellY + 24)
          .strokeColor("#DCE6F7")
          .lineWidth(0.5)
          .stroke();
      label(key, x, cellY, cellWidth - 14);
      text(cellValue, x, cellY + 13, cellWidth - 14, {
        size: 7.5,
        color: key === "Payment Status" ? "#047857" : "#0F172A",
        ellipsis: true,
        height: 13,
      });
    });
    y += paymentHeight + 12;
  }
  rule(y);
  y += 11;
  const terms =
    invoice.notes || config.invoiceTerms || "Thank you for your business!";
  if (terms) {
    text("Terms & Footnotes:", 40, y, 200, { bold: true });
    y += 14;
    terms
      .split("\n")
      .filter((line) => line.trim())
      .forEach((line, i) => {
        text(`${i + 1}. ${line.replace(/^\d+\.\s*/, "")}`, 48, y, 500, {
          color: "#475569",
        });
        y += 13;
      });
  }
  // Keep the footer inside PDFKit's usable page area. Text below the bottom
  // margin causes PDFKit to create a new page for each footer field.
  rule(770);
  label(`Phone: ${config.companyPhone || "+91 97175 70933"}`, 40, 780, 160);
  label(
    `Email: ${config.companyEmail || "info@codenap.in"}`,
    200,
    780,
    160,
    "center",
  );
  if (config.companyWebsite)
    label(config.companyWebsite, 395, 780, 160, "right");
};
