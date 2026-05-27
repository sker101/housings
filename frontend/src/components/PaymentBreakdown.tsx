import React, { useState } from 'react';
import { Info, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import {
  PaymentBreakdown,
  formatTZS,
  formatRate,
  PM_FEE_RATE,
  PLATFORM_FEE_RATE,
  DEPOSIT_RATE,
  GATEWAY_FEE_RATE,
} from '../lib/paymentCalculations';

interface Props {
  breakdown: PaymentBreakdown;
  months: number;
  elecType?: string | null;
  elecCost?: number;
  waterType?: string | null;
  waterCost?: number;
  wasteCost?: number;
  onConfirm: (confirmed: boolean) => void;
}

const Row: React.FC<{
  label: React.ReactNode;
  value: string;
  sub?: string;
  bold?: boolean;
  green?: boolean;
  amber?: boolean;
  indent?: boolean;
}> = ({ label, value, sub, bold, green, amber, indent }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, paddingLeft: indent ? 12 : 0 }}>
    <span style={{ color: bold ? 'var(--ink)' : '#475569', fontSize: indent ? '0.82rem' : '0.9rem', lineHeight: 1.4 }}>
      {label}
      {sub && <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>{sub}</span>}
    </span>
    <span style={{
      fontWeight: bold ? 700 : 600,
      fontSize: bold ? '1rem' : '0.9rem',
      color: green ? '#16a34a' : amber ? '#d97706' : 'var(--ink)',
      whiteSpace: 'nowrap',
    }}>
      {value}
    </span>
  </div>
);

const Divider = () => (
  <div style={{ height: 1, background: '#e2e8f0', margin: '0.5rem 0' }} />
);

