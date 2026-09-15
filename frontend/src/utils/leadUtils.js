import { convertToINR, getCurrencySymbol, getCurrencyCode } from "./currencyUtils";

/**
 * Helper utilities for lead pipeline calculations and states.
 */

/**
 * Determines if a currency string is non-INR (foreign).
 */
export const isForeignCurrency = (currencyStr) => {
  if (!currencyStr) return false;
  const code = getCurrencyCode(currencyStr);
  return code !== "INR";
};

/**
 * Determines if a lead is tax exempt (Personal Account or any currency other than INR).
 */
export const isLeadTaxExempt = (lead) => {
  if (!lead) return false;
  if (lead.isPersonalAccount) return true;
  return isForeignCurrency(lead.currency);
};

/**
 * Get currency symbol for a lead or currency string
 */
export const getLeadCurrencySymbol = (currency) => {
  return getCurrencySymbol(currency || "INR (₹)");
};

/**
 * Determines if a lead is active in the pipeline.
 * A lead is active if it is not Won or Lost, and not Completed or Cancelled.
 */
export const isLeadActiveInPipeline = (lead) => {
  if (!lead) return false;
  return (
    lead.currentStage !== "Won" &&
    lead.currentStage !== "Lost" &&
    lead.currentStatus !== "Completed" &&
    lead.currentStatus !== "Cancelled"
  );
};

/**
 * Calculates the effective final monetary value for a single lead considering GST settings.
 * - If Tax Exempt (Personal Account or USD), final value = base value (0% tax).
 * - If Inclusive GST, final value = base value.
 * - If Exclusive GST (inclusiveGst === false), final value = base value + 18% GST.
 */
export const getLeadFinalValue = (lead) => {
  if (!lead) return 0;
  const raw = Number(lead.value) || 0;
  if (isLeadTaxExempt(lead)) return raw;
  if (lead.inclusiveGst === false) {
    return Math.round(raw * 1.18 * 100) / 100;
  }
  return raw;
};

/**
 * Calculates the total pipeline monetary value in INR for a list of leads.
 */
export const calculatePipelineValue = (leadsList) => {
  if (!Array.isArray(leadsList)) return 0;
  return leadsList
    .filter(isLeadActiveInPipeline)
    .reduce((sum, l) => {
      const finalVal = getLeadFinalValue(l);
      return sum + convertToINR(finalVal, l.currency || "INR");
    }, 0);
};

