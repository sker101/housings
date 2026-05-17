import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ChevronRight, Users, Wallet, Clock, Home, Calendar, MessageSquare, Phone, ArrowLeft, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { selectRows } from '../lib/supabase';

type ListingRow = {
  id: string;
  title?: string;
  room_type?: string;
  price_monthly?: number;
};

type ProfileRow = {
  id: string;
  full_name?: string;
  phone?: string;
};

type LegacyBookingRow = {
  id: string;
  tenant_id?: string;
  listing_id?: string;
  move_in_date?: string;
  months_duration?: number;
  contact_preference?: string;
  message?: string;
};

type ModernBookingRow = {
  id: string;
  tenant_id?: string;
  listing_id?: string;
  move_in_date?: string;
  months_duration?: number;
  notes?: string;
  tenant?: {
    profile?: {
      id?: string;
      full_name?: string;
      phone?: string;
    } | Array<{
      id?: string;
      full_name?: string;
      phone?: string;
    }>;
  } | Array<{
    profile?: {
      id?: string;
      full_name?: string;
      phone?: string;
    } | Array<{
      id?: string;
      full_name?: string;
      phone?: string;
    }>;
  }>;
};

type TenantRow = {
  id: string;
  tenant_id: string;
  listing_id: string;
  move_in_date?: string;
  months_duration?: number;
  contact_preference?: string | null;
  message?: string | null;
  profile?: ProfileRow | null;
  listing?: ListingRow | null;
};

