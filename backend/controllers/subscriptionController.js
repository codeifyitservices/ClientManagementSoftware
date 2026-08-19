import Subscription from "../models/subscriptionModel.js";
import Client from "../models/clientModel.js";
import Config from "../models/configModel.js";
import Invoice from "../models/invoiceModel.js";
import { getNextInvoiceNumber } from "./invoiceController.js";
import { sendSubscriptionReminderEmail } from "../services/emailService.js";
import { checkAndSendReminders } from "../services/subscriptionScheduler.js";

// GET /api/subscriptions - Fetch all subscriptions
export const getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate("client")
      .sort({ endDate: 1 });
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subscriptions", error: error.message });
  }
};

const computeNextDueDate = (sub) => {
  if (!sub || !sub.startDate) return new Date();

  const startDate = new Date(sub.startDate);
  const endDate = sub.endDate ? new Date(sub.endDate) : startDate;
  const cycle = (sub.billingCycle || (sub.durationUnit === "years" ? "yearly" : "monthly")).toLowerCase();

  if (
    cycle === "one_time" ||
    (cycle === "yearly" && sub.durationUnit === "years" && sub.durationValue === 1) ||
    (cycle === "monthly" && sub.durationUnit === "months" && sub.durationValue === 1)
  ) {
    return endDate;
  }

  const addInterval = (d, c) => {
    const next = new Date(d);
    if (c === "weekly") next.setDate(next.getDate() + 7);
    else if (c === "quarterly") next.setMonth(next.getMonth() + 3);
    else if (c === "yearly") next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);
    return next;
  };

  const paidPayments = (sub.payments || []).filter((p) => p.status === "Paid");

  let nextDue;
  if (paidPayments.length > 0) {
    const lastP = paidPayments[paidPayments.length - 1];
    const lastDate = lastP.paymentDate ? new Date(lastP.paymentDate) : startDate;
    nextDue = addInterval(lastDate, cycle);
  } else {
    nextDue = addInterval(startDate, cycle);
  }

  return nextDue > endDate ? endDate : nextDue;
};

// GET /api/subscriptions/alerts - Get all active undismissed alerts
export const getAlerts = async (req, res) => {
  try {
    const subscriptions = await Subscription.find().populate("client");
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Normalize to midnight

    const activeAlerts = [];

    for (const sub of subscriptions) {
      if (!sub.client) continue;

      const endDate = new Date(sub.endDate);
      const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

      // If already expired, skip
      if (today >= endMidnight) continue;

      const diffTime = endMidnight.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const subTypeDisplay = sub.type === "custom" ? (sub.customType || "Custom") : sub.type.replace(/_/g, " ");

      let alertType = null;
      let alertMessage = "";

      if (diffDays === 1) {
        alertType = "tomorrow";
        alertMessage = `${sub.client.companyName}'s ${subTypeDisplay} subscription expires tomorrow (on ${endDate.toLocaleDateString("en-IN")})!`;
      } else if (diffDays <= 3) {
        alertType = "3days";
        alertMessage = `${sub.client.companyName}'s ${subTypeDisplay} subscription expires in ${diffDays} days (on ${endDate.toLocaleDateString("en-IN")})`;
      } else if (diffDays <= 7) {
        alertType = "7days";
        alertMessage = `${sub.client.companyName}'s ${subTypeDisplay} subscription expires in ${diffDays} days (on ${endDate.toLocaleDateString("en-IN")})`;
      } else if (diffDays <= 15) {
        alertType = "15days";
        alertMessage = `${sub.client.companyName}'s ${subTypeDisplay} subscription expires in ${diffDays} days (on ${endDate.toLocaleDateString("en-IN")})`;
      } else if (diffDays <= 30) {
        alertType = "1month";
        alertMessage = `${sub.client.companyName}'s ${subTypeDisplay} subscription expires in 1 month (on ${endDate.toLocaleDateString("en-IN")})`;
      }

      if (alertType) {
        activeAlerts.push({
          subscriptionId: sub._id,
          client: sub.client,
          type: sub.type,
          customType: sub.customType,
          paymentMethod: sub.paymentMethod,
          amount: sub.amount,
          endDate: sub.endDate,
          diffDays,
          alertType,
          message: alertMessage,
        });
      }
    }

    res.json(activeAlerts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching active subscription alerts", error: error.message });
  }
};

// GET /api/subscriptions/:id - Get single subscription by ID
export const getSubscriptionById = async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id).populate("client");
    if (!sub) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    res.json(sub);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subscription", error: error.message });
  }
};

