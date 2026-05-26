import { describe, it, expect } from 'vitest';
import { calculateFees, formatTZS, PM_FEE_RATE, PLATFORM_FEE_RATE } from '../../utils/feeCalculator';

describe('Fee Model Constants', () => {
  it('PM fee rate should be exactly 3%', () => {
    expect(PM_FEE_RATE).toBe(0.03);
  });

  it('Platform fee rate should be exactly 2%', () => {
    expect(PLATFORM_FEE_RATE).toBe(0.02);
  });
});

describe('calculateFees — core fee logic', () => {
  it('Tenant pays rent × 1.05 total (3% PM + 2% platform on top)', () => {
    const rent = 100_000; // TZS 100,000
    const { totalAmount } = calculateFees(rent);
    expect(totalAmount).toBe(105_000);
  });

  it('PM earns exactly 3% of base rent', () => {
    const rent = 200_000;
    const { pmFee } = calculateFees(rent);
    expect(pmFee).toBe(6_000); // 3% of 200,000
  });

  it('iRent platform earns exactly 2% of base rent', () => {
    const rent = 200_000;
    const { platformFee } = calculateFees(rent);
    expect(platformFee).toBe(4_000); // 2% of 200,000
  });

  it('Landlord receives 100% of base rent — no deductions (pmFee + platformFee are additive, not deducted from rent)', () => {
    const rent = 500_000;
    const { pmFee, platformFee, totalAmount } = calculateFees(rent);
    // The landlord's share is the base rent — verify it equals totalAmount minus the two fees
    const landlordShare = totalAmount - pmFee - platformFee;
    expect(landlordShare).toBe(rent); // Landlord gets 100% of listed rent
  });

  it('PM fee + platform fee = 5% of rent', () => {
    const rent = 300_000;
    const { totalFees } = calculateFees(rent);
    expect(totalFees).toBe(rent * 0.05); // 15,000
  });

  it('totalAmount = base rent + pmFee + platformFee', () => {
    const rent = 150_000;
    const { pmFee, platformFee, totalAmount } = calculateFees(rent);
    expect(totalAmount).toBe(rent + pmFee + platformFee);
  });

  it('returns zero fees for zero rent', () => {
    const { pmFee, platformFee, totalFees, totalAmount } = calculateFees(0);
    expect(pmFee).toBe(0);
    expect(platformFee).toBe(0);
    expect(totalFees).toBe(0);
    expect(totalAmount).toBe(0);
  });

  it('rounds fees correctly for non-round rent (TZS 75,000)', () => {
    const rent = 75_000;
    const { pmFee, platformFee, totalAmount } = calculateFees(rent);
    expect(pmFee).toBe(Math.round(75_000 * 0.03));   // 2,250
    expect(platformFee).toBe(Math.round(75_000 * 0.02)); // 1,500
    expect(totalAmount).toBe(rent + pmFee + platformFee);
  });

  it('fees are ADDITIVE — total exceeds base rent', () => {
    const rent = 400_000;
    const { totalAmount } = calculateFees(rent);
    expect(totalAmount).toBeGreaterThan(rent);
  });
});

describe('formatTZS — currency formatting', () => {
  it('formats a number as TZS currency', () => {
    const result = formatTZS(100_000);
    expect(result).toContain('TZS');
    expect(result).toContain('100');
  });

  it('handles undefined gracefully (defaults to 0)', () => {
    const result = formatTZS(undefined);
    expect(result).toContain('TZS');
    expect(result).toContain('0');
  });

  it('handles zero', () => {
    const result = formatTZS(0);
    expect(result).toContain('TZS');
  });
});

describe('Fee model scenario — real-world rent amounts', () => {
  const scenarios = [
    { rent: 100_000, expectedPm: 3_000,  expectedPlatform: 2_000,  expectedTotal: 105_000 },
    { rent: 250_000, expectedPm: 7_500,  expectedPlatform: 5_000,  expectedTotal: 262_500 },
    { rent: 500_000, expectedPm: 15_000, expectedPlatform: 10_000, expectedTotal: 525_000 },
    { rent: 800_000, expectedPm: 24_000, expectedPlatform: 16_000, expectedTotal: 840_000 },
  ];

  scenarios.forEach(({ rent, expectedPm, expectedPlatform, expectedTotal }) => {
    it(`rent TZS ${rent.toLocaleString()}: pm=${expectedPm}, platform=${expectedPlatform}, total=${expectedTotal}`, () => {
      const { pmFee, platformFee, totalAmount } = calculateFees(rent);
      expect(pmFee).toBe(expectedPm);
      expect(platformFee).toBe(expectedPlatform);
      expect(totalAmount).toBe(expectedTotal);
    });
  });
});
