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
export const PM_FEE_RATE = 0.03;       // 3%  — property manager share
export const PLATFORM_FEE_RATE = 0.02; // 2%  — platform service share
export const DEPOSIT_RATE = 0.50;      // 50% — one-time platform deposit
export const GATEWAY_FEE_RATE = 0.035; // 3.5% — payment gateway processing fee

export interface PaymentBreakdown {
  /** The raw per-month rent price (not multiplied by months). */
  baseMonthlyRent: number;
  /** Rent portion of payment (baseMonthlyRent × months). */
  monthlyRent: number;
  /** Number of months being reserved. */
  months: number;

  // ── Fees charged to the tenant ────────────────────────────────────────────
  /**
   * One-time platform deposit (50% of ONE month's rent).
   * Held securely by the platform and applied towards tenancy.
   */
  platformDepositFee: number;
  /** Payment gateway processing fee (3.5% of rentTotal + deposit). */
  gatewayFee: number;

  // ── Fee transparency (not extra charges — deducted from landlord's share) ──
  /**
   * Property manager commission (3% of base rent per month × months).
   * Informational: included in rent, not an additional tenant charge.
   */
  pmFee: number;
  /**
   * Platform service fee (2% of base rent per month × months).
   * Informational: included in rent, not an additional tenant charge.
   */
  platformFee: number;
  /** Amount landlord actually receives after PM & platform fees. */
  landlordReceives: number;

  /** Grand total the tenant must pay today to reserve the room. */
  totalDue: number;
}

/**
 * Calculates the full payment breakdown for a tenant at lease initiation.
 *
 * What the tenant pays:
 *   rent (× months) + platformDeposit (50%, one-time) + gatewayFee (3.5%)
 *
 * Fee transparency (included in rent, not extra):
 *   PM fee (3% / month) + Platform fee (2% / month)
 */
export function calculateTenantPayment(monthlyRent: number, months: number = 1): PaymentBreakdown {
  const safeMonths = Math.max(1, Math.round(months));
  const rentTotal = monthlyRent * safeMonths;
  const platformDepositFee = monthlyRent * DEPOSIT_RATE; // 50% of ONE month only
  const subtotal = rentTotal + platformDepositFee;
  const gatewayFee = Math.round(subtotal * GATEWAY_FEE_RATE);
  const totalDue = Math.round(subtotal + gatewayFee);

  // Informational — deducted from rent before remittance to landlord
  const pmFee = Math.round(rentTotal * PM_FEE_RATE);
  const platformFee = Math.round(rentTotal * PLATFORM_FEE_RATE);
  const landlordReceives = rentTotal - pmFee - platformFee;

  return {
    baseMonthlyRent: monthlyRent,
    monthlyRent: rentTotal,
    months: safeMonths,
    platformDepositFee: Math.round(platformDepositFee),
    gatewayFee,
    pmFee,
    platformFee,
    landlordReceives,
    totalDue,
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