// POST /api/subscriptions - Create subscription
export const createSubscription = async (req, res) => {
  try {
    const {
      client,
      type,
      customType,
      paymentMethod,
      currency,
      billingCycle,
      autoRenew,
      renewalType,
      planDetails,
      notes,
      startDate,
      durationValue,
      durationUnit,
      amount,
      inclusiveGst,
      isPersonalAccount,
    } = req.body;

    if (!client || !type || !startDate || !durationValue || !durationUnit || amount === undefined) {
      return res.status(400).json({ message: "Missing required subscription parameters" });
    }

    const clientExists = await Client.findById(client);
    if (!clientExists) {
      return res.status(404).json({ message: "Client not found" });
    }

    const sub = new Subscription({
      client,
      type,
      customType: customType || "",
      paymentMethod: paymentMethod || "bank_transfer",
      currency: currency || "INR (₹)",
      billingCycle: billingCycle || "monthly",
      autoRenew: autoRenew !== undefined ? Boolean(autoRenew) : true,
      renewalType: renewalType || "automatic",
      planDetails: planDetails || "",
      notes: notes || "",
      startDate: new Date(startDate),
      durationValue: Number(durationValue),
      durationUnit,
      amount: Number(amount),
      isPersonalAccount: isPersonalAccount !== undefined ? Boolean(isPersonalAccount) : false,
      inclusiveGst: inclusiveGst !== undefined ? Boolean(inclusiveGst) : true,
    });

    await sub.save();

    // Fetch populated version to send back
    const populatedSub = await Subscription.findById(sub._id).populate("client");
    res.status(201).json(populatedSub);
  } catch (error) {
    console.error("[Backend] Error creating subscription:", error);
    res.status(500).json({ message: "Error creating subscription", error: error.message });
  }
};

// POST /api/subscriptions/bulk-delete - Bulk delete subscriptions
export const bulkDeleteSubscriptions = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No subscription IDs provided for deletion" });
    }

    const result = await Subscription.deleteMany({ _id: { $in: ids } });
    res.json({ message: `Successfully deleted ${result.deletedCount} subscriptions.` });
  } catch (error) {
    console.error("[Backend] Error bulk deleting subscriptions:", error);
    res.status(500).json({ message: "Error bulk deleting subscriptions", error: error.message });
  }
};

// PUT /api/subscriptions/:id - Update subscription
export const updateSubscription = async (req, res) => {
  try {
    const {
      client,
      type,
      customType,
      paymentMethod,
      currency,
      billingCycle,
      autoRenew,
      renewalType,
      planDetails,
      notes,
      startDate,
      durationValue,
      durationUnit,
      amount,
      inclusiveGst,
      isPersonalAccount,
    } = req.body;

    const sub = await Subscription.findById(req.params.id);
    if (!sub) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    if (client) {
      const clientExists = await Client.findById(client);
      if (!clientExists) {
        return res.status(404).json({ message: "Client not found" });
      }
      sub.client = client;
    }

    if (type) sub.type = type;
    if (customType !== undefined) sub.customType = customType;
    if (paymentMethod) sub.paymentMethod = paymentMethod;
    if (currency) sub.currency = currency;
    if (billingCycle) sub.billingCycle = billingCycle;
    if (autoRenew !== undefined) sub.autoRenew = Boolean(autoRenew);
    if (renewalType) sub.renewalType = renewalType;
    if (planDetails !== undefined) sub.planDetails = planDetails;
    if (notes !== undefined) sub.notes = notes;
    if (startDate) sub.startDate = startDate;
    if (durationValue) sub.durationValue = durationValue;
    if (durationUnit) sub.durationUnit = durationUnit;
    if (amount !== undefined) sub.amount = Number(amount);
    if (inclusiveGst !== undefined) sub.inclusiveGst = Boolean(inclusiveGst);
    if (isPersonalAccount !== undefined) sub.isPersonalAccount = Boolean(isPersonalAccount);

    await sub.save();

    const populatedSub = await Subscription.findById(sub._id).populate("client");
    res.json(populatedSub);
  } catch (error) {
    console.error("[Backend] Error updating subscription:", error);
    res.status(500).json({ message: "Error updating subscription", error: error.message });
  }
};