function uniqueIds(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function inFilterValue(ids: string[]) {
  return `(${ids.join(',')})`;
}

function extractTenantProfile(tenant: ModernBookingRow['tenant']): ProfileRow | null {
  const tenantRow = Array.isArray(tenant) ? tenant[0] : tenant;
  const profile = Array.isArray(tenantRow?.profile) ? tenantRow?.profile[0] : tenantRow?.profile;
  if (!profile) return null;
  return {
    id: profile.id || '',
    full_name: profile.full_name,
    phone: profile.phone,
  };
}

function formatMoveInDate(value?: string) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-TZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

export default function LandlordTenantsPage() {
  const navigate = useNavigate();
  const [isDashboardActive, setIsDashboardActive] = useState(false);
  const { user, token } = useAuth();

  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!user?.userId || !token) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        // 1. Fetch George's listings directly
        const listingRows = await selectRows('listings', {
          select: 'id,title,room_type,price_monthly',
          filters: [{ column: 'lister_id', op: 'eq', value: user.userId }],
          accessToken: token,
        });
        const listingMap = new Map((listingRows as ListingRow[]).map((row) => [row.id, row]));
        const listingIds = (listingRows as ListingRow[]).map(l => l.id);

        if (listingIds.length === 0) {
          if (mounted) {
            setTenants([]);
            setLoading(false);
          }
          return;
        }

        // 2. Fetch bookings for these listings
        const bookingRows = await selectRows('bookings', {
          select: 'id,listing_id,tenant_id,move_in_date,months_duration,status,notes,contact_preference,message',
          filters: [
            { column: 'listing_id', op: 'in', value: inFilterValue(listingIds) },
            { column: 'status', op: 'in', value: '(paid,completed,confirmed,approved)' },
          ],
          order: 'move_in_date.desc',
          limit: 500,
          accessToken: token,
        });

        // 3. Fetch tenant profiles
        const tenantIds = uniqueIds((bookingRows as any[]).map((row) => row.tenant_id));
        const profileRows = tenantIds.length
          ? await selectRows('profiles', {
              select: 'id,full_name,phone',
              filters: [{ column: 'id', op: 'in', value: inFilterValue(tenantIds) }],
              accessToken: token,
            }).catch(() => [])
          : [];
        const profileMap = new Map((profileRows as ProfileRow[]).map((row) => [row.id, row]));

        // 4. Map everything together
        const normalizedTenants = (bookingRows as any[]).map((row) => ({
          id: row.id,
          tenant_id: row.tenant_id,
          listing_id: row.listing_id,
          move_in_date: row.move_in_date,
          months_duration: row.months_duration,
          contact_preference: row.contact_preference || null,
          message: row.notes || row.message || null,
          profile: row.tenant_id ? profileMap.get(row.tenant_id) || null : null,
          listing: row.listing_id ? listingMap.get(row.listing_id) || null : null,
        }));

        if (!mounted) return;
        setTenants(normalizedTenants);
      } catch (err) {
        console.error('LandlordTenantsPage: failed to load tenants.', err);
        if (mounted) {
          setError('We could not load tenants right now. Please refresh and try again.');
          setTenants([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [user?.userId, token]);

  const totalMonthlyRent = tenants.reduce(
    (sum, tenant) => sum + Number(tenant.listing?.price_monthly || 0),
    0
  );

  const durationValues = tenants
    .map((tenant) => Number(tenant.months_duration))
    .filter((value) => Number.isFinite(value) && value > 0);

  const avgDuration = durationValues.length > 0
    ? (durationValues.reduce((sum, value) => sum + value, 0) / durationValues.length).toFixed(1)
    : '—';

  const initials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .tn-page{padding:1.5rem;max-width:100%;animation:fadeUp 0.35s ease}
        .tn-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;gap:1rem;flex-wrap:wrap}
        .kpi-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem;width:100%;box-sizing:border-box}
        .kpi-card{background:linear-gradient(135deg,#ffffff 0%,#f8fafc 100%);border:1px solid #e2e8f0;border-radius:16px;padding:1.25rem;display:flex;align-items:center;gap:1rem;transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.04);min-width:0;overflow:hidden}
        .kpi-card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.08)}
        .kpi-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .kpi-content{flex:1;min-width:0}
        .kpi-lbl{font-size:0.7rem;color:#64748b;margin-bottom:0.25rem;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;white-space:nowrap}
        .kpi-val{font-size:1.25rem;font-weight:700;line-height:1;white-space:nowrap}
        .kpi-sub{font-size:0.7rem;margin-top:0.25rem;color:#94a3b8;white-space:nowrap}
        .tn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem;width:100%}
        .tn-card{background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:1.25rem;display:flex;flex-direction:column;gap:1rem;transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
        .tn-card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.08)}
        .tn-card-top{display:flex;align-items:center;gap:0.75rem;padding-bottom:1rem;border-bottom:1px solid #e2e8f0}
        .tn-av{width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#16a34a,#166534);color:white;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .tn-name{font-size:1rem;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .tn-listing{font-size:0.8rem;color:#64748b;margin-top:0.25rem;display:flex;align-items:center;gap:0.3rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .tn-rows{display:flex;flex-direction:column;gap:0.75rem}
        .tn-row{display:flex;align-items:center;gap:0.75rem;font-size:0.85rem;color:#334155}
        .tn-row-lbl{font-size:0.75rem;color:#64748b;min-width:80px;flex-shrink:0;display:flex;align-items:center;gap:0.3rem}
        .tn-actions{display:flex;gap:0.75rem;margin-top:auto;padding-top:0.5rem}
        .tn-btn{flex:1;padding:0.6rem;border-radius:10px;border:1px solid #e2e8f0;background:#ffffff;font-size:0.8rem;font-weight:600;cursor:pointer;text-align:center;color:#334155;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:0.4rem;transition:all 0.2s}
        .tn-btn:hover{background:#f8fafc;border-color:#cbd5e1}
        .tn-btn-msg{background:#16a34a;color:#ffffff;border-color:#16a34a}
        .tn-btn-msg:hover{background:#15803d;border-color:#15803d}
        .tn-pill{display:inline-flex;align-items:center;padding:0.25rem 0.75rem;border-radius:20px;font-size:0.75rem;font-weight:600}
        .tn-empty{background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:3rem 2rem;text-align:center;color:#64748b;font-size:0.9rem;display:flex;flex-direction:column;align-items:center;gap:1rem}
        .empty-icon{width:64px;height:64px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#94a3b8}
        @media (max-width:1024px){
          .kpi-strip{grid-template-columns:repeat(3,1fr)}
          .kpi-card{padding:0.875rem}
          .kpi-icon{width:44px;height:44px}
        }
        @media (max-width:768px){
          .tn-page{padding:1rem}
          .tn-header{flex-direction:column}
          .kpi-strip{grid-template-columns:repeat(3,1fr);gap:0.75rem}
          .kpi-card{padding:0.75rem}
          .kpi-icon{width:40px;height:40px}
          .kpi-val{font-size:1.1rem}
          .tn-grid{grid-template-columns:1fr}
          .tn-name{font-size:0.95rem}
          .tn-card{padding:1rem}
        }
        @media (max-width:480px){
          .kpi-strip{grid-template-columns:1fr}
          .kpi-card{padding:1rem}
          .tn-row{font-size:0.8rem}
        }
      `}</style>

      {/* Breadcrumb Header */}
      <header style={{background:'white',borderRadius:'12px',padding:'1rem 1.25rem',margin:'1rem 1rem 0',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <nav style={{display:'flex',alignItems:'center',gap:'0.5rem',fontSize:'0.9rem'}}>
          <Link 
            to="/landlord/dashboard" 
            className={`topbar-action-btn ${isDashboardActive ? 'is-active' : ''}`}
            onClick={() => setIsDashboardActive(true)}
            style={{display:'flex',alignItems:'center',gap:'0.35rem',color:'#64748b',textDecoration:'none',padding:'4px 8px',background:'transparent',border:'none',borderRadius:'8px'}}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
          <ChevronRight size={16} style={{color:'#cbd5e1'}} />
          <span style={{color:'#1e293b',fontWeight:600}}>Tenants</span>
        </nav>
      </header>

      <div className="tn-page">
        <div className="tn-header">
          <div>
            <h1 style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', fontWeight: 700, margin: 0, color: '#1e293b', whiteSpace: 'nowrap' }}>
              My Tenants <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 400 }}>({tenants.length})</span>
            </h1>
            <p style={{ marginTop: 4, fontSize: '0.85rem', color: '#64748b' }}>
              Manage and contact your approved tenants
            </p>
          </div>
          <Link
            to="/landlord/dashboard"
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

        {error && <p className="error-text" style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>}

        <div className="kpi-strip">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
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
                  <Users size={24} />
                </div>
                <div className="kpi-content">
                  <div className="kpi-lbl">Active Tenants</div>
                  <div className="kpi-val" style={{ color: '#16a34a' }}>{tenants.length}</div>
                  <div className="kpi-sub">Approved bookings</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <Wallet size={24} />
                </div>
                <div className="kpi-content">
                  <div className="kpi-lbl">Monthly Rent Income</div>
                  <div className="kpi-val" style={{ color: '#2563eb' }}>
                    TZS {new Intl.NumberFormat('sw-TZ').format(totalMonthlyRent)}
                  </div>
                  <div className="kpi-sub">From all tenants</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                  <Clock size={24} />
                </div>
                <div className="kpi-content">
                  <div className="kpi-lbl">Avg Stay Duration</div>
                  <div className="kpi-val" style={{ color: '#d97706' }}>{avgDuration} mo</div>
                  <div className="kpi-sub">Across all bookings</div>
                </div>
              </div>
            </>
          )}
        </div>

        {loading ? (
          <div className="tn-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`tn-skel-${index}`}
                style={{
                  height: 220,
                  borderRadius: 16,
                  background: 'var(--cream)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <div className="tn-empty">
            <div className="empty-icon">
              <Users size={32} />
            </div>
            <p>No approved tenants yet — approve a booking request to see tenants here</p>
          </div>
        ) : (
          <div className="tn-grid">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="tn-card">
                <div className="tn-card-top">
                  <div className="tn-av">
                    <User size={24} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="tn-name" style={{ margin: 0 }}>
                      {tenant.profile?.full_name || 'Unknown Tenant'}
                    </p>
                    <p className="tn-listing" style={{ margin: 0 }}>
                      <Home size={12} />
                      {tenant.listing?.title || '—'}
                    </p>
                  </div>
                </div>

                <div className="tn-rows">
                  <div className="tn-row">
                    <span className="tn-row-lbl">
                      <Calendar size={14} />
                      Move-in
                    </span>
                    <span>{formatMoveInDate(tenant.move_in_date)}</span>
                  </div>
                  <div className="tn-row">
                    <span className="tn-row-lbl">
                      <Clock size={14} />
                      Duration
                    </span>
                    <span>
                      {tenant.months_duration
                        ? `${tenant.months_duration} mo`
                        : '—'}
                    </span>
                  </div>
                  <div className="tn-row">
                    <span className="tn-row-lbl">
                      <Wallet size={14} />
                      Rent
                    </span>
                    <span style={{ fontWeight: 700, color: '#16a34a' }}>
                      TZS {new Intl.NumberFormat('sw-TZ').format(tenant.listing?.price_monthly || 0)}/mo
                    </span>
                  </div>
                  <div className="tn-row">
                    <span className="tn-row-lbl">
                      <MessageSquare size={14} />
                      Contact
                    </span>
                    <span
                      className="tn-pill"
                      style={
                        tenant.contact_preference === 'whatsapp'
                          ? { background: '#EAF3DE', color: '#166534' }
                          : tenant.contact_preference === 'phone'
                            ? { background: '#E6F1FB', color: '#2563eb' }
                            : { background: '#F1F5F9', color: '#64748b' }
                      }
                    >
                      {tenant.contact_preference
                        ? tenant.contact_preference.charAt(0).toUpperCase() + tenant.contact_preference.slice(1)
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="tn-actions">
                  <button 
                    className="tn-btn tn-btn-msg"
                    onClick={async () => {
                      if (!user?.userId || !tenant.tenant_id || !tenant.listing_id || !token) {
                        alert('Unable to start chat. Missing tenant data.');
                        return;
                      }
                      try {
                        const { rpc } = await import('../lib/supabase');
                        const result = await rpc('start_conversation', {
                          p_listing_id: tenant.listing_id,
                          p_tenant_id: tenant.tenant_id,
                          p_landlord_id: user.userId
                        }, token);

                        const conversationId = result?.conversation_id;

                        if (conversationId) {
                          navigate(`/messages/${conversationId}`);
                        } else {
                          alert('Unable to create conversation.');
                        }
                      } catch (err: any) {
                        console.error('Error starting conversation:', err);
                        alert('An error occurred while starting the chat: ' + (err.message || String(err)));
                      }
                    }}
                  >
                    <MessageSquare size={16} />
                    Message
                  </button>
                  {tenant.profile?.phone ? (
                    <a href={`tel:${tenant.profile.phone}`} className="tn-btn">
                      <Phone size={16} />
                      Call
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
