import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { APP_ROLE } from '../lib/roles';
import { selectRows, updateRows } from '../lib/supabase';

type ListingRow = {
  id: string;
  title?: string;
  price_monthly?: number;
};

type ProfileRow = {
  id: string;
  full_name?: string;
  commission_rate_pct?: number;
};

type LegacyBookingRow = {
  id: string;
  listing_id?: string;
  tenant_id?: string;
  landlord_id?: string;
  move_in_date?: string;
  months_duration?: number;
  status?: string;
  reference?: string;
  created_at?: string;
};



type LegacyPaymentRow = {
  id: string;
  booking_id?: string;
  amount?: number;
  due_date?: string;
  status?: string;
  paid_at?: string;
  created_at?: string;
};



type TenantSummary = {
  id?: string;
  full_name?: string;
};

type NormalizedBooking = {
  id: string;
  listing_id: string;
  tenant_lookup_id?: string;
  move_in_date?: string;
  months_duration?: number;
  status?: string;
  reference?: string;
  created_at?: string;
  schema: 'legacy' | 'modern';
  tenant?: TenantSummary | null;
};

type PaymentRecord = {
  id: string;
  booking_id?: string;
  amount: number;
  due_date?: string;
  status?: string;
  paid_at?: string;
  created_at?: string;
  payment_type?: string;
  payment_method?: string;
  source: 'payment_records' | 'payments';
  listing?: ListingRow | null;
  tenant?: TenantSummary | null;
  booking?: NormalizedBooking | null;
};

function formatDate(value?: string) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function formatMoney(value?: number) {
  return `TZS ${new Intl.NumberFormat('sw-TZ').format(Number(value || 0))}`;
}