// POST /api/subscriptions/:id/payments - Record a payment
export const addSubscriptionPayment = async (req, res) => {
  try {
    const { paymentDate, invoiceNumber, billingPeriod, amount, paymentMethod, referenceNo, status, notes } = req.body;

    const sub = await Subscription.findById(req.params.id);
    if (!sub) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const newPayment = {
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      invoiceNumber: invoiceNumber || "",
      billingPeriod: billingPeriod || "",
      amount: amount !== undefined ? Number(amount) : sub.amount,
      paymentMethod: paymentMethod || sub.paymentMethod || "bank_transfer",
      referenceNo: referenceNo || "",
      status: status || "Paid",
      notes: notes || "",
    };

    sub.payments.push(newPayment);
    await sub.save();

    const populatedSub = await Subscription.findById(sub._id).populate("client");
    res.status(201).json(populatedSub);
  } catch (error) {
    console.error("[Backend] Error recording subscription payment:", error);
    res.status(500).json({ message: "Error recording payment", error: error.message });
  }
};

// DELETE /api/subscriptions/:id/payments/:paymentId - Delete a payment
export const deleteSubscriptionPayment = async (req, res) => {
  try {
    const { id, paymentId } = req.params;
    const sub = await Subscription.findById(id);
    if (!sub) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    sub.payments = sub.payments.filter((p) => p._id.toString() !== paymentId);
    await sub.save();

    const populatedSub = await Subscription.findById(sub._id).populate("client");
    res.json(populatedSub);
  } catch (error) {
    console.error("[Backend] Error deleting subscription payment:", error);
    res.status(500).json({ message: "Error deleting payment", error: error.message });
  }
};

// POST /api/subscriptions/:id/services - Add a service/addon to subscription
export const addSubscriptionService = async (req, res) => {
  try {
    const { name, price, billingCycle } = req.body;
    if (!name || !name.trim() || price === undefined || isNaN(price) || Number(price) < 0) {
      return res.status(400).json({ message: "Invalid service name or price" });
    }
    if (!billingCycle || !["monthly", "one_time"].includes(billingCycle)) {
      return res.status(400).json({ message: "billingCycle must be 'monthly' or 'one_time'" });
    }

    const sub = await Subscription.findById(req.params.id);
    if (!sub) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    sub.services.push({
      name: name.trim(),
      price: Number(price),
      billingCycle,
      status: "active",
      addedAt: new Date(),
    });

    await sub.save();

    const populatedSub = await Subscription.findById(sub._id).populate("client");
    res.status(201).json(populatedSub);
  } catch (error) {
    console.error("[Backend] Error adding subscription service:", error);
    res.status(500).json({ message: "Error adding service/addon", error: error.message });
  }
};

// DELETE /api/subscriptions/:id/services/:serviceId - Soft delete a service/addon (mark status = "removed")
export const removeSubscriptionService = async (req, res) => {
  try {
    const { id, serviceId } = req.params;
    const sub = await Subscription.findById(id);
    if (!sub) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const targetService = sub.services.find((s) => s._id.toString() === serviceId);
    if (!targetService) {
      return res.status(404).json({ message: "Service/addon not found" });
    }

    targetService.status = "removed";
    await sub.save();

    const populatedSub = await Subscription.findById(sub._id).populate("client");
    res.json(populatedSub);
  } catch (error) {
    console.error("[Backend] Error removing subscription service:", error);
    res.status(500).json({ message: "Error removing service/addon", error: error.message });
  }
};

// DELETE /api/subscriptions/:id - Delete subscription
export const deleteSubscription = async (req, res) => {
  try {
    const sub = await Subscription.findByIdAndDelete(req.params.id);
    if (!sub) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    res.json({ message: "Subscription deleted successfully" });
  } catch (error) {
    console.error("[Backend] Error deleting subscription:", error);
    res.status(500).json({ message: "Error deleting subscription", error: error.message });
  }
};

