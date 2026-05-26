export const PM_FEE_RATE = 0.03;
export const PLATFORM_FEE_RATE = 0.02;

export interface FeeBreakdown {
  pmFee: number;
  platformFee: number;
  totalFees: number;
  totalAmount: number;
}

export function calculateFees(rent: number): FeeBreakdown {
  const pmFee = Math.round(rent * PM_FEE_RATE);
  const platformFee = Math.round(rent * PLATFORM_FEE_RATE);
  const totalFees = pmFee + platformFee;
  const totalAmount = rent + totalFees;

  return {
    pmFee,
    platformFee,
    totalFees,
    totalAmount,
  };
}

export function formatTZS(value?: number) {
  return `TZS ${Number(value || 0).toLocaleString('sw-TZ')}`;
}
