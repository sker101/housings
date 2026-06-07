/**
 * paymentCalculations.ts
 * Pure functions for tenant payment calculations.
 * Provider-agnostic.
 *
 * Fee structure (all rates defined here as single source of truth):
 *  - PM_FEE_RATE        3%   Property manager commission (from rent, not extra)
 *  - PLATFORM_FEE_RATE  2%   Platform service fee (from rent, not extra)
 *  - DEPOSIT_RATE       50%  One-time platform deposit (held securely, first month only)
 *  - GATEWAY_FEE_RATE   3.5% Payment processing fee charged to tenant
 */

// ── Rate constants (single source of truth) ──────────────────────────────────
export const PM_FEE_RATE = 0;          // No longer deducted from landlord
export const PLATFORM_FEE_RATE = 0.05; // 5% — platform service fee charged to TENANT
export const DEPOSIT_RATE = 0.50;      // 50% — one-time platform deposit
export const GATEWAY_FEE_RATE = 0.035; // 3.5% — payment gateway processing fee

export interface PaymentBreakdown {
  /** The raw per-month rent price. */
  baseMonthlyRent: number;
  /** Rent portion of payment (baseMonthlyRent × months). */
  monthlyRent: number;
  /** Number of months being reserved. */
  months: number;

  // ── Fees charged to the tenant ────────────────────────────────────────────
  /** Platform service fee (5% of total rent). */
  platformFee: number;
  /**
   * One-time platform deposit (50% of ONE month's rent).
   * Acts as an advance payment on rent.
   */
  platformDepositFee: number;
  /** Payment gateway processing fee (3.5% of total rent + platform fee). */
  gatewayFee: number;

  // ── Totals ────────────────────────────────────────────────────────────────
  /** Grand total cost of the lease including all fees. */
  totalLeaseCost: number;
  /** Amount the tenant must pay TODAY to reserve the room (Deposit + Platform Fee + Gateway Fee). */
  dueAtReservation: number;
  /** Amount the tenant will pay LATER (Total Rent - Deposit). */
  dueLater: number;
}

/**
 * Calculates the full payment breakdown for a tenant at lease initiation.
 */
export function calculateTenantPayment(monthlyRent: number, months: number = 1): PaymentBreakdown {
  const safeMonths = Math.max(1, Math.round(months));
  const rentTotal = monthlyRent * safeMonths;
  
  // Tenant fees
  const platformFee = Math.round(rentTotal * PLATFORM_FEE_RATE);
  const platformDepositFee = monthlyRent * DEPOSIT_RATE; // 50% of ONE month only
  
  // Gateway fee is calculated based on the TOTAL cost (Rent + Platform Fee) once.
  const gatewayFee = Math.round((rentTotal + platformFee) * GATEWAY_FEE_RATE);
  
  // Grand total for the entire lease duration
  const totalLeaseCost = rentTotal + platformFee + gatewayFee;
  
  // What they pay today to reserve (Deposit + Platform Fee + Gateway Fee)
  const dueAtReservation = platformDepositFee + platformFee + gatewayFee;
  
  // What they pay later (Remaining rent)
  const dueLater = rentTotal - platformDepositFee;

  return {
    baseMonthlyRent: monthlyRent,
    monthlyRent: rentTotal,
    months: safeMonths,
    platformFee,
    platformDepositFee: Math.round(platformDepositFee),
    gatewayFee,
    totalLeaseCost,
    dueAtReservation: Math.round(dueAtReservation),
    dueLater: Math.round(dueLater),
  };
}

/**
 * Formats currency in TZS using Swahili (Tanzania) locale.
 */
export function formatTZS(amount: number): string {
  return new Intl.NumberFormat('sw-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a percentage as a human-readable string e.g. 0.035 → "3.5%"
 */
export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(rate % 0.01 === 0 ? 0 : 1)}%`;
}
