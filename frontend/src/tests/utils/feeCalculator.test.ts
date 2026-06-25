/**
 * Tests for the iRent Hybrid Payment Model
 *
 * New model (replacing old deposit system):
 *   Online:       Platform Fee (5% of total rent) + Gateway Fee (3.5% of platform fee)
 *   Cash move-in: 100% Rent (to landlord) + Dalali Fee (20% of 1 month, if applicable)
 */
import { describe, it, expect } from 'vitest';
import {
  calculateTenantPayment,
  PLATFORM_FEE_RATE,
  GATEWAY_FEE_RATE,
  DALALI_FEE_RATE,
} from '../../lib/paymentCalculations';

describe('Hybrid Model — Rate Constants', () => {
  it('Platform fee rate is exactly 5%', () => {
    expect(PLATFORM_FEE_RATE).toBe(0.05);
  });

  it('Gateway fee rate is exactly 3.5%', () => {
    expect(GATEWAY_FEE_RATE).toBe(0.035);
  });

  it('Dalali fee rate is exactly 20%', () => {
    expect(DALALI_FEE_RATE).toBe(0.20);
  });
});

describe('calculateTenantPayment — non-dalali listing (no dalali fee)', () => {
  const rent = 100_000; // TZS 100,000/month
  const result = calculateTenantPayment(rent, 1, false);

  it('Online fee = 5% of rent', () => {
    expect(result.platformFee).toBe(5_000);
  });

  it('Gateway fee = 3.5% of platform fee only (not full rent)', () => {
    // 3.5% of 5,000 = 175
    expect(result.gatewayFee).toBe(175);
  });

  it('Due today online = platform fee + gateway fee', () => {
    expect(result.dueTodayOnline).toBe(result.platformFee + result.gatewayFee);
  });

  it('Rent due in cash = 100% of total rent', () => {
    expect(result.dueLaterRent).toBe(100_000);
  });

  it('No dalali fee for non-dalali listing', () => {
    expect(result.daliFee).toBe(0);
  });

  it('isDalaliListing flag is false', () => {
    expect(result.isDalaliListing).toBe(false);
  });

  it('dueLaterTotal = rent only (no dalali)', () => {
    expect(result.dueLaterTotal).toBe(100_000);
  });

  it('Landlord receives 100% of listed rent — online fee does NOT touch rent', () => {
    // Online fee is separate from rent, landlord gets full rent
    expect(result.dueLaterRent).toBe(rent);
  });
});

describe('calculateTenantPayment — dalali listing (dalali fee applies)', () => {
  const rent = 100_000;
  const result = calculateTenantPayment(rent, 1, true);

  it('Dalali fee = 20% of ONE month rent', () => {
    expect(result.daliFee).toBe(20_000); // 20% of 100,000
  });

  it('isDalaliListing flag is true', () => {
    expect(result.isDalaliListing).toBe(true);
  });

  it('dueLaterTotal = rent + dalali fee', () => {
    expect(result.dueLaterTotal).toBe(120_000); // 100,000 + 20,000
  });

  it('Dalali fee is always ONE month only, regardless of months reserved', () => {
    const result3months = calculateTenantPayment(rent, 3, true);
    expect(result3months.daliFee).toBe(20_000); // Still 20% of ONE month
  });
});

describe('calculateTenantPayment — multi-month reservation', () => {
  const rent = 200_000;
  const result = calculateTenantPayment(rent, 3, false);

  it('totalRent = monthly rent × months', () => {
    expect(result.totalRent).toBe(600_000);
  });

  it('Platform fee scales with total rent (5% of 600,000)', () => {
    expect(result.platformFee).toBe(30_000);
  });

  it('Gateway fee is 3.5% of platform fee only (not 3.5% of total rent)', () => {
    expect(result.gatewayFee).toBe(Math.round(30_000 * 0.035)); // 1,050
  });

  it('Rent due later = full multi-month rent', () => {
    expect(result.dueLaterRent).toBe(600_000);
  });
});

describe('Scenario: Real-world rent amounts', () => {
  const scenarios = [
    { rent: 80_000,  months: 1, isDalali: false, expectedOnline: 80000*0.05 + Math.round(80000*0.05*0.035) },
    { rent: 150_000, months: 2, isDalali: false, expectedOnline: 150000*2*0.05 + Math.round(150000*2*0.05*0.035) },
    { rent: 300_000, months: 1, isDalali: true,  expectedDalali: 300000*0.20 },
    { rent: 500_000, months: 6, isDalali: false, expectedOnline: 500000*6*0.05 + Math.round(500000*6*0.05*0.035) },
  ];

  scenarios.forEach(({ rent, months, isDalali, expectedOnline, expectedDalali }) => {
    const label = `TZS ${rent.toLocaleString()} × ${months} mo (dalali=${isDalali})`;
    const result = calculateTenantPayment(rent, months, isDalali);

    if (expectedOnline !== undefined) {
      it(`${label}: dueTodayOnline matches expected`, () => {
        expect(result.dueTodayOnline).toBe(Math.round(expectedOnline));
      });
    }

    if (expectedDalali !== undefined) {
      it(`${label}: daliFee matches expected`, () => {
        expect(result.daliFee).toBe(Math.round(expectedDalali));
      });
    }
  });
});

describe('Edge cases', () => {
  it('Zero rent produces zero fees', () => {
    const result = calculateTenantPayment(0, 1, false);
    expect(result.platformFee).toBe(0);
    expect(result.gatewayFee).toBe(0);
    expect(result.dueTodayOnline).toBe(0);
    expect(result.dueLaterRent).toBe(0);
    expect(result.daliFee).toBe(0);
  });

  it('months < 1 defaults to 1 month', () => {
    const result0 = calculateTenantPayment(100_000, 0, false);
    const result1 = calculateTenantPayment(100_000, 1, false);
    expect(result0.totalRent).toBe(result1.totalRent);
  });

  it('months > 12 is accepted', () => {
    const result = calculateTenantPayment(100_000, 24, false);
    expect(result.totalRent).toBe(2_400_000);
  });
});
