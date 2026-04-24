import React, { useState } from 'react';
import { Info, ShieldCheck } from 'lucide-react';
import { PaymentBreakdown, formatTZS } from '../lib/paymentCalculations';

interface Props {
  breakdown: PaymentBreakdown;
  months: number;
  onConfirm: (confirmed: boolean) => void;
}

export const PaymentBreakdownComponent: React.FC<Props> = ({ breakdown, months, onConfirm }) => {
  const [checked, setChecked] = useState(false);

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
              Platform Deposit Fee <Info size={14} style={{ cursor: 'help' }} title="A one-time deposit held securely by iRent, applied towards your tenancy" />
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
            I confirm that I have read and understood the breakdown of charges including the platform deposit and transactional fees.
          </span>
        </label>
      </div>
    </div>
  );
};
