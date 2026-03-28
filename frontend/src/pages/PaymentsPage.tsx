import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { selectRows, updateRows } from '../lib/supabase';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function formatMoney(value) {
  return `TZS ${new Intl.NumberFormat('sw-TZ').format(Number(value || 0))}`;
}

function statusChip(status: string) {
  const colors: Record<string, string> = {
    pending: '#c47900',
    paid: '#1a7f37',
    late: '#cf222e',
    overdue: '#cf222e'
  };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '12px',
        background: colors[status] ? `${colors[status]}22` : '#eee',
        color: colors[status] || '#666',
        fontWeight: 600,
        fontSize: '0.8rem',
        textTransform: 'capitalize'
      }}
    >
      {status}
    </span>
  );
}
void statusChip;

export default function PaymentsPage() {
  const { user, token } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [commissionPct, setCommissionPct] = useState(0);
  const [approvedBookings, setApprovedBookings] = useState<any[]>([]);

  async function loadPayments() {
    if (!user?.userId || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Fetch lister's bookings
      const bookings = await selectRows('bookings', {
        select: 'id,listing_id,tenant_id,move_in_date,duration_months,status',
        filters: [{ column: 'lister_id', op: 'eq', value: user.userId }],
        order: 'created_at.desc',
        limit: 200,
        accessToken: token
      });

      if (bookings.length === 0) {
        setRecords([]);
        setLoading(false);
        return;
      }

      // Fetch payment records for those bookings
      const bookingIds = bookings.map((b) => b.id);
      const payments = await selectRows('payment_records', {
        select: 'id,booking_id,amount,due_date,status,paid_at',
        filters: [{ column: 'booking_id', op: 'in', value: `(${bookingIds.join(',')})` }],
        order: 'due_date.asc',
        accessToken: token
      });

      // Merge info
      const bookingMap = new Map(bookings.map((b) => [b.id, b]));

      // Fetch listing titles
      const listingIds = Array.from(new Set(bookings.map((b) => b.listing_id)));
      const listings = await selectRows('listings', {
        select: 'id,title,price_monthly',
        filters: [{ column: 'id', op: 'in', value: `(${listingIds.join(',')})` }],
        accessToken: token
      });
      const listingMap = new Map(listings.map((l) => [l.id, l]));

      // Fetch tenant names
      const tenantIds = Array.from(new Set(bookings.map((b) => b.tenant_id)));
      const tenants = await selectRows('profiles', {
        select: 'id,full_name,commission_rate_pct',
        filters: [{ column: 'id', op: 'in', value: `(${tenantIds.join(',')})` }],
        accessToken: token
      });
      const tenantMap = new Map(tenants.map((t) => [t.id, t]));

      const profileRows = await selectRows('profiles', {
        select: 'commission_rate_pct',
        filters: [{ column: 'id', op: 'eq', value: user.userId }],
        accessToken: token
      });
      const rate = profileRows?.[0]?.commission_rate_pct || 0;
      setCommissionPct(rate);

      const enriched = payments.map((p) => {
        const booking = bookingMap.get((p as any).booking_id) as any;
        return {
          ...p,
          listing: booking ? listingMap.get(booking.listing_id) : null,
          tenant: booking ? tenantMap.get(booking.tenant_id) : null,
          booking
        };
      });

      const approved = bookings
        .filter((b) => b.status === 'approved')
        .map((b) => {
          const listing: any = listingMap.get(b.listing_id);
          const tenant = tenantMap.get(b.tenant_id);
          const commission = listing ? (Number(listing.price_monthly || 0) * rate) / 100 : 0;
          return { ...b, listing, tenant, commission };
        });

      setRecords(enriched);
      setApprovedBookings(approved);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, token]);

  const markReceived = async (paymentId: string) => {
    setMarkingId(paymentId);
    setError('');
    try {
      await updateRows(
        'payment_records',
        { status: 'paid', paid_at: new Date().toISOString() },
        { filters: [{ column: 'id', op: 'eq', value: paymentId }], accessToken: token }
      );
      setRecords((prev) =>
        prev.map((r) =>
          r.id === paymentId ? { ...r, status: 'paid', paid_at: new Date().toISOString() } : r
        )
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMarkingId(null);
    }
  };

  const totalOutstanding = records
    .filter((r) => r.status === 'pending' || r.status === 'late')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const totalReceived = records
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const monthlyCommissions = approvedBookings.reduce((sum, b) => sum + (b.commission || 0), 0);

  const initials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} .pay-page{padding:2rem;max-width:100%;animation:fadeUp 0.35s ease} .pay-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2rem} .kpi-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:2rem} .kpi-card{background:#ffffff;border:0.5px solid var(--border);border-radius:14px;padding:16px 18px} .kpi-label{font-size:11px;color:var(--mid);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em} .kpi-value{font-size:22px;font-weight:700;line-height:1} .kpi-sub{font-size:11px;margin-top:4px;color:var(--mid)} .section-card{background:#ffffff;border:0.5px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:1.5rem} .section-card-header{padding:16px 20px;border-bottom:0.5px solid var(--border);display:flex;justify-content:space-between;align-items:center} .section-title{font-size:14px;font-weight:600;color:var(--ink)} .section-sub{font-size:12px;color:var(--mid);margin-top:2px} .pay-table{width:100%;border-collapse:collapse;font-size:13px} .pay-table th{padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:var(--mid);text-transform:uppercase;letter-spacing:.04em;border-bottom:0.5px solid var(--border);background:#fafafa} .pay-table td{padding:12px 16px;border-bottom:0.5px solid var(--border);color:var(--ink);vertical-align:middle} .pay-table tr:last-child td{border-bottom:none} .pay-table tr:hover td{background:#fafcfb} .tenant-cell{display:flex;align-items:center;gap:8px} .avatar{width:28px;height:28px;border-radius:50%;background:#EEEDFE;color:#3C3489;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;flex-shrink:0} .status-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600} .status-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0} .mark-btn{padding:5px 12px;border-radius:8px;border:0.5px solid var(--border);background:#fff;font-size:12px;font-weight:500;cursor:pointer;color:var(--ink);transition:background 0.15s} .mark-btn:hover{background:var(--cream)} .mark-btn:disabled{opacity:0.5;cursor:not-allowed} .empty-state{padding:3rem 2rem;text-align:center;color:var(--mid);font-size:13px} .comm-row{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:0.5px solid var(--border);font-size:13px} .comm-row:last-child{border-bottom:none} .comm-row:hover{background:#fafcfb} @media(max-width:768px){.kpi-strip{grid-template-columns:1fr 1fr}.pay-page{padding:1rem}.pay-header{flex-direction:column;gap:1rem}}`}</style>

      <div className="pay-page">
        <div className="pay-header">
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Payments &amp; Earnings</h1>
            <p style={{ marginTop: 4, fontSize: 13, color: 'var(--mid)' }}>
              Track rent, commissions and your monthly earnings
            </p>
          </div>
          <Link
            to="/landlord"
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '0.5px solid var(--border)',
              background: '#fff',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ink)',
              textDecoration: 'none'
            }}
          >
            ← Back to dashboard
          </Link>
        </div>

        {error ? <p className="error-text" style={{ marginTop: '-0.5rem' }}>{error}</p> : null}

        <div className="kpi-strip">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`kpi-skel-${i}`}
                  style={{
                    height: 80,
                    borderRadius: 14,
                    background: 'var(--cream)',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}
                />
              ))
            : (
              <>
                <div className="kpi-card">
                  <div className="kpi-label">Total received</div>
                  <div className="kpi-value" style={{ color: '#1a7f37' }}>{formatMoney(totalReceived)}</div>
                  <div className="kpi-sub">All time collected</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Outstanding</div>
                  <div className="kpi-value" style={{ color: '#cf222e' }}>{formatMoney(totalOutstanding)}</div>
                  <div className="kpi-sub">Pending + overdue</div>
                </div>
                  <div className="kpi-card">
                  <div className="kpi-label">Commission rate</div>
                  <div className="kpi-value" style={{ color: 'var(--jade)' }}>{commissionPct}%</div>
                  <div className="kpi-sub">Your platform rate</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Monthly commissions</div>
                  <div className="kpi-value" style={{ color: 'var(--jade)' }}>{formatMoney(monthlyCommissions)}</div>
                  <div className="kpi-sub">From active tenants</div>
                </div>
              </>
            )}
        </div>

        <div className="section-card">
          <div className="section-card-header">
            <div>
              <p className="section-title">Rent Payment Records</p>
              <p className="section-sub">{records.length} records across all bookings</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
              Loading payments…
            </div>
          ) : records.length === 0 ? (
            <div className="empty-state">
              No payment records yet — they are created automatically when you approve a booking.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="pay-table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Property</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const statusText = String(r.status || '');
                    const isOverdue = r.status !== 'paid' && r.due_date && new Date(r.due_date) < new Date();
                    let pillBg = '#fff8ec';
                    let pillColor = '#c47900';
                    if (statusText === 'paid') {
                      pillBg = '#f0faf4';
                      pillColor = '#1a7f37';
                    } else if (statusText === 'late' || statusText === 'overdue' || isOverdue) {
                      pillBg = '#fef2f2';
                      pillColor = '#cf222e';
                    }
                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="tenant-cell">
                            <div className="avatar">{initials(r.tenant?.full_name)}</div>
                            <span>{r.tenant?.full_name || '—'}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 500 }}>{r.listing?.title || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{formatMoney(r.amount)}</td>
                        <td style={{ color: isOverdue ? '#cf222e' : 'var(--ink)', fontWeight: isOverdue ? 500 : 400 }}>
                          {formatDate(r.due_date)}
                        </td>
                        <td>
                          <span className="status-pill" style={{ background: pillBg, color: pillColor }}>
                            <span className="status-dot" style={{ background: pillColor }} />
                            {statusText ? statusText.charAt(0).toUpperCase() + statusText.slice(1) : '—'}
                          </span>
                        </td>
                        <td>
                          {r.status !== 'paid' ? (
                            <button
                              className="mark-btn"
                              disabled={markingId === r.id}
                              onClick={() => markReceived(r.id)}
                            >
                              {markingId === r.id ? 'Saving…' : '✓ Mark received'}
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--mid)' }}>
                              Received {formatDate(r.paid_at)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="section-card">
          <div className="section-card-header">
            <div>
              <p className="section-title">Commission Tracking</p>
              <p className="section-sub">Calculated from your active approved bookings</p>
            </div>
          </div>

          {approvedBookings.length === 0 ? (
            <div className="empty-state">
              No approved bookings yet — approve a booking request to start tracking commissions.
            </div>
          ) : (
            <>
              {approvedBookings.map((b) => (
                <div key={b.id} className="comm-row">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{b.tenant?.full_name || '—'}</span>
                    <span style={{ fontSize: 11, color: 'var(--mid)' }}>{b.listing?.title || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--jade)' }}>
                      {formatMoney(b.commission)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--mid)' }}>
                      of TZS {new Intl.NumberFormat('sw-TZ').format(Number(b.listing?.price_monthly || 0))}/mo
                    </span>
                  </div>
                </div>
              ))}
              <div
                style={{
                  borderTop: '0.5px solid var(--border)',
                  padding: '14px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  Total monthly commissions
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--jade)' }}>
                  {formatMoney(monthlyCommissions)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
