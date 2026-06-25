/**
 * paymentCalculations.ts
 * Pure functions for the iRent Hybrid Payment Model.
 * Provider-agnostic. Single source of truth for all fee rates.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * HOW THE HYBRID MODEL WORKS:
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  WHAT THE TENANT PAYS ONLINE (to reserve the room):
 *    1. Platform Service Fee  — 5% of total rent. Goes to iRent.
 *    2. Gateway Fee           — 3.5% of the Platform Fee only (not the full rent).
 *                               This keeps mobile money charges minimal.
 *
 *  WHAT THE TENANT PAYS IN CASH AT MOVE-IN (directly to the people):
 *    3. Monthly Rent          — 100% goes directly to the landlord.
 *    4. Dalali Fee            — 20% of ONE month's rent, paid directly to the
 *                               dalali (property manager) who found the room.
 *                               Only applies if the listing is managed by a dalali.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS WORKS FOR EVERYONE:
 *   - Tenant saves ~80% vs traditional one-month-rent dalali fee.
 *   - Dalali gets a reliable income per placement, plus a loyal recurring client.
 *   - Landlord receives 100% of rent directly — zero platform cuts.
 *   - iRent earns its 5% commission reliably without touching rent money.
 * ─────────────────────────────────────────────────────────────────────────
 */

// ── Rate constants (single source of truth) ──────────────────────────────────
export const PLATFORM_FEE_RATE = 0.05;   // 5%  — iRent service fee (charged online)
export const GATEWAY_FEE_RATE  = 0.035;  // 3.5% — Mobile money fee (on platform fee only)
export const DALALI_FEE_RATE   = 0.20;   // 20%  — Dalali commission (one month, paid in cash)

/**
 * PaymentBreakdown — the complete financial picture for a tenant reservation.
 */
export interface PaymentBreakdown {
  /** Number of months being reserved. */
  months: number;
  /** The raw per-month rent price. */
  baseMonthlyRent: number;
  /** Total rent for all reserved months (baseMonthlyRent × months). */
  totalRent: number;

  // ── Online charges (processed by mobile money) ────────────────────────────
  /** Platform Service Fee: 5% of total rent. Paid to iRent online. */
  platformFee: number;
  /** Gateway processing fee: 3.5% of the platform fee (NOT of full rent). */
  gatewayFee: number;
  /** Grand total charged online to reserve the room. */
  dueTodayOnline: number;

  // ── Cash charges (paid directly at move-in) ───────────────────────────────
  /** Full rent amount — 100% paid directly to the landlord in cash. */
  dueLaterRent: number;
  /**
   * Dalali (Property Manager) fee: 20% of ONE month's rent, paid in cash.
   * Only applies when listing lister_type = 'dalali' | 'property_manager'.
   * Pass isDalaliListing = true to calculateTenantPayment() to include this.
   */
  daliFee: number;
  /** True if this listing is managed by a Dalali. */
  isDalaliListing: boolean;
  /** Total cash to prepare at move-in (rent + dalali fee if applicable). */
  dueLaterTotal: number;
}

/**
 * Calculates the full payment breakdown for a tenant at lease initiation.
 *
 * @param monthlyRent      The monthly rent price in TZS.
 * @param months           Number of months to reserve (default 1).
 * @param isDalaliListing  Whether the listing is managed by a dalali (default false).
 */
export function calculateTenantPayment(
  monthlyRent: number,
  months: number = 1,
  isDalaliListing: boolean = false
): PaymentBreakdown {
  const safeMonths = Math.max(1, Math.round(months));
  const totalRent  = monthlyRent * safeMonths;

  // ── Online ────────────────────────────────────────────────────────────────
  const platformFee     = Math.round(totalRent * PLATFORM_FEE_RATE);
  const gatewayFee      = Math.round(platformFee * GATEWAY_FEE_RATE);
  const dueTodayOnline  = platformFee + gatewayFee;

  // ── Cash at move-in ───────────────────────────────────────────────────────
  const dueLaterRent = totalRent;
  const daliFee      = isDalaliListing ? Math.round(monthlyRent * DALALI_FEE_RATE) : 0;
  const dueLaterTotal = dueLaterRent + daliFee;

  return {
    months: safeMonths,
    baseMonthlyRent: monthlyRent,
    totalRent,
    platformFee,
    gatewayFee,
    dueTodayOnline,
    dueLaterRent,
    daliFee,
    isDalaliListing,
    dueLaterTotal,
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
  const pct = rate * 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}
