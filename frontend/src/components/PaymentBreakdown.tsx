import React, { useState } from 'react';
import { Info, ShieldCheck } from 'lucide-react';
import { PaymentBreakdown, formatTZS } from '../lib/paymentCalculations';

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

export const PaymentBreakdownComponent: React.FC<Props> = ({ 
  breakdown, 
  months, 
  elecType,
  elecCost,
  waterType,
  waterCost,
  wasteCost,
  onConfirm 
}) => {
  const [checked, setChecked] = useState(false);

  const monthlyRent = breakdown.monthlyRent;
  const activeElecCost = elecType !== 'included' ? Number(elecCost || 0) : 0;
  const activeWaterCost = waterType !== 'included' ? Number(waterCost || 0) : 0;
  const activeWasteCost = Number(wasteCost || 0);
  const totalOngoingMonthly = monthlyRent + activeElecCost + activeWaterCost + activeWasteCost;
  const hasOngoingUtilities = activeElecCost > 0 || activeWaterCost > 0 || activeWasteCost > 0;

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setChecked(isChecked);
    onConfirm(isChecked);
  };

  return (
    <div className="payment-breakdown" style={{ 
      background: 'var(--cream)', 
      padding: '1.5rem', 
      borderRadius: '12px',
      border: '1px solid var(--border)',
      fontFamily: "'Inter', sans-serif",
      color: 'var(--ink)'
    }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 700 }}>Payment Breakdown</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Monthly Rent */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--mid)', fontSize: '0.9rem' }}>
            {months > 1 ? `Rent (${months} months)` : 'Monthly Rent'}
          </span>
          <span style={{ fontWeight: 600 }}>{formatTZS(breakdown.monthlyRent)}</span>
        </div>

        {/* Platform Deposit Fee */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--mid)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Platform Deposit Fee <span title="A one-time deposit held securely by iRent, applied towards your tenancy"><Info size={14} style={{ cursor: 'help' }} /></span>
            </span>
            <span style={{ fontWeight: 600 }}>{formatTZS(breakdown.platformDepositFee)}</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--mid)', fontStyle: 'italic' }}>
            A one-time deposit held securely by iRent, applied towards your tenancy.
          </p>
        </div>

        {/* Gateway Transactional Fee */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--mid)', fontSize: '0.9rem' }}>Gateway Transactional Fee (3.5%)</span>
          <span style={{ fontWeight: 600 }}>{formatTZS(breakdown.gatewayFee)}</span>
        </div>

        {/* Total Row */}
        <div style={{ 
          marginTop: '0.5rem',
          background: 'var(--jade)', 
          color: 'white', 
          padding: '1rem', 
          borderRadius: '8px',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <span style={{ fontWeight: 700 }}>Total Due Today</span>
          <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>{formatTZS(breakdown.totalDue)}</span>
        </div>

        {hasOngoingUtilities && (
          <div style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '2px dashed var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>
              Ongoing Monthly Payments
            </h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--mid)', fontStyle: 'italic' }}>
              These recurring monthly costs are paid directly to your landlord or utility provider.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
              <span style={{ color: 'var(--mid)' }}>Monthly Room Rent:</span>
              <span style={{ fontWeight: 600 }}>{formatTZS(monthlyRent)}</span>
            </div>

            {activeElecCost > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--mid)' }}>Electricity (Estimated/Fixed):</span>
                <span style={{ fontWeight: 600 }}>+{formatTZS(activeElecCost)}</span>
              </div>
            )}

            {activeWaterCost > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--mid)' }}>Water (Estimated/Fixed):</span>
                <span style={{ fontWeight: 600 }}>+{formatTZS(activeWaterCost)}</span>
              </div>
            )}

            {activeWasteCost > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--mid)' }}>Waste Collection:</span>
                <span style={{ fontWeight: 600 }}>+{formatTZS(activeWasteCost)}</span>
              </div>
            )}

            <div style={{
              marginTop: '0.25rem',
              background: '#f8fafc',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid var(--border)'
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#475569' }}>Total Ongoing Monthly Layout:</span>
              <strong style={{ fontSize: '1.05rem', color: '#1e293b' }}>
                {formatTZS(totalOngoingMonthly)} / mo
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Styled Checkbox Section */}
      <div style={{ marginTop: '1.5rem' }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '12px', 
          cursor: 'pointer',
          padding: '12px',
          borderRadius: '10px',
          background: checked ? 'rgba(29, 158, 117, 0.05)' : 'white',
          border: `1px solid ${checked ? 'var(--jade)' : 'var(--border)'}`,
          transition: 'all 0.2s ease'
        }}>
          <div style={{ position: 'relative', width: '20px', height: '20px', flexShrink: 0, marginTop: '2px' }}>
            <input 
              type="checkbox" 
              id="confirm-fees" 
              checked={checked}
              onChange={handleCheckboxChange}
              style={{ 
                opacity: 0, 
                width: '100%', 
                height: '100%', 
                cursor: 'pointer',
                position: 'absolute',
                zIndex: 2
              }}
            />
            <div style={{ 
              width: '100%', 
              height: '100%', 
              borderRadius: '4px', 
              border: `2px solid ${checked ? 'var(--jade)' : 'var(--mid)'}`,
              background: checked ? 'var(--jade)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}>
              {checked && <ShieldCheck size={14} color="white" />}
            </div>
          </div>
          <span style={{ 
            fontSize: '0.88rem', 
            lineHeight: '1.5',
            color: checked ? 'var(--ink)' : 'var(--mid)',
            fontWeight: checked ? 600 : 400
          }}>
            I confirm that I have read the breakdown of charges (due today) and the additional monthly utility expenses (paid separately).
          </span>
        </label>
      </div>
    </div>
  );
};