function uniqueIds(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function inFilterValue(ids: string[]) {
  return `(${ids.join(',')})`;
}



function isPaidStatus(status?: string) {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'paid' || normalized === 'completed';
}

function isOutstandingStatus(status?: string) {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'pending' || normalized === 'late' || normalized === 'overdue' || normalized === 'processing';
}

function displayStatus(status?: string) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'completed') return 'Paid';
  if (normalized === 'paid') return 'Paid';
  if (normalized === 'processing') return 'Processing';
  if (normalized === 'refunded') return 'Refunded';
  if (normalized === 'failed') return 'Failed';
  if (!normalized) return '—';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function PaymentsPage() {
  const { user, token } = useAuth();
  const [records, setRecords] = useState<PaymentRecord[]>([]);
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
      const isAdmin = user.role === APP_ROLE.ADMIN;

      // Get commission rate from profile
      const profileRows = await selectRows('profiles', {
        select: 'commission_rate_pct',
        filters: [{ column: 'id', op: 'eq', value: user.userId }],
        limit: 1,
        accessToken: token,
      }).catch(() => []);
      const rate = Number(profileRows?.[0]?.commission_rate_pct || 0);
      setCommissionPct(isAdmin ? 0 : rate);

      // ── Resolve Real Landlord ID ──
      let realLandlordId = user.userId;
      if (!isAdmin) {
        const landlordRows = await selectRows('landlords', {
          select: 'id',
          filters: [{ column: 'profile_id', op: 'eq', value: user.userId }],
          limit: 1,
          accessToken: token
        });
        realLandlordId = landlordRows?.[0]?.id || user.userId;
      }

      // ── Fetch bookings using actual schema columns ──
      const bookingRows = await selectRows('bookings', {
        select: 'id,listing_id,tenant_id,landlord_id,move_in_date,months_duration,status,reference,created_at',
        filters: isAdmin ? [] : [{ column: 'landlord_id', op: 'eq', value: realLandlordId }],
        order: 'created_at.desc',
        limit: 500,
        accessToken: token,
      });

      const bookings: NormalizedBooking[] = (bookingRows as LegacyBookingRow[]).map((row) => ({
        id: row.id,
        listing_id: row.listing_id || '',
        tenant_lookup_id: row.tenant_id,
        move_in_date: row.move_in_date,
        months_duration: row.months_duration,
        status: row.status,
        reference: row.reference,
        created_at: row.created_at,
        schema: 'legacy' as const,
        tenant: null,
      })).filter((row) => row.listing_id);

      // ── Fetch payment_records for these bookings ──
      const bookingIds = uniqueIds(bookings.map((booking) => booking.id));
      const paymentRecordRows = bookingIds.length
        ? await selectRows('payment_records', {
            select: 'id,booking_id,amount,due_date,status,paid_at,created_at',
            filters: [{ column: 'booking_id', op: 'in', value: inFilterValue(bookingIds) }],
            order: 'due_date.asc',
            accessToken: token,
          }).catch((err) => {
            console.warn('PaymentsPage: payment_records query failed.', err);
            return [];
          })
        : [];

      // ── Fetch listing details ──
      const listingIds = uniqueIds(bookings.map((booking) => booking.listing_id));
      const listingRows = listingIds.length
        ? await selectRows('listings', {
            select: 'id,title,price_monthly',
            filters: [{ column: 'id', op: 'in', value: inFilterValue(listingIds) }],
            accessToken: token,
          }).catch(() => [])
        : [];
      const listingMap = new Map((listingRows as ListingRow[]).map((row) => [row.id, row]));

      // ── Fetch tenant profiles ──
      const tenantIds = uniqueIds(bookings.map((booking) => booking.tenant_lookup_id));
      const tenantProfiles = tenantIds.length
        ? await selectRows('profiles', {
            select: 'id,full_name',
            filters: [{ column: 'id', op: 'in', value: inFilterValue(tenantIds) }],
            accessToken: token,
          }).catch(() => [])
        : [];
      const tenantProfileMap = new Map((tenantProfiles as ProfileRow[]).map((row) => [row.id, row]));

      const bookingMap = new Map(bookings.map((booking) => [booking.id, booking]));

      const resolveTenant = (booking?: NormalizedBooking | null) => {
        if (!booking) return null;
        return booking.tenant_lookup_id ? tenantProfileMap.get(booking.tenant_lookup_id) || null : null;
      };

      // ── Build payment records list ──
      const chosenPayments = (paymentRecordRows as LegacyPaymentRow[]).map((row) => ({
        id: row.id,
        booking_id: row.booking_id,
        amount: Number(row.amount || 0),
        due_date: row.due_date,
        status: row.status,
        paid_at: row.paid_at,
        created_at: row.created_at,
        source: 'payment_records' as const,
      }));

      // If no payment_records exist, generate synthetic records from bookings
      const allPayments: typeof chosenPayments = chosenPayments.length > 0
        ? chosenPayments
        : bookings
            .filter((b) => b.status === 'approved' || b.status === 'completed')
            .map((b) => {
              const listing = listingMap.get(b.listing_id);
              return {
                id: `synth-${b.id}`,
                booking_id: b.id,
                amount: Number(listing?.price_monthly || 0) * (b.months_duration || 1),
                due_date: b.move_in_date,
                status: b.status === 'completed' ? 'paid' : 'pending',
                paid_at: b.status === 'completed' ? b.created_at : undefined,
                created_at: b.created_at,
                source: 'payment_records' as const,
              };
            });

      const enrichedRecords: PaymentRecord[] = allPayments.map((payment) => {
        const booking = payment.booking_id ? bookingMap.get(payment.booking_id) || null : null;
        const tenant = resolveTenant(booking);
        return {
          ...payment,
          listing: booking ? listingMap.get(booking.listing_id) || null : null,
          tenant,
          booking,
        };
      });

      const activeStatuses = new Set(['approved', 'completed', 'confirmed']);
      const enrichedBookings = bookings
        .filter((booking) => activeStatuses.has(String(booking.status || '').toLowerCase()))
        .map((booking) => {
          const listing = listingMap.get(booking.listing_id) || null;
          const tenant = resolveTenant(booking);
          const commission = listing ? (Number(listing.price_monthly || 0) * rate) / 100 : 0;
          return { ...booking, listing, tenant, commission };
        });

      setRecords(enrichedRecords);
      setApprovedBookings(enrichedBookings);
    } catch (err: any) {
      console.error('PaymentsPage: failed to load payments.', err);
      setError('We could not load payments right now. Please refresh and try again.');
      setRecords([]);
      setApprovedBookings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, [user?.userId, token, user?.role]);

  const markReceived = async (record: PaymentRecord) => {
    if (record.source !== 'payment_records') return;

    setMarkingId(record.id);
    setError('');

    try {
      await updateRows(
        'payment_records',
        { status: 'paid', paid_at: new Date().toISOString() },
        { filters: [{ column: 'id', op: 'eq', value: record.id }], accessToken: token }
      );

      setRecords((prev) =>
        prev.map((row) =>
          row.id === record.id ? { ...row, status: 'paid', paid_at: new Date().toISOString() } : row
        )
      );
    } catch (err) {
      console.error('PaymentsPage: failed to mark payment record as received.', err);
      setError('We could not update that payment record. Please try again.');
    } finally {
      setMarkingId(null);
    }
  };

  const totalOutstanding = records
    .filter((record) => isOutstandingStatus(record.status))
    .reduce((sum, record) => sum + Number(record.amount || 0), 0);

  const totalReceived = records
    .filter((record) => isPaidStatus(record.status))
    .reduce((sum, record) => sum + Number(record.amount || 0), 0);

  const monthlyCommissions = approvedBookings.reduce((sum, booking) => sum + Number(booking.commission || 0), 0);

  const initials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const backHref = user?.role === APP_ROLE.ADMIN ? '/admin' : '/landlord';

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
            to={backHref}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '0.5px solid var(--border)',
              background: '#fff',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ink)',
              textDecoration: 'none',
            }}
          >
            ← Back to dashboard
          </Link>
        </div>

        {error ? <p className="error-text" style={{ marginTop: '-0.5rem' }}>{error}</p> : null}

        <div className="kpi-strip">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`kpi-skel-${index}`}
                style={{
                  height: 80,
                  borderRadius: 14,
                  background: 'var(--cream)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            ))
          ) : (
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
              No payment records yet. They will appear here once bookings and payments are created.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="pay-table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Property</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const rawStatus = String(record.status || '');
                    const normalizedStatus = rawStatus.toLowerCase();
                    const isOverdue = record.source === 'payment_records'
                      && normalizedStatus !== 'paid'
                      && Boolean(record.due_date)
                      && new Date(record.due_date as string) < new Date();

                    let pillBg = '#fff8ec';
                    let pillColor = '#c47900';

                    if (isPaidStatus(record.status)) {
                      pillBg = '#f0faf4';
                      pillColor = '#1a7f37';
                    } else if (normalizedStatus === 'failed' || normalizedStatus === 'refunded' || normalizedStatus === 'late' || normalizedStatus === 'overdue' || isOverdue) {
                      pillBg = '#fef2f2';
                      pillColor = '#cf222e';
                    }

                    return (
                      <tr key={record.id}>
                        <td>
                          <div className="tenant-cell">
                            <div className="avatar">{initials(record.tenant?.full_name)}</div>
                            <span>{record.tenant?.full_name || 'Tenant'}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 500 }}>{record.listing?.title || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{formatMoney(record.amount)}</td>
                        <td style={{ color: isOverdue ? '#cf222e' : 'var(--ink)', fontWeight: isOverdue ? 500 : 400 }}>
                          {formatDate(record.due_date || record.created_at)}
                        </td>
                        <td>
                          <span className="status-pill" style={{ background: pillBg, color: pillColor }}>
                            <span className="status-dot" style={{ background: pillColor }} />
                            {displayStatus(record.status)}
                          </span>
                        </td>
                        <td>
                          {record.source === 'payment_records' && !isPaidStatus(record.status) ? (
                            <button
                              className="mark-btn"
                              disabled={markingId === record.id}
                              onClick={() => markReceived(record)}
                            >
                              {markingId === record.id ? 'Saving…' : '✓ Mark received'}
                            </button>
                          ) : isPaidStatus(record.status) ? (
                            <span style={{ fontSize: 11, color: 'var(--mid)' }}>
                              Received {formatDate(record.paid_at)}
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--mid)' }}>
                              {[record.payment_type, record.payment_method].filter(Boolean).join(' · ') || 'Awaiting payment'}
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
              No approved bookings yet. Commissions will appear here once a tenant is confirmed.
            </div>
          ) : (
            <>
              {approvedBookings.map((booking: any) => (
                <div key={booking.id} className="comm-row">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{booking.tenant?.full_name || 'Tenant'}</span>
                    <span style={{ fontSize: 11, color: 'var(--mid)' }}>{booking.listing?.title || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--jade)' }}>
                      {formatMoney(booking.commission)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--mid)' }}>
                      of TZS {new Intl.NumberFormat('sw-TZ').format(Number(booking.listing?.price_monthly || 0))}/mo
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
                  alignItems: 'center',
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