// POST /api/subscriptions/:id/dismiss-alert - Dismiss/Acknowledge an active app alert
export const dismissAlert = async (req, res) => {
  try {
    const { alertType } = req.body;
    if (!alertType || (alertType !== "1month" && alertType !== "15days")) {
      return res.status(400).json({ message: "Invalid alertType. Must be '1month' or '15days'." });
    }

    const sub = await Subscription.findById(req.params.id);
    if (!sub) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    if (alertType === "15days") {
      sub.alertDismissed15Days = true;
    } else {
      sub.alertDismissed1Month = true;
    }

    await sub.save();
    res.json({ message: `Alert '${alertType}' dismissed successfully` });
  } catch (error) {
    res.status(500).json({ message: "Error dismissing alert", error: error.message });
  }
};

// POST /api/subscriptions/run-check - Manual trigger for testing emails
export const runCheck = async (req, res) => {
  try {
    await checkAndSendReminders();
    res.json({ message: "Subscription check executed successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error running subscription check", error: error.message });
  }
};

// POST /api/subscriptions/:id/send-email - Manually send reminder email to client
export const sendEmail = async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id).populate("client");
    if (!sub) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    if (!sub.client || !sub.client.email) {
      return res.status(400).json({ message: "Client profile has no associated email address" });
    }

    const activeConfig = await Config.findOne() || {};

    // Calculate days remaining
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(sub.endDate);
    const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    const diffTime = endMidnight.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const result = await sendSubscriptionReminderEmail(sub, sub.client, activeConfig, diffDays);
    if (result.success) {
      // Mark flags as sent depending on the days left window
      if (diffDays <= 15) {
        sub.emailSent15Days = true;
        sub.emailSent1Month = true;
      } else if (diffDays <= 30) {
        sub.emailSent1Month = true;
      }
      await sub.save();

      res.json({
        message: `Email sent successfully to ${sub.client.email} indicating ${diffDays} days remaining.`,
        previewUrl: result.previewUrl,
        isFallback: result.isFallback
      });
    } else {
      res.status(500).json({ message: "Failed to send subscription reminder email" });
    }
  } catch (error) {
    console.error("[Backend] Error manually sending subscription email:", error);
    res.status(500).json({ message: "Error manually sending subscription email", error: error.message });
  }
};

