/**
 * Helper utilities for lead pipeline calculations and states.
 */

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
 * - If Personal Account or Inclusive GST, final value = base value.
 * - If Exclusive GST (inclusiveGst === false), final value = base value + 18% GST.
 */
export const getLeadFinalValue = (lead) => {
  if (!lead) return 0;
  const raw = Number(lead.value) || 0;
  if (lead.isPersonalAccount) return raw;
  if (lead.inclusiveGst === false) {
    return Math.round(raw * 1.18 * 100) / 100;
  }
  return raw;
};

/**
 * Calculates the total pipeline monetary value for a list of leads.
 */
export const calculatePipelineValue = (leadsList) => {
  if (!Array.isArray(leadsList)) return 0;
  return leadsList
    .filter(isLeadActiveInPipeline)
    .reduce((sum, l) => sum + getLeadFinalValue(l), 0);
};
