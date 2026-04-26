import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} .tn-page{padding:2rem} .kpi-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:1.5rem} .kpi{background:var(--cream,#f8faf9);border-radius:12px;padding:14px 16px} .kpi-lbl{font-size:11px;color:var(--mid);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em} .kpi-val{font-size:22px;font-weight:700;line-height:1;color:var(--ink)} .kpi-sub{font-size:11px;margin-top:4px;color:var(--mid)} .tn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px} .tn-card{background:#ffffff;border:0.5px solid var(--border);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:12px} .tn-card-top{display:flex;align-items:center;gap:10px;padding-bottom:12px;border-bottom:0.5px solid var(--border)} .tn-av{width:40px;height:40px;border-radius:50%;background:#EEEDFE;color:#3C3489;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0} .tn-name{font-size:13px;font-weight:600;color:var(--ink)} .tn-listing{font-size:11px;color:var(--mid);margin-top:2px} .tn-rows{display:flex;flex-direction:column;gap:8px} .tn-row{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink)} .tn-row-lbl{font-size:11px;color:var(--mid);min-width:64px;flex-shrink:0} .tn-actions{display:flex;gap:8px;margin-top:auto;padding-top:4px} .tn-btn{flex:1;padding:7px;border-radius:8px;border:0.5px solid var(--border);background:#ffffff;font-size:11px;font-weight:600;cursor:pointer;text-align:center;color:var(--ink);text-decoration:none;display:flex;align-items:center;justify-content:center} .tn-btn-msg{background:var(--jade);color:#ffffff;border-color:transparent} .tn-pill{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600} .tn-empty{background:#ffffff;border:0.5px solid var(--border);border-radius:16px;padding:3rem 2rem;text-align:center;color:var(--mid);font-size:13px} @media(max-width:768px){.kpi-strip{grid-template-columns:1fr 1fr}.tn-page{padding:1rem}}`}</style>

      <div className="tn-page">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
              My tenants <span style={{ fontSize: 14, color: 'var(--mid)', fontWeight: 400 }}>({tenants.length})</span>
            </h1>
            <p style={{ fontSize: 12, color: 'var(--mid)', marginTop: 4 }}>
              Manage and contact your approved tenants
            </p>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="kpi-strip">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`kpi-skel-${index}`}
                style={{
                  height: 72,
                  borderRadius: 12,
                  background: 'var(--cream)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            ))
          ) : (
            <>
              <div className="kpi">
                <div className="kpi-lbl">Active tenants</div>
                <div className="kpi-val" style={{ color: '#27500A' }}>{tenants.length}</div>
                <div className="kpi-sub">Approved bookings</div>
              </div>
              <div className="kpi">
                <div className="kpi-lbl">Monthly rent income</div>
                <div className="kpi-val" style={{ color: '#0C447C' }}>
                  TZS {new Intl.NumberFormat('sw-TZ').format(totalMonthlyRent)}
                </div>
                <div className="kpi-sub">From all tenants</div>
              </div>
              <div className="kpi">
                <div className="kpi-lbl">Avg. stay duration</div>
                <div className="kpi-val">{avgDuration} mo</div>
                <div className="kpi-sub">Across all bookings</div>
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
            No approved tenants yet — approve a booking request to see tenants here
          </div>
        ) : (
          <div className="tn-grid">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="tn-card">
                <div className="tn-card-top">
                  <div className="tn-av">{initials(tenant.profile?.full_name || '?')}</div>
                  <div style={{ minWidth: 0 }}>
                    <p className="tn-name" style={{ margin: 0 }}>
                      {tenant.profile?.full_name || 'Unknown'}
                    </p>
                    <p className="tn-listing" style={{ margin: 0 }}>
                      {(tenant.listing?.room_type || tenant.listing?.title || '—') + ' · ' + (tenant.listing?.title || 'listing')}
                    </p>
                  </div>
                </div>

                <div className="tn-rows">
                  <div className="tn-row">
                    <span className="tn-row-lbl">Move-in</span>
                    <span>{formatMoveInDate(tenant.move_in_date)}</span>
                  </div>
                  <div className="tn-row">
                    <span className="tn-row-lbl">Duration</span>
                    <span>
                      {tenant.months_duration
                        ? `${tenant.months_duration} month${tenant.months_duration !== 1 ? 's' : ''}`
                        : '—'}
                    </span>
                  </div>
                  <div className="tn-row">
                    <span className="tn-row-lbl">Rent</span>
                    <span style={{ fontWeight: 600, color: '#27500A' }}>
                      TZS {new Intl.NumberFormat('sw-TZ').format(tenant.listing?.price_monthly || 0)}/mo
                    </span>
                  </div>
                  <div className="tn-row">
                    <span className="tn-row-lbl">Contact</span>
                    <span
                      className="tn-pill"
                      style={
                        tenant.contact_preference === 'whatsapp'
                          ? { background: '#EAF3DE', color: '#27500A' }
                          : tenant.contact_preference === 'phone'
                            ? { background: '#E6F1FB', color: '#0C447C' }
                            : { background: '#F1EFE8', color: '#444441' }
                      }
                    >
                      {tenant.contact_preference
                        ? tenant.contact_preference.charAt(0).toUpperCase() + tenant.contact_preference.slice(1)
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="tn-actions">
                  <Link to="/messages" className="tn-btn tn-btn-msg">
                    Message
                  </Link>
                  {tenant.profile?.phone ? (
                    <a href={`tel:${tenant.profile.phone}`} className="tn-btn">
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
