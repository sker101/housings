import React from 'react';
import { SkeletonCard } from '../../components/SkeletonCard';
import { StatusPill } from '../../components/StatusPill';
import { useAuth } from '../../context/AuthContext';
import { useBookings } from '../../hooks/useBookings';
import { TZSFormat, formatDate } from '../../utils/format';
const COMMISSION_RATE = 0.05;

export default function DalaliEarnings() {
  const { user, token } = useAuth();
  const { bookings, loading, monthlyIncome } = useBookings('host', user?.userId ?? null, token);

  const paidTotal = bookings.filter((b) => b.payment_status === 'paid').reduce((s, b) => s + Number(b.amount ?? 0), 0);
  const commission = paidTotal * COMMISSION_RATE;

  return (
    <>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Payments Received', value: TZSFormat(paidTotal), sub: 'from paid bookings' },
          { label: 'Commission Earned (5%)',   value: TZSFormat(commission), sub: 'your brokerage share' },
          { label: 'This Month',               value: TZSFormat(monthlyIncome), sub: 'current month' },
        ].map((k) => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1rem' }}>
            <p style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</p>
            <p style={{ fontFamily: " sans-serif", fontSize: '1.55rem', fontWeight: 800, color: 'var(--amber)', lineHeight: 1.15, margin: '0.25rem 0 0' }}>{k.value}</p>
            <p style={{ fontSize: '0.76rem', color: 'var(--mid)', marginTop: '0.15rem' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Bookings Table */}
      <section>
        <h3 style={{ fontFamily: " sans-serif", fontSize: '1rem', marginBottom: '0.75rem' }}>All Bookings</h3>
        {loading ? (
          <div style={{ display: 'grid', gap: '0.5rem' }}><SkeletonCard variant="row" count={5} /></div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
            <p style={{ color: 'var(--mid)' }}>No bookings yet. Earnings will appear here once tenants book your properties.</p>
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'var(--cream)' }}>
                  {['Listing', 'Amount', 'Commission', 'Move-in', 'Status'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 700, color: 'var(--mid)', fontSize: '0.73rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, i) => (
                  <tr key={b.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 500 }}>{b.listing?.title ?? b.listing_id.slice(0, 8) + '…'}</td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>{TZSFormat(b.amount)}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: 'var(--amber)', fontWeight: 600 }}>{b.payment_status === 'paid' ? TZSFormat(Number(b.amount) * COMMISSION_RATE) : '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: 'var(--mid)' }}>{b.move_in_date ? formatDate(b.move_in_date) : '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem' }}><StatusPill variant={b.payment_status} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