export const PaymentBreakdownComponent: React.FC<Props> = ({
  breakdown,
  months,
  elecType,
  elecCost,
  waterType,
  waterCost,
  wasteCost,
  onConfirm,
}) => {
  const [checked, setChecked] = useState(false);
  const [feeDetailOpen, setFeeDetailOpen] = useState(false);

  const activeElecCost  = elecType  !== 'included' ? Number(elecCost  || 0) : 0;
  const activeWaterCost = waterType !== 'included' ? Number(waterCost || 0) : 0;
  const activeWasteCost = Number(wasteCost || 0);
  const totalOngoingMonthly = breakdown.baseMonthlyRent + activeElecCost + activeWaterCost + activeWasteCost;
  const hasOngoingUtilities = activeElecCost > 0 || activeWaterCost > 0 || activeWasteCost > 0;

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setChecked(isChecked);
    onConfirm(isChecked);
  };

  return (
    <div
      className="payment-breakdown"
      style={{
        background: '#f8fafc',
        padding: '1.5rem',
        borderRadius: 14,
        border: '1.5px solid #e2e8f0',
        fontFamily: "'Inter', sans-serif",
        color: 'var(--ink)',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '1.25rem', fontSize: '1.05rem', fontWeight: 700 }}>
        💳 Payment Breakdown
      </h3>

      {/* ── What you pay today ─────────────────────────── */}
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', fontWeight: 600 }}>
        Due at Reservation
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <Row
          label={months > 1 ? `Base Rent (${months} months × ${formatTZS(breakdown.baseMonthlyRent)})` : 'Monthly Rent'}
          value={formatTZS(breakdown.monthlyRent)}
        />
        <Row
          label={
            <>
              Platform Deposit{' '}
              <span
                title={`One-time deposit = ${formatRate(DEPOSIT_RATE)} of 1 month's rent. Held securely by iRent.`}
                style={{ cursor: 'help', verticalAlign: 'middle' }}
              >
                <Info size={13} style={{ display: 'inline', marginLeft: 3 }} />
              </span>
            </>
          }
          value={formatTZS(breakdown.platformDepositFee)}
          sub={`${formatRate(DEPOSIT_RATE)} of 1 month — one-time, held securely`}
        />
        <Row
          label={`Payment Gateway Fee (${formatRate(GATEWAY_FEE_RATE)})`}
          value={formatTZS(breakdown.gatewayFee)}
          sub="Mobile money processing charge"
        />
      </div>

      {/* Total due */}
      <div style={{
        marginTop: '1rem',
        background: 'linear-gradient(135deg, #1d9e75 0%, #27500A 100%)',
        color: 'white',
        padding: '1rem 1.25rem',
        borderRadius: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Total Due Today</span>
        <span style={{ fontWeight: 800, fontSize: '1.3rem' }}>{formatTZS(breakdown.totalDue)}</span>
      </div>

      {/* ── Fee transparency accordion ─────────────────── */}
      <div style={{ marginTop: '1rem', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setFeeDetailOpen((o) => !o)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.7rem 1rem',
            background: '#f1f5f9',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#475569',
          }}
        >
          <span>ℹ️ How platform fees work</span>
          {feeDetailOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {feeDetailOpen && (
          <div style={{ padding: '0.85rem 1rem', background: '#fff', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
              Two additional fees are included inside your monthly rent and deducted before the landlord is paid.
              <strong> These are not extra charges to you.</strong>
            </p>
            <Row
              label={`Property Mgmt. Fee (${formatRate(PM_FEE_RATE)} / month)`}
              value={formatTZS(breakdown.pmFee)}
              sub="Covers property oversight & coordination"
              indent
            />
            <Row
              label={`Platform Service Fee (${formatRate(PLATFORM_FEE_RATE)} / month)`}
              value={formatTZS(breakdown.platformFee)}
              sub="Keeps iRent running & improves your experience"
              indent
            />
            <Divider />
            <Row
              label="Landlord Receives (from rent)"
              value={formatTZS(breakdown.landlordReceives)}
              green
              bold
              sub={`${formatRate(1 - PM_FEE_RATE - PLATFORM_FEE_RATE)} of base rent`}
            />
          </div>
        )}
      </div>

      {/* ── Ongoing monthly costs (utilities) ──────────── */}
      {hasOngoingUtilities && (
        <div style={{
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '2px dashed #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}>
          <p style={{ margin: '0 0 0.35rem', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', fontWeight: 600 }}>
            Ongoing Monthly (paid separately)
          </p>

          <Row label="Room Rent:" value={`${formatTZS(breakdown.baseMonthlyRent)} / mo`} />
          {activeElecCost > 0 && (
            <Row label="⚡ Electricity (est.):" value={`+${formatTZS(activeElecCost)} / mo`} amber />
          )}
          {activeWaterCost > 0 && (
            <Row label="💧 Water (est.):" value={`+${formatTZS(activeWaterCost)} / mo`} amber />
          )}
          {activeWasteCost > 0 && (
            <Row label="🗑️ Waste Collection:" value={`+${formatTZS(activeWasteCost)} / mo`} amber />
          )}
          <div style={{
            background: 'rgba(29, 158, 117, 0.07)',
            border: '1px solid rgba(29, 158, 117, 0.2)',
            borderRadius: 8,
            padding: '0.65rem 0.85rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1d9e75' }}>Total Monthly Layout:</span>
            <strong style={{ fontSize: '1rem', color: '#27500A' }}>{formatTZS(totalOngoingMonthly)} / mo</strong>
          </div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
            Utility costs are estimates. Pay directly to landlord or provider each month.
          </p>
        </div>
      )}

      {/* ── Confirmation checkbox ────────────────────────── */}
      <div style={{ marginTop: '1.5rem' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            cursor: 'pointer',
            padding: 12,
            borderRadius: 10,
            background: checked ? 'rgba(29, 158, 117, 0.05)' : 'white',
            border: `1.5px solid ${checked ? 'var(--jade)' : '#e2e8f0'}`,
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ position: 'relative', width: 20, height: 20, flexShrink: 0, marginTop: 2 }}>
            <input
              type="checkbox"
              id="confirm-fees"
              checked={checked}
              onChange={handleCheckboxChange}
              style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer', position: 'absolute', zIndex: 2 }}
            />
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: 4,
              border: `2px solid ${checked ? 'var(--jade)' : '#94a3b8'}`,
              background: checked ? 'var(--jade)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}>
              {checked && <ShieldCheck size={13} color="white" />}
            </div>
          </div>
          <span style={{
            fontSize: '0.85rem',
            lineHeight: 1.5,
            color: checked ? 'var(--ink)' : '#64748b',
            fontWeight: checked ? 600 : 400,
          }}>
            I confirm that I have reviewed the payment breakdown above — including fees due today and any ongoing monthly utility costs paid separately.
          </span>
        </label>
      </div>
    </div>
  );
};
