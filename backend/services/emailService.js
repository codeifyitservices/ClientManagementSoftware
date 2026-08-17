/**
 * Brevo Transactional Email Service via HTTP API (HTTPS)
 * Designed for deployment environments like Render Free that block outbound SMTP ports (25, 465, 587).
 */

/**
 * Reusable helper function to send transactional emails via Brevo HTTP API.
 * @param {Object} options
 * @param {string|Object|Array} options.to - Recipient email string, object {email, name}, or array of recipients
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML content
 * @param {string} [options.text] - Plain text content (optional)
 * @param {Array<{filename?: string, name?: string, content: Buffer|string}>} [options.attachments] - Attachments array
 * @param {string} [options.senderName] - Custom sender name
 * @param {string} [options.senderEmail] - Custom sender email (must be verified in Brevo)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  attachments = [],
  senderName,
  senderEmail,
}) => {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    console.warn(
      "[Brevo API Warning] BREVO_API_KEY environment variable is not configured. Email will not be dispatched."
    );
    return {
      success: false,
      error: "BREVO_API_KEY environment variable is missing",
    };
  }

  // Sender email from environment variables (EMAIL_FROM prioritized)
  const fromEmail = (
    senderEmail ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    process.env.COMPANY_EMAIL ||
    "info@codenap.co.in"
  ).trim();

  const fromName = (
    senderName ||
    process.env.COMPANY_NAME ||
    "Codenap - Professional IT Solutions"
  ).trim();

  // Format recipient list
  let recipientList = [];
  if (typeof to === "string") {
    recipientList = [{ email: to.trim() }];
  } else if (Array.isArray(to)) {
    recipientList = to.map((item) =>
      typeof item === "string" ? { email: item.trim() } : item
    );
  } else if (to && typeof to === "object") {
    recipientList = [
      {
        email: to.email ? to.email.trim() : "",
        name: to.name || undefined,
      },
    ];
  }

  if (recipientList.length === 0 || !recipientList[0].email) {
    console.error("[Brevo API Error] No valid recipient email provided.");
    return { success: false, error: "No recipient email provided" };
  }

  // Convert Buffer attachments to Base64 format expected by Brevo API
  let formattedAttachments;
  if (attachments && attachments.length > 0) {
    formattedAttachments = attachments.map((att) => {
      let base64Content = "";
      if (Buffer.isBuffer(att.content)) {
        base64Content = att.content.toString("base64");
      } else if (typeof att.content === "string") {
        base64Content = att.content;
      }
      return {
        name: att.filename || att.name || "attachment.pdf",
        content: base64Content,
      };
    });
  }

  // Construct Brevo API JSON Payload
  const payload = {
    sender: {
      name: fromName,
      email: fromEmail,
    },
    to: recipientList,
    subject: subject,
    htmlContent: html || "<p></p>",
  };

  if (text) {
    payload.textContent = text;
  }

  if (formattedAttachments && formattedAttachments.length > 0) {
    payload.attachment = formattedAttachments;
  }

  try {
    console.log(
      `[Brevo HTTP API] Sending transactional email to ${recipientList.map((r) => r.email).join(", ")}...`
    );

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey.trim(),
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(
        `[Brevo API Error] HTTP ${response.status} failed:`,
        responseData.message || responseData.code || responseData
      );
      return {
        success: false,
        error: responseData.message || `HTTP ${response.status} Error`,
      };
    }

    console.log(
      `[Brevo API Success] Email successfully sent to ${recipientList[0].email}. MessageId: ${responseData.messageId}`
    );
    return {
      success: true,
      messageId: responseData.messageId,
    };
  } catch (error) {
    console.error(`[Brevo API Network Error] Failed to dispatch email:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Sends the invoice PDF to the client's email via Brevo HTTP API.
 * @param {Object} client - The client document.
 * @param {Buffer} pdfBuffer - The generated PDF buffer.
 * @param {Object} config - The company configuration document.
 * @returns {Promise<Object>} - Status object { success: boolean, messageId?: string, error?: string }
 */
export const sendInvoiceEmail = async (client, pdfBuffer, config = {}) => {
  const companyName = config.companyName || process.env.COMPANY_NAME || "Codenap - Professional IT Solutions";
  const subject = `Payment Received – Invoice ${client.invoiceNumber}`;

  const bodyText = `Hello ${client.clientName},

Thank you for your payment.

Please find your invoice attached for your records.

If you have any questions, feel free to contact us.

Best regards,

${companyName}`;

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

  return await sendEmail({
    to: { email: client.email, name: client.clientName },
    subject,
    text: bodyText,
    html: bodyHtml,
    senderName: companyName,
    attachments: [
      {
        filename: `Invoice_${client.invoiceNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
};

/**
 * Sends a subscription reminder email to the client via Brevo HTTP API.
 * @param {Object} subscription - The subscription document.
 * @param {Object} client - The client document.
 * @param {Object} config - The company configuration document.
 * @param {number} daysLeft - Number of days until expiration.
 * @returns {Promise<Object>} - Status object { success: boolean, messageId?: string, error?: string }
 */
export const sendSubscriptionReminderEmail = async (subscription, client, config = {}, daysLeft) => {
  const companyName = config.companyName || process.env.COMPANY_NAME || "Codenap - Professional IT Solutions";

  const rawType = subscription.type === "custom" ? (subscription.customType || "Custom") : subscription.type.replace(/_/g, " ");
  const formattedType = rawType.charAt(0).toUpperCase() + rawType.slice(1);
  const formattedEndDate = new Date(subscription.endDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const subject = `Action Required: Your ${formattedType} Subscription Expires in ${daysLeft} Days`;
  const currencyDisplay = subscription.currency || "INR (₹)";

  const bodyText = `Hello ${client.clientName},

This is a reminder that your ${formattedType} subscription with ${companyName} is expiring on ${formattedEndDate}.

Subscription Details:
- Type: ${formattedType}
- Amount: ${currencyDisplay} ${Number(subscription.amount).toFixed(2)}
- Expiry Date: ${formattedEndDate}

Please get in touch with us to renew your subscription.

Best regards,

${companyName}`;

  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
      <h2 style="color: #E11D48;">Subscription Expiring Soon!</h2>
      <p>Hello <strong>${client.clientName}</strong>,</p>
      <p>This is a friendly reminder that your <strong>${formattedType}</strong> subscription is about to expire in <strong>${daysLeft} days</strong> (on <strong>${formattedEndDate}</strong>).</p>
      
      <div style="margin: 20px 0; padding: 15px; background-color: #fff1f2; border: 1px solid #ffe4e6; border-radius: 6px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #4b5563; font-size: 14px;">Subscription Type:</td>
            <td style="padding: 4px 0; font-weight: bold; text-align: right; font-size: 14px; text-transform: capitalize;">${formattedType}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #4b5563; font-size: 14px;">Expiry Date:</td>
            <td style="padding: 4px 0; font-weight: bold; text-align: right; font-size: 14px; color: #e11d48;">${formattedEndDate}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #4b5563; font-size: 14px;">Renewal Amount:</td>
            <td style="padding: 4px 0; font-weight: bold; text-align: right; font-size: 16px; color: #1e293b;">${currencyDisplay} ${Number(subscription.amount).toFixed(2)}</td>
          </tr>
        </table>
      </div>
      
      <p>To avoid any service interruption, please contact us to renew your subscription.</p>
      <p>Best regards,<br/><strong>${companyName}</strong></p>
    </div>
  `;

  return await sendEmail({
    to: { email: client.email, name: client.clientName },
    subject,
    text: bodyText,
    html: bodyHtml,
    senderName: companyName,
  });
};