// POST /api/subscriptions/:id/renew - Renew subscription, extend dates, add payment record & optionally generate tax invoice
export const renewSubscription = async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id).populate("client");
    if (!sub) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const {
      durationValue = sub.durationValue || 1,
      durationUnit = sub.durationUnit || "years",
      startDate: customStartDate,
      baseAmount: customBaseAmount,
      isPersonalAccount,
      inclusiveGst,
      createInvoice = true,
      paymentStatus = "Paid",
      paymentMethod = sub.paymentMethod || "bank_transfer",
      referenceNo = "",
      notes = "",
    } = req.body;

    const now = new Date();
    // Determine new start date: custom, current endDate if in future, or now
    let newStartDate;
    if (customStartDate) {
      newStartDate = new Date(customStartDate);
    } else if (sub.endDate && new Date(sub.endDate) > now) {
      newStartDate = new Date(sub.endDate);
    } else {
      newStartDate = now;
    }

    // Calculate new end date based on term duration
    const newEndDate = new Date(newStartDate);
    const durVal = Number(durationValue);
    if (durationUnit === "months") {
      newEndDate.setMonth(newEndDate.getMonth() + durVal);
    } else if (durationUnit === "years") {
      newEndDate.setFullYear(newEndDate.getFullYear() + durVal);
    }

    // Format readable billing period string
    const formatDateStr = (d) =>
      d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const billingPeriod = `${formatDateStr(newStartDate)} - ${formatDateStr(newEndDate)}`;

    // Update subscription pricing and options if passed
    const effectiveBase = customBaseAmount !== undefined && customBaseAmount !== "" ? Number(customBaseAmount) : (sub.baseAmount ?? sub.amount ?? 0);
    sub.baseAmount = effectiveBase;
    sub.amount = effectiveBase;
    sub.durationValue = durVal;
    sub.durationUnit = durationUnit;
    sub.startDate = newStartDate;
    sub.endDate = newEndDate;

    if (isPersonalAccount !== undefined) {
      sub.isPersonalAccount = Boolean(isPersonalAccount);
    }
    if (inclusiveGst !== undefined) {
      sub.inclusiveGst = Boolean(inclusiveGst);
    }

    // Reset reminder flags for the new term
    sub.emailSent1Month = false;
    sub.emailSent15Days = false;
    sub.alertDismissed1Month = false;
    sub.alertDismissed15Days = false;

    // Calculate add-on total
    const activeAddonsTotal = (sub.services || [])
      .filter((s) => s.status === "active" && s.billingCycle === "monthly")
      .reduce((sum, s) => sum + (s.price || 0), 0);

    const renewalSubtotal = effectiveBase + activeAddonsTotal;

    // Determine GST rate and final renewal amount
    const isForeign = sub.client?.isForeign || false;
    const isPersonal = sub.isPersonalAccount || false;
    const isInclusive = sub.inclusiveGst !== false;
    const gstRate = (isForeign || isPersonal) ? 0 : 18;

    let finalRenewalAmount = renewalSubtotal;
    if (!isForeign && !isPersonal && !isInclusive) {
      finalRenewalAmount = Math.round(renewalSubtotal * 1.18 * 100) / 100;
    }

    let generatedInvoiceNumber = "";

    // 1. Auto-generate Tax Invoice if requested
    if (createInvoice && sub.client) {
      try {
        const nextInvNum = await getNextInvoiceNumber();
        const subTypeName = sub.type === "custom" ? (sub.customType || "Custom Service") : sub.type.replace(/_/g, " ").toUpperCase();
        
        const invoiceItems = [
          {
            serviceName: subTypeName,
            description: `Subscription Renewal - ${subTypeName} (${billingPeriod})`,
            sacCode: "9983",
            qty: 1,
            rate: effectiveBase,
            amount: effectiveBase,
            gstRate: gstRate,
            isInclusive: isInclusive,
            originalAmount: effectiveBase,
          },
        ];

        // Include active add-on services as line items
        (sub.services || [])
          .filter((s) => s.status === "active")
          .forEach((addon) => {
            invoiceItems.push({
              serviceName: addon.name,
              description: `Add-on: ${addon.name} (${billingPeriod})`,
              sacCode: "9983",
              qty: 1,
              rate: addon.price,
              amount: addon.price,
              gstRate: gstRate,
              isInclusive: isInclusive,
              originalAmount: addon.price,
            });
          });

        const invoiceDueDate = req.body.dueDate
          ? new Date(req.body.dueDate)
          : (paymentStatus === "Paid" ? now : newEndDate);

        const newInvoice = new Invoice({
          invoiceNumber: nextInvNum,
          client: sub.client._id || sub.client,
          invoiceDate: now,
          dueDate: invoiceDueDate,
          invoiceType: "Tax Invoice",
          currency: sub.currency || "INR (₹)",
          items: invoiceItems,
          paymentStatus: paymentStatus,
          notes: notes ? `Subscription Renewal (${billingPeriod}): ${notes}` : `Auto-generated renewal invoice for ${subTypeName} (${billingPeriod})`,
        });

        await newInvoice.save();
        generatedInvoiceNumber = nextInvNum;
      } catch (invErr) {
        console.error("Error auto-generating renewal invoice:", invErr);
      }
    }

    // 2. Add Payment History record to subscription
    sub.payments.push({
      paymentDate: now,
      invoiceNumber: generatedInvoiceNumber || req.body.invoiceNumber || "",
      billingPeriod: billingPeriod,
      amount: finalRenewalAmount,
      paymentMethod: paymentMethod,
      referenceNo: referenceNo,
      status: paymentStatus,
      notes: notes || `Subscription renewed for ${durVal} ${durationUnit} (${billingPeriod})`,
    });

    await sub.save();
    
    // Return re-populated subscription
    const updatedSub = await Subscription.findById(sub._id).populate("client");

    res.json({
      message: `Subscription successfully renewed until ${formatDateStr(newEndDate)}!`,
      subscription: updatedSub,
      invoiceNumber: generatedInvoiceNumber,
    });
  } catch (error) {
    console.error("[Backend] Error renewing subscription:", error);
    res.status(500).json({ message: "Error renewing subscription", error: error.message });
  }
};

