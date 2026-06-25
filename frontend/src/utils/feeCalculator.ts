/**
 * feeCalculator.ts
 * Legacy utility — thin wrapper around the canonical paymentCalculations.ts.
 * Kept for backwards-compatibility with any components that import from here.
 * New code should import directly from '../lib/paymentCalculations'.
 */
export {
  PLATFORM_FEE_RATE,
  GATEWAY_FEE_RATE,
  DALALI_FEE_RATE,
  calculateTenantPayment,
  formatTZS,
  formatRate,
} from '../lib/paymentCalculations';

// Legacy alias: PM_FEE_RATE is no longer in the model but kept so old imports don't break.
// dalali fees are now tracked via DALALI_FEE_RATE (20% of 1 month, paid in cash).
/** @deprecated Use DALALI_FEE_RATE from paymentCalculations instead. */
export const PM_FEE_RATE = 0.0; // Removed from new hybrid model

/** @deprecated Use calculateTenantPayment from paymentCalculations instead. */
export function calculateFees(rent: number) {
  const platformFee = Math.round(rent * 0.05);
  const pmFee = 0; // No longer an online fee
  const totalFees = platformFee + pmFee;
  const totalAmount = rent + totalFees;
  return { pmFee, platformFee, totalFees, totalAmount };
}
