import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

export default function LandlordDashboardPage() {
  const { user, token } = useAuth();
  const { t } = useTranslation();

  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingTenants, setBookingTenants] = useState<Record<string, any>>({});
  const [bookingListings, setBookingListings] = useState<Record<string, any>>({});
  const [actingBookingId, setActingBookingId] = useState<string | null>(null);
  const [conversationStats, setConversationStats] = useState({ total: 0, open: 0, unread: 0 });
  const [allApprovedBookings, setAllApprovedBookings] = useState<any[]>([]);
  const [topConvs, setTopConvs] = useState<any[]>([]);
  const [convTenantMap, setConvTenantMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isAlive = useRef(true);

  const loadData = useCallback(async () => {
    if (!user?.userId || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const landlordRows = await selectRows('landlords', {
        select: 'id',
        filters: [{ column: 'profile_id', op: 'eq', value: user.userId }],
        limit: 1,
        accessToken: token
      });
      const realLandlordId = landlordRows?.[0]?.id;

      const [profileRows, listingRows, conversationRows, bookingRows, approvedBookings] = await Promise.all([
        selectRows('profiles', {
          select:
            'id,full_name,verification_status,lister_type,subscription_plan,commission_rate_pct,payout_provider,payout_reference,phone_verified',
          filters: [{ column: 'id', op: 'eq', value: user.userId }],
          limit: 1,
          accessToken: token
        }),
        selectRows('listings', {
          select:
            'id,lister_id,title,room_type,price_monthly,region,district,ward,status,featured,view_count,created_at',
          filters: [{ column: 'lister_id', op: 'eq', value: user.userId }],
          order: 'created_at.desc',
          limit: 200,
          accessToken: token
        }),
        selectRows('room_inquiries', {
          select: 'id,tenant_id,status,created_at',
          filters: [{ column: 'tenant_id', op: 'neq', value: user.userId }], // Placeholder for landlord-side filtering
          order: 'created_at.desc',
          limit: 200,
          accessToken: token
        }),
        realLandlordId ? selectRows('bookings', {
          select:
            'id,listing_id,tenant_id,landlord_id,move_in_date,months_duration,message,contact_preference,status,created_at',
          filters: [
            { column: 'landlord_id', op: 'eq', value: realLandlordId },
            { column: 'status', op: 'in', value: '(pending,requested,approved,confirmed,completed)' }
          ],
          order: 'created_at.desc',
          limit: 50,
          accessToken: token
        }) : Promise.resolve([]),
        realLandlordId ? selectRows('bookings', {
          select: 'id,listing_id,created_at',
          filters: [
            { column: 'landlord_id', op: 'eq', value: realLandlordId },
            { column: 'status', op: 'in', value: '(approved,confirmed,completed)' }
          ],
          order: 'created_at.desc',
          limit: 200,
          accessToken: token
        }) : Promise.resolve([])
      ]);

      const conversationIds = conversationRows.map((row) => row.id).filter(Boolean);
      let unread = 0;

      if (conversationIds.length > 0) {
        const unreadRows = await selectRows('chat_messages', {
          select: 'id',
          filters: [
            { column: 'inquiry_id', op: 'in', value: `(${conversationIds.join(',')})` },
            { column: 'sender_id', op: 'neq', value: user.userId },
            { column: 'is_read', op: 'eq', value: 'false' }
          ],
          accessToken: token
        });
        unread = unreadRows.length;
      }

      if (!isAlive.current) return;

      setProfile(profileRows[0] || null);
      setListings(listingRows);
      setBookings(bookingRows);
      setAllApprovedBookings(approvedBookings);

      if (bookingRows.length > 0) {
        const tenantIds = Array.from(new Set(bookingRows.map((b) => b.tenant_id)));
        const bListingIds = Array.from(new Set(bookingRows.map((b) => b.listing_id)));
        const [tenants, bListings] = await Promise.all([
          tenantIds.length > 0
            ? selectRows('profiles', {
                select: 'id,full_name,phone',
                filters: [{ column: 'id', op: 'in', value: `(${tenantIds.join(',')})` }],
                accessToken: token
              })
            : Promise.resolve([]),
          bListingIds.length > 0
            ? selectRows('listings', {
                select: 'id,title,vacancy_status',
                filters: [{ column: 'id', op: 'in', value: `(${bListingIds.join(',')})` }],
                accessToken: token
              })
            : Promise.resolve([])
        ]);
        if (isAlive.current) {
          setBookingTenants(Object.fromEntries(tenants.map((t) => [t.id, t])));
          setBookingListings(Object.fromEntries(bListings.map((l) => [l.id, l])));
        }
      } else {
        setBookingTenants({});
        setBookingListings({});
      }

      const top = conversationRows.slice(0, 4);
      if (isAlive.current) setTopConvs(top);
      const tenantIds = Array.from(new Set(top.map((c) => c.tenant_id).filter(Boolean)));
      if (tenantIds.length > 0) {
        const tenantProfiles = await selectRows('profiles', {
          select: 'id,full_name',
          filters: [{ column: 'id', op: 'in', value: `(${tenantIds.join(',')})` }],
          accessToken: token
        });
        const map: Record<string, any> = {};
        tenantProfiles.forEach((p) => {
          map[p.id] = p;
        });
        if (isAlive.current) setConvTenantMap(map);
      } else {
        setConvTenantMap({});
      }

      if (isAlive.current) {
        setConversationStats({
          total: conversationRows.length,
          open: conversationRows.filter((row) => row.inquiry_status === 'open').length,
          unread
        });
      }
    } catch (err: any) {
      if (isAlive.current) {
        setError(err.message);
        setProfile(null);
        setListings([]);
        setConversationStats({ total: 0, open: 0, unread: 0 });
      }
    } finally {
      if (isAlive.current) setLoading(false);
    }
  }, [token, user?.userId]);

  useEffect(() => {
    isAlive.current = true;
    loadData();
    const id = setInterval(loadData, 120000); // Poll every 2 minutes (less visual flicker)
    return () => {
      isAlive.current = false;
      clearInterval(id);
    };
  }, [loadData]);

  const actOnBooking = async (bookingId: string, newStatus: 'approved' | 'declined') => {
    setActingBookingId(bookingId);
    setError('');
    try {
      await updateRows(
        'bookings',
        { status: newStatus },
        { filters: [{ column: 'id', op: 'eq', value: bookingId }], accessToken: token }
      );
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActingBookingId(null);
    }
  };

  function formatRelativeTime(dateStr) {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins + ' min';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + ' hr' + (hrs > 1 ? 's' : '');
    const days = Math.floor(hrs / 24);
    return days === 1 ? 'Yesterday' : days + ' days ago';
  }

  const currency = (amount: number | string | null | undefined) =>
    new Intl.NumberFormat('sw-TZ').format(Math.round(Number(amount || 0)));

  const reportedListings = useMemo(
    () => listings.filter((l) => l.status === 'flagged' || l.status === 'reported'),
    [listings]
  );

  const listingsCreatedThisWeek = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    return listings.filter((l) => {
      if (!l.created_at) return false;
      const created = new Date(l.created_at).getTime();
      return Number.isFinite(created) && now - created <= weekMs;
    }).length;
  }, [listings]);

  const approvedListingIds = useMemo(
    () => new Set(allApprovedBookings.map((b) => b.listing_id)),
    [allApprovedBookings]
  );

  const commissionRate = profile?.commission_rate_pct ?? 10;
  const earnedCommissions = useMemo(
    () =>
      listings
        .filter((l) => approvedListingIds.has(l.id))
        .reduce(
          (sum, l) => sum + Number(l.price_monthly ?? 0) * commissionRate / 100,
          0
        ),
    [approvedListingIds, listings, commissionRate]
  );

  const pendingCommissions = useMemo(
    () =>
      listings
        .filter((l) => l.status === 'approved' && !approvedListingIds.has(l.id))
        .reduce(
          (sum, l) => sum + Number(l.price_monthly ?? 0) * commissionRate / 100,
          0
        ),
    [approvedListingIds, listings, commissionRate]
  );

  const avgDaysToRent = useMemo(() => {
    const diffs = allApprovedBookings
      .map((b) => {
        const listing = listings.find((l) => l.id === b.listing_id);
        if (!listing?.created_at || !b.created_at) return null;
        const diff =
          (new Date(b.created_at).getTime() -
            new Date(listing.created_at).getTime()) /
          86400000;
        if (!Number.isFinite(diff)) return null;
        return Math.max(diff, 0);
      })
      .filter((n) => n != null) as number[];
    if (diffs.length === 0) return '—';
    const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    return avg.toFixed(1);
  }, [allApprovedBookings, listings]);

  const actionItems = useMemo(() => {
    const items: {
      icon: string;
      iconColor: string;
      bg: string;
      text: string;
      sub: string;
      time: string;
    }[] = [];

    reportedListings.forEach((listing) => {
      items.push({
        icon: '!',
        iconColor: '#A32D2D',
        bg: '#FCEBEB',
        text: 'Review reported listing',
        sub: `${listing.room_type || listing.title} · ${listing.district || ''}`,
        time: 'Now'
      });
    });

    listings
      .filter(
        (l) =>
          l.status === 'approved' &&
          (l.view_count == null || Number(l.view_count) === 0)
      )
      .slice(0, 2)
      .forEach((listing) => {
        items.push({
          icon: '↑',
          iconColor: '#854F0B',
          bg: '#FAEEDA',
          text: 'Low visibility listing',
          sub: `${listing.room_type || listing.title} · ${listing.district || ''} — consider boosting`,
          time: 'Today'
        });
      });

    if ((profile?.subscription_plan || 'free') === 'free') {
      items.push({
        icon: '★',
        iconColor: '#185FA5',
        bg: '#E6F1FB',
        text: 'Boost your listings',
        sub: 'Upgrade to Verified or Premium to get more views',
        time: 'Optional'
      });
    }

    return items;
  }, [listings, profile?.subscription_plan, reportedListings]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const todayLabel = new Date().toLocaleDateString('en-TZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const initials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const planName = (profile?.subscription_plan || 'free').toString();
  const PLAN_COSTS: Record<string, number> = { free: 0, verified: 15000, premium: 35000 };
  const subscriptionCost = PLAN_COSTS[planName] ?? 0;
  const netThisMonth = earnedCommissions - subscriptionCost;
  const noInquiriesLabel = t('dashboard.noInquiries', 'No inquiries yet.');

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} .kpi-row{display:flex;gap:12px;margin-bottom:1.5rem} .content-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px} .content-card{background:#ffffff;border:0.5px solid var(--border);border-radius:16px;padding:16px 18px} .card-row{padding:7px 0;border-bottom:0.5px solid var(--border);display:flex;align-items:center;gap:10px} .card-row:last-child{border-bottom:none} @media(max-width:768px){.kpi-row{display:grid;grid-template-columns:1fr 1fr}.content-grid{grid-template-columns:1fr}.dash-padding{padding:1rem!important}}`}</style>

      {reportedListings.length > 0 ? (
        <div
          style={{
            background: '#FAEEDA',
            borderBottom: '1px solid #FAC775',
            padding: '10px 2rem',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            color: '#633806'
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#EF9F27',
              color: 'white',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            !
          </span>
          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {reportedListings.length === 1
              ? `${reportedListings[0].title || 'Listing'} has been reported — review required before it relists`
              : `${reportedListings.length} listings require your attention`}
          </span>
          <Link
            to="/landlord/listings"
            style={{ marginLeft: 'auto', color: '#854F0B', fontWeight: 600, textDecoration: 'underline' }}
          >
            Review now
          </Link>
        </div>
      ) : null}

      <div className="dash-padding" style={{ padding: '1.5rem 2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            gap: 12
          }}
        >
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>
            {greeting}, {firstName}
          </h1>
          <span style={{ fontSize: 13, color: 'var(--mid)' }}>{todayLabel}</span>
        </div>

        {!loading && profile && !profile.phone_verified ? (
          <section
            className="card"
            style={{
              borderLeft: '4px solid var(--danger, #cf222e)',
              background: '#FEF2F1',
              marginBottom: '1rem'
            }}
          >
            <h2 style={{ color: '#C0392B', fontSize: '1.2rem' }}>⚠️ Phone Verification Required</h2>
            <p style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
              You must verify your phone number before you can publish listings and accept bookings. This ensures trust
              and safety on our platform.
            </p>
            <Link to="/profile" className="btn btn--small">
              Verify Phone Number →
            </Link>
          </section>
        ) : null}

        {error ? <p className="error-text">{error}</p> : null}

        {/* ── Hero Stats ────────────────────────────────────────── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            {t('layout.greeting')}, {user?.fullName?.split(' ')[0] || 'there'} 👋
          </h1>
          <p style={{ color: 'var(--mid)', marginBottom: '1.25rem', fontSize: '0.92rem' }}>
            Here's your property overview
          </p>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'Active listings', value: listings.filter(l => l.status === 'approved').length },
              { label: 'Pending review', value: listings.filter(l => l.status === 'pending').length },
              { label: 'Active tenants', value: allApprovedBookings.length },
              { label: 'Open inquiries', value: bookings.length, alert: bookings.length > 0 },
            ].map((stat) => (
              <div key={stat.label} className="card" style={{ padding: '0.9rem 1rem' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--mid)', marginBottom: '0.25rem' }}>{stat.label}</p>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.alert ? '#ef4444' : 'var(--ink)' }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Post a room CTA */}
          <div className="card" style={{ padding: '1rem 1.25rem', background: '#E8F6EF', border: '1px solid #B8DFC8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <p style={{ fontWeight: 700, color: '#1D9E75', marginBottom: '0.2rem' }}>Post a new room</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--mid)' }}>It takes about 5 minutes to go live</p>
            </div>
            <Link to="/landlord/properties/new" className="btn" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
              + List Property
            </Link>
          </div>
        </div>

        <div className="kpi-row">
          {loading
            ? Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={`kpi-skel-${idx}`}
                  style={{
                    flex: 1,
                    height: 72,
                    borderRadius: 12,
                    background: 'var(--cream)',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}
                />
              ))
            : (
              <>
                <div
                  style={{
                    background: 'var(--cream)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    flex: 1,
                    minWidth: 0
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 4 }}>Active listings</div>
                  <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
                    {listings.filter((l) => l.status === 'approved').length}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 4, color: listingsCreatedThisWeek > 0 ? 'var(--jade)' : 'var(--mid)' }}>
                    +{listingsCreatedThisWeek} this week
                  </div>
                </div>
                <div
                  style={{
                    background: 'var(--cream)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    flex: 1,
                    minWidth: 0
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 4 }}>New inquiries</div>
                  <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{conversationStats.total}</div>
                  <div style={{ fontSize: 11, marginTop: 4, color: 'var(--mid)' }}>
                    {conversationStats.unread} unread
                  </div>
                </div>
                <div
                  style={{
                    background: 'var(--cream)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    flex: 1,
                    minWidth: 0
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 4 }}>Deals closed</div>
                  <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{allApprovedBookings.length}</div>
                  <div style={{ fontSize: 11, marginTop: 4, color: 'var(--jade)' }}>
                    TZS {currency(earnedCommissions)} earned
                  </div>
                </div>
                <div
                  style={{
                    background: 'var(--cream)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    flex: 1,
                    minWidth: 0
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 4 }}>Avg. days to rent</div>
                  <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
                    {avgDaysToRent}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 4, color: 'var(--mid)' }}>days from listing to booking</div>
                </div>
              </>
            )}
        </div>

        {loading ? (
          <div className="content-grid">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`grid-skel-${idx}`}
                style={{
                  height: 220,
                  borderRadius: 16,
                  background: 'var(--cream)',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}
              />
            ))}
          </div>
        ) : (
          <div className="content-grid">
            <div className="content-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>My Listings</span>
                <Link to="/landlord/listings" style={{ fontSize: 11, color: '#534AB7' }}>
                  See all
                </Link>
              </div>
              {(listings.slice(0, 4)).map((listing) => {
                const statusColor =
                  listing.status === 'approved'
                    ? '#639922'
                    : listing.status === 'flagged' || listing.status === 'reported'
                      ? '#E24B4A'
                      : listing.status === 'pending'
                        ? '#EF9F27'
                        : '#888780';
                return (
                  <div key={listing.id} className="card-row">
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: statusColor,
                        flexShrink: 0
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {(listing.room_type || listing.title) ?? 'Listing'} · {listing.district || listing.ward || ''}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {listing.status === 'flagged' || listing.status === 'reported' ? (
                          <span style={{ color: '#A32D2D' }}>Reported · Needs review</span>
                        ) : (
                          <>
                            TZS {currency(listing.price_monthly ?? 0)}/mo
                            {listing.featured ? (
                              <span
                                style={{
                                  background: '#EEEDFE',
                                  color: '#3C3489',
                                  fontSize: 10,
                                  padding: '1px 6px',
                                  borderRadius: 4
                                }}
                              >
                                Featured
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--mid)', flexShrink: 0 }}>
                      {(listing.view_count ?? '—')} views
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="content-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Inquiries</span>
                <Link to="/messages" style={{ fontSize: 11, color: '#534AB7' }}>
                  Reply all
                </Link>
              </div>
              {topConvs.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--mid)', padding: '0.5rem 0' }}>{noInquiriesLabel}</div>
              ) : (
                topConvs.map((conv) => {
                  const tenant = convTenantMap[conv.tenant_id];
                  const name = tenant?.full_name || 'Unknown tenant';
                  return (
                    <div key={conv.id} className="card-row" style={{ alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: '#EEEDFE',
                          color: '#3C3489',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 600,
                          flexShrink: 0
                        }}
                      >
                        {initials(name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>
                          {name}
                          {conv.inquiry_status === 'open' ? (
                            <span
                              style={{
                                display: 'inline-block',
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: '#E24B4A',
                                marginLeft: 5,
                                verticalAlign: 'middle'
                              }}
                            />
                          ) : null}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 1 }}>
                          {conv.inquiry_status === 'open' ? 'Open inquiry' : 'Inquiry'}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--mid)', flexShrink: 0 }}>
                        {formatRelativeTime(conv.last_message_at)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="content-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Earnings summary</span>
                <Link to="/landlord/payments" style={{ fontSize: 11, color: '#534AB7' }}>
                  Full report
                </Link>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '7px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <span>Commissions this month</span>
                  <span style={{ color: 'var(--jade)', fontWeight: 600 }}>
                    TZS {currency(earnedCommissions)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '7px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <span>Pending (in-progress deals)</span>
                  <span style={{ color: 'var(--ink)' }}>
                    TZS {currency(pendingCommissions)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '7px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <span>Subscription ({planName})</span>
                  <span style={{ color: subscriptionCost > 0 ? '#A32D2D' : 'var(--mid)' }}>
                    {subscriptionCost > 0 ? `–TZS ${currency(subscriptionCost)}` : 'Free'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, fontSize: 13, fontWeight: 600 }}>
                  <span>Net this month</span>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: netThisMonth >= 0 ? '#3B6D11' : '#A32D2D'
                    }}
                  >
                    {netThisMonth >= 0 ? `TZS ${currency(netThisMonth)}` : `-TZS ${currency(Math.abs(netThisMonth))}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="content-card">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Action needed</div>
              {actionItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#3B6D11', fontSize: 13 }}>
                  ✓ All good — no actions needed
                </div>
              ) : (
                actionItems.slice(0, 5).map((item, idx) => (
                  <div key={`${item.text}-${idx}`} className="card-row" style={{ alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: item.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        color: item.iconColor,
                        flexShrink: 0
                      }}
                    >
                      {item.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{item.text}</div>
                      <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 1 }}>{item.sub}</div>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--mid)', flexShrink: 0 }}>{item.time}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {bookings.length > 0 ? (
          <section className="card" style={{ borderLeft: '4px solid var(--jade, #22c55e)', marginTop: '1.5rem' }}>
            <h2>
              📋 Booking Requests <span className="badge">{bookings.length}</span>
            </h2>
            <p className="muted" style={{ marginBottom: '1rem' }}>
              Tenants waiting for your approval. Approving a booking auto-generates monthly payment records and marks the
              listing as occupied.
            </p>
            {bookings.map((b) => {
              const tenant = bookingTenants[b.tenant_id];
              const bl = bookingListings[b.listing_id];
              const isOccupied = bl?.vacancy_status === 'occupied';
              return (
                <div
                  key={b.id}
                  style={{
                    padding: '1rem',
                    marginBottom: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: '#ffffff'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      alignItems: 'flex-start'
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 600 }}>{tenant?.full_name || 'Unknown tenant'}</p>
                      <p className="muted" style={{ fontSize: '0.85rem' }}>
                        {bl?.title || b.listing_id} · Move-in: {formatDate(b.move_in_date)} · {b.months_duration} month
                        {b.months_duration !== 1 ? 's' : ''}
                      </p>
                      <p className="muted" style={{ fontSize: '0.85rem' }}>
                        Preference: {b.contact_preference || '—'}
                      </p>
                      {b.message ? (
                        <p style={{ marginTop: '0.25rem', fontSize: '0.88rem' }}>&ldquo;{b.message}&rdquo;</p>
                      ) : null}
                      {isOccupied ? (
                        <p style={{ color: '#c47900', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                          ⚠️ This listing is already marked as occupied.
                        </p>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        className="btn btn--small"
                        disabled={actingBookingId === b.id}
                        onClick={() => actOnBooking(b.id, 'approved')}
                      >
                        {actingBookingId === b.id ? '…' : '✓ Approve'}
                      </button>
                      <button
                        className="btn btn--small btn--ghost"
                        disabled={actingBookingId === b.id}
                        onClick={() => actOnBooking(b.id, 'declined')}
                      >
                        {actingBookingId === b.id ? '…' : '✗ Decline'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        ) : null}
      </div>
    </>
  );
}
