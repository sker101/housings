import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ChevronRight, Wallet, TrendingUp, AlertCircle, Percent, Calendar, User, Home, CheckCircle2, Clock, ArrowLeft, CreditCard, BadgeCheck } from 'lucide-react';
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
  payment_status?: string;
  amount?: number;
  total_tzs?: number;
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
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [commissionPct, setCommissionPct] = useState(0);
  const [approvedBookings, setApprovedBookings] = useState<any[]>([]);
  const [isDashboardActive, setIsDashboardActive] = useState(false);

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

      // 1. Fetch George's listings directly (same as Properties page)
      const listingRows = await selectRows('listings', {
        select: 'id,title,price_monthly',
        filters: isAdmin ? [] : [{ column: 'lister_id', op: 'eq', value: user.userId }],
        accessToken: token,
      });
      const listingMap = new Map((listingRows as ListingRow[]).map((row) => [row.id, row]));
      const listingIds = (listingRows as ListingRow[]).map(l => l.id);

      // 2. Fetch bookings associated with these listings
      let bookings: NormalizedBooking[] = [];
      if (listingIds.length > 0) {
        const bookingRows = await selectRows('bookings', {
          select: 'id,listing_id,tenant_id,status,total_tzs,created_at,move_in_date,months_duration',
          filters: isAdmin ? [] : [{ column: 'listing_id', op: 'in', value: inFilterValue(listingIds) }],
          order: 'created_at.desc',
          limit: 500,
          accessToken: token,
        });

        bookings = (bookingRows as any[]).map((row) => ({
          id: row.id,
          listing_id: row.listing_id || '',
          tenant_lookup_id: row.tenant_id,
          move_in_date: row.move_in_date,
          months_duration: row.months_duration,
          status: row.status,
          total_tzs: row.total_tzs,
          created_at: row.created_at,
          schema: 'modern' as const,
          tenant: null,
        }));
      }

      // 3. Resolve tenant profiles
      const tenantIds = uniqueIds(bookings.map((booking) => booking.tenant_lookup_id));
      const tenantProfiles = tenantIds.length
        ? await selectRows('profiles', {
            select: 'id,full_name',
            filters: [{ column: 'id', op: 'in', value: inFilterValue(tenantIds) }],
            accessToken: token,
          }).catch(() => [])
        : [];
      const tenantProfileMap = new Map((tenantProfiles as ProfileRow[]).map((row) => [row.id, row]));

      // 4. Build synthetic payment records from bookings
      const enrichedRecords: PaymentRecord[] = bookings.map((b) => {
        const tenantProfile = b.tenant_lookup_id ? tenantProfileMap.get(b.tenant_lookup_id) : null;
        const listing = listingMap.get(b.listing_id);
        
        return {
          id: b.id,
          booking_id: b.id,
          amount: Number(b.total_tzs || 0),
          due_date: b.move_in_date,
          status: b.status === 'paid' || b.status === 'completed' ? 'paid' : 'pending',
          paid_at: b.status === 'paid' || b.status === 'completed' ? b.created_at : undefined,
          created_at: b.created_at,
          source: 'payments' as const,
          listing: listing || null,
          tenant: tenantProfile ? { id: tenantProfile.id, full_name: tenantProfile.full_name } : null,
          booking: b
        };
      });

      const activeStatuses = new Set(['approved', 'completed', 'paid', 'confirmed']);
      const enrichedBookings = bookings
        .filter((booking) => activeStatuses.has(String(booking.status || '').toLowerCase()))
        .map((booking) => {
          const listing = listingMap.get(booking.listing_id) || null;
          const tenant = tenantProfileMap.get(booking.tenant_lookup_id || '') || null;
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
      <header style={{background:'white',borderRadius:'12px',padding:'1rem 1.25rem',margin:'1rem 1rem 0',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',display:'flex',alignItems:'center'}}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid #e2e8f0',
            background: 'white',
            cursor: 'pointer',
            color: '#64748b',
            marginRight: '0.75rem',
            transition: 'all 0.2s',
            padding: 0
          }}
          title="Go Back"
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#16a34a';
            e.currentTarget.style.color = '#16a34a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <nav style={{display:'flex',alignItems:'center',gap:'0.5rem',fontSize:'0.9rem'}}>
          <Link 
            to={backHref}
            className="topbar-action-btn"
            style={{display:'flex',alignItems:'center',gap:'0.35rem',color:'#64748b',textDecoration:'none',padding:'4px 8px',background:'transparent',border:'none',borderRadius:'8px'}}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
          <ChevronRight size={16} style={{color:'#cbd5e1'}} />
          <span style={{color:'#1e293b',fontWeight:600}}>Payments</span>
        </nav>
      </header>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} 
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} 
        .pay-page{padding:1.5rem;max-width:100%;animation:fadeUp 0.35s ease} 
        .pay-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;gap:1rem;flex-wrap:wrap} 
        .kpi-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;width:100%;box-sizing:border-box} 
        .kpi-card{background:linear-gradient(135deg,#ffffff 0%,#f8fafc 100%);border:1px solid #e2e8f0;border-radius:16px;padding:1rem;display:flex;align-items:center;gap:0.75rem;transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.04);min-width:0;overflow:hidden} 
        .kpi-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .kpi-content{flex:1;min-width:0}
        .kpi-label{font-size:0.7rem;color:#64748b;margin-bottom:0.25rem;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;white-space:nowrap} 
        .kpi-value{font-size:1.25rem;font-weight:700;line-height:1;white-space:nowrap} 
        .kpi-sub{font-size:0.7rem;margin-top:0.25rem;color:#94a3b8;white-space:nowrap} 
        .section-card{background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;margin-bottom:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,0.04)} 
        .section-card-header{padding:1.25rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap} 
        .section-title{font-size:1rem;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:0.5rem} 
        .section-sub{font-size:0.8rem;color:#64748b;margin-top:0.25rem;margin-left:1.75rem} 
        .pay-table{width:100%;border-collapse:collapse;font-size:0.85rem} 
        .pay-table th{padding:0.75rem 1rem;text-align:left;font-size:0.7rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid #e2e8f0;background:#f8fafc;white-space:nowrap} 
        .pay-table td{padding:1rem;border-bottom:1px solid #e2e8f0;color:#334155;vertical-align:middle} 
        .pay-table tr:last-child td{border-bottom:none} 
        .pay-table tr:hover td{background:#f8fafc} 
        .tenant-cell{display:flex;align-items:center;gap:0.75rem} 
        .avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#16a34a,#166534);color:white;display:flex;align-items:center;justify-content:center;flex-shrink:0} 
        .status-pill{display:inline-flex;align-items:center;gap:0.35rem;padding:0.35rem 0.75rem;border-radius:9999px;font-size:0.75rem;font-weight:600;white-space:nowrap} 
        .status-dot{width:6px;height:6px;border-radius:50%}
        .comm-row{padding:1rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:1rem;transition:all 0.2s}
        .comm-row:hover{background:#f8fafc}
        .empty-state{padding:2rem;text-align:center;color:#64748b;font-size:0.9rem}
        .mark-btn{padding:0.4rem 0.75rem;border-radius:8px;border:none;background:#16a34a;color:white;font-size:0.75rem;font-weight:600;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center;gap:0.35rem}
        .mark-btn:hover{background:#15803d}
        .mark-btn:disabled{opacity:0.6;cursor:not-allowed}
        @media (max-width:1024px){
          .kpi-strip{grid-template-columns:repeat(2,1fr)}
          .kpi-card{padding:0.875rem}
          .kpi-icon{width:44px;height:44px}
        }
        @media (max-width:768px){
          .pay-page{padding:1rem}
          .pay-header{flex-direction:column}
          .kpi-strip{grid-template-columns:repeat(2,1fr);gap:0.75rem}
          .kpi-card{padding:0.75rem}
          .kpi-icon{width:40px;height:40px}
          .kpi-value{font-size:1.1rem}
          .pay-table{font-size:0.8rem}
          .pay-table th,.pay-table td{padding:0.6rem}
          .pay-table th:nth-child(2),.pay-table td:nth-child(2){display:none}
          .section-card-header{flex-direction:column;align-items:flex-start}
        }
        @media (max-width:480px){
          .kpi-strip{grid-template-columns:1fr}
          .kpi-card{padding:1rem}
        }
      `}</style>

      <div className="pay-page">
        <div className="pay-header">
          <div>
            <h1 style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', fontWeight: 700, margin: 0, color: '#1e293b', whiteSpace: 'nowrap' }}>
              Payments &amp; Earnings
            </h1>
            <p style={{ marginTop: 4, fontSize: '0.85rem', color: '#64748b' }}>
              Track rent, commissions and your monthly earnings
            </p>
          </div>
          <Link
            to={backHref}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              background: '#fff',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: '#334155',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
            }}
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>

        {error ? <p className="error-text" style={{ marginTop: '-0.5rem' }}>{error}</p> : null}

        <div className="kpi-strip">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`kpi-skel-${index}`}
                style={{
                  height: 90,
                  borderRadius: 16,
                  background: '#f1f5f9',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            ))
          ) : (
            <>
              <div className="kpi-card">
                <div className="kpi-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                  <Wallet size={24} />
                </div>
                <div className="kpi-content">
                  <div className="kpi-label">Total Received</div>
                  <div className="kpi-value" style={{ color: '#16a34a' }}>{formatMoney(totalReceived)}</div>
                  <div className="kpi-sub">All time collected</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
                  <AlertCircle size={24} />
                </div>
                <div className="kpi-content">
                  <div className="kpi-label">Outstanding</div>
                  <div className="kpi-value" style={{ color: '#dc2626' }}>{formatMoney(totalOutstanding)}</div>
                  <div className="kpi-sub">Pending + overdue</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <Percent size={24} />
                </div>
                <div className="kpi-content">
                  <div className="kpi-label">Commission Rate</div>
                  <div className="kpi-value" style={{ color: '#2563eb' }}>{commissionPct}%</div>
                  <div className="kpi-sub">Your platform rate</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                  <TrendingUp size={24} />
                </div>
                <div className="kpi-content">
                  <div className="kpi-label">Monthly Commissions</div>
                  <div className="kpi-value" style={{ color: '#7c3aed' }}>{formatMoney(monthlyCommissions)}</div>
                  <div className="kpi-sub">From active tenants</div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="section-card">
          <div className="section-card-header">
            <div>
              <p className="section-title"><CreditCard size={18} style={{ color: '#2563eb' }} /> Rent Payment Records</p>
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
                            <div className="avatar">
                              <User size={18} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{record.tenant?.full_name || 'Unknown Tenant'}</span>
                              {!record.tenant?.full_name && record.tenant?.id && (
                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>ID: {record.tenant.id.slice(0,8)}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 500, fontSize: '0.9rem', color: '#334155' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Home size={14} style={{ color: '#64748b' }} />
                            {record.listing?.title || '—'}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{formatMoney(record.amount)}</td>
                        <td style={{ color: isOverdue ? '#dc2626' : '#334155', fontWeight: isOverdue ? 600 : 400, fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Calendar size={14} style={{ color: isOverdue ? '#dc2626' : '#64748b' }} />
                            {formatDate(record.due_date || record.created_at)}
                          </div>
                        </td>
                        <td>
                          <span className="status-pill" style={{ background: pillBg, color: pillColor }}>
                            {isPaidStatus(record.status) ? <CheckCircle2 size={12} /> : <Clock size={12} />}
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
                              <CheckCircle2 size={14} />
                              {markingId === record.id ? 'Saving…' : 'Mark Received'}
                            </button>
                          ) : isPaidStatus(record.status) ? (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle2 size={12} style={{ color: '#16a34a' }} />
                              {formatDate(record.paid_at)}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
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
              <p className="section-title"><BadgeCheck size={18} style={{ color: '#7c3aed' }} /> Commission Tracking</p>
              <p className="section-sub">Calculated from your active approved bookings</p>
            </div>
          </div>

          {approvedBookings.length === 0 ? (
            <div className="empty-state">
              <BadgeCheck size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
              <p>No approved bookings yet. Commissions will appear here once a tenant is confirmed.</p>
            </div>
          ) : (
            <>
              {approvedBookings.map((booking: any) => (
                <div key={booking.id} className="comm-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                      <User size={20} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>{booking.tenant?.full_name || `Unknown Tenant (${booking.tenant?.id?.slice(0,8) || '—'})`}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Home size={12} />
                        {booking.listing?.title || '—'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#7c3aed' }}>
                      {formatMoney(booking.commission)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      of {formatMoney(Number(booking.listing?.price_monthly || 0))}/mo
                    </span>
                  </div>
                </div>
              ))}
              <div
                style={{
                  borderTop: '1px solid #e2e8f0',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc',
                }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <TrendingUp size={16} style={{ color: '#7c3aed' }} />
                  Total monthly commissions
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#7c3aed' }}>
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
