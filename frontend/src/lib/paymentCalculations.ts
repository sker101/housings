/**
 * paymentCalculations.ts
 * Pure functions for tenant payment calculations.
 * Provider-agnostic.
 */

export interface PaymentBreakdown {
  monthlyRent: number;
  platformDepositFee: number;
  gatewayFee: number;
  totalDue: number;
}

/**
 * Calculates the payment breakdown for a tenant at lease initiation.
 * - Platform deposit fee: Fixed at 50% of ONE month's rent (one-time fee).
 * - Gateway transactional fee: 3.5% assumption for payment providers like AzamPay.
 */
export function calculateTenantPayment(monthlyRent: number, months: number = 1): PaymentBreakdown {
  const platformDepositFee = monthlyRent * 0.5;
  const rentTotal = monthlyRent * months;
  const subtotal = rentTotal + platformDepositFee;
  const gatewayFee = subtotal * 0.035; // 3.5% transaction fee
  const totalDue = subtotal + gatewayFee;

  return {
    monthlyRent: rentTotal, // The rent portion of the payment
    platformDepositFee,
    gatewayFee,
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
