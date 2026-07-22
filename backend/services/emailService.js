import nodemailer from "nodemailer";

/**
 * Sends the invoice PDF to the client's email via SMTP.
 * @param {Object} client - The client document.
 * @param {Buffer} pdfBuffer - The generated PDF buffer.
 * @param {Object} config - The company configuration document.
 * @returns {Promise<Object>} - An object with status and optional preview URL (for test mails).
 */
export const sendInvoiceEmail = async (client, pdfBuffer, config = {}) => {
  let transporter;
  let fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  let isFallback = false;

  const companyName = config.companyName || "ClientFlow Inc.";
  const companyEmail = config.companyEmail || "contact@clientflow.com";

  // Check if SMTP_USER is configured
  if (!process.env.SMTP_USER || process.env.SMTP_USER.trim() === "" || process.env.SMTP_USER === "your-zoho-email@zoho.com") {
    // Fallback to Ethereal Email for testing
    console.log("No Zoho SMTP user configured. Generating temporary Ethereal Email test account...");
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    fromEmail = `"${companyName}" <${testAccount.user}>`;
    isFallback = true;
  } else {
    // Zoho or custom SMTP
    let host = (process.env.SMTP_HOST || "smtp.zoho.in").trim();
    if (host === "smtp.zoho.com") host = "smtp.zoho.in";
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const secure = port === 465;

    console.log(`[SMTP] Attempting email send via ${host}:${port} to ${client.email}...`);

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER.trim(),
        pass: process.env.SMTP_PASS.trim(),
      },
    });
    const userEmail = (process.env.SMTP_USER || "info@codenap.co.in").trim();
    fromEmail = `"${companyName}" <${userEmail}>`;
  }

  const subject = `Payment Received – Invoice ${client.invoiceNumber}`;
  
  // Format body exactly as required:
  // Subject: Payment Received – Invoice {{invoiceNumber}}
  // Hello {{clientName}},
  // Thank you for your payment.
  // Please find your invoice attached for your records.
  // If you have any questions, feel free to contact us.
  // Best regards,
  // {{Company Name}}
  const bodyText = `Hello ${client.clientName},

Thank you for your payment.

Please find your invoice attached for your records.

If you have any questions, feel free to contact us.

Best regards,

${companyName}`;

  // Styled HTML body matching the visual requirements and INR currency
  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
      <h2 style="color: #4F46E5;">Payment Received!</h2>
      <p>Hello <strong>${client.clientName}</strong>,</p>
      <p>Thank you for your payment.</p>
      <p>Please find your invoice attached for your records.</p>
      <div style="margin: 20px 0; padding: 15px; background-color: #f9fafb; border-radius: 6px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Invoice Number:</td>
            <td style="padding: 4px 0; font-weight: bold; text-align: right; font-size: 14px;">${client.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Service:</td>
            <td style="padding: 4px 0; font-weight: bold; text-align: right; font-size: 14px;">${client.serviceDescription}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Amount (INR):</td>
            <td style="padding: 4px 0; font-weight: bold; text-align: right; font-size: 16px; color: #10B981;">Rs. ${Number(client.amount ?? client.totalAmount ?? 0).toFixed(2)}</td>
          </tr>
        </table>
      </div>
      <p>If you have any questions, feel free to contact us.</p>
      <p>Best regards,<br/><strong>${companyName}</strong></p>
    </div>
  `;

  const mailOptions = {
    from: fromEmail,
    to: client.email,
    subject,
    text: bodyText,
    html: bodyHtml,
    attachments: [
      {
        filename: `Invoice_${client.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);
  
  if (isFallback) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`\n======================================================`);
    console.log(`[TEST EMAIL SENT] Fallback Ethereal SMTP account created.`);
    console.log(`To: ${client.email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Preview URL: ${previewUrl}`);
    console.log(`======================================================\n`);
    return { success: true, previewUrl, isFallback: true };
  }

  console.log(`Invoice email sent to ${client.email} via SMTP. MessageId: ${info.messageId}`);
  return { success: true, isFallback: false };
};
