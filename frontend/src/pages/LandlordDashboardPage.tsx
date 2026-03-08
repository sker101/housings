import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { mapListingRow } from '../lib/listings';
import { selectRows, updateRows } from '../lib/supabase';

function countByStatus(listings, status) {
  return listings.filter((listing) => listing.status === status).length;
}

function formatDate(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleDateString(); } catch { return value; }
}

export default function LandlordDashboardPage() {
  const { user, token } = useAuth();
  const { t } = useTranslation();

  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [listingChecks, setListingChecks] = useState<Record<string, any[]>>({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingTenants, setBookingTenants] = useState<Record<string, any>>({});
  const [bookingListings, setBookingListings] = useState<Record<string, any>>({});
  const [actingBookingId, setActingBookingId] = useState<string | null>(null);
  const [conversationStats, setConversationStats] = useState({ total: 0, open: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!user?.userId || !token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [profileRows, listingRows, conversationRows, bookingRows] = await Promise.all([
          selectRows('profiles', {
            select: 'id,full_name,verification_status,lister_type,subscription_plan,commission_rate_pct,payout_provider,payout_reference',
            filters: [{ column: 'id', op: 'eq', value: user.userId }],
            limit: 1,
            accessToken: token
          }),
          selectRows('listings', {
            select: 'id,lister_id,title,description,room_type,gender_preference,price_monthly,utilities_included,region,district,ward,street,lat,lng,amenities,house_rules,available_from,vacancy_status,status,rejection_reason,featured,near_universities,view_count,created_at',
            filters: [{ column: 'lister_id', op: 'eq', value: user.userId }],
            order: 'created_at.desc',
            limit: 200,
            accessToken: token
          }),
          selectRows('conversations', {
            select: 'id,inquiry_status,last_message_at,created_at',
            filters: [{ column: 'lister_id', op: 'eq', value: user.userId }],
            order: 'last_message_at.desc',
            limit: 200,
            accessToken: token
          }),
          selectRows('bookings', {
            select: 'id,listing_id,tenant_id,move_in_date,duration_months,message,contact_preference,status,created_at',
            filters: [
              { column: 'lister_id', op: 'eq', value: user.userId },
              { column: 'status', op: 'eq', value: 'requested' }
            ],
            order: 'created_at.desc',
            limit: 50,
            accessToken: token
          })
        ]);

        const conversationIds = conversationRows.map((row) => row.id).filter(Boolean);
        let unread = 0;

        if (conversationIds.length > 0) {
          const unreadRows = await selectRows('messages', {
            select: 'id',
            filters: [
              { column: 'conversation_id', op: 'in', value: `(${conversationIds.join(',')})` },
              { column: 'sender_id', op: 'neq', value: user.userId },
              { column: 'seen_at', op: 'is', value: 'null' }
            ],
            accessToken: token
          });
          unread = unreadRows.length;
        }

        if (!mounted) return;

        setProfile(profileRows[0] || null);
        setListings(listingRows.map((row) => mapListingRow(row, [])));
        setBookings(bookingRows);

        // Enrich bookings with tenant + listing info
        if (bookingRows.length > 0) {
          const tenantIds = Array.from(new Set(bookingRows.map((b) => b.tenant_id)));
          const bListingIds = Array.from(new Set(bookingRows.map((b) => b.listing_id)));
          const [tenants, bListings] = await Promise.all([
            selectRows('profiles', { select: 'id,full_name,phone', filters: [{ column: 'id', op: 'in', value: `(${tenantIds.join(',')})` }], accessToken: token }),
            selectRows('listings', { select: 'id,title,vacancy_status', filters: [{ column: 'id', op: 'in', value: `(${bListingIds.join(',')})` }], accessToken: token })
          ]);
          if (mounted) {
            setBookingTenants(Object.fromEntries(tenants.map((t) => [t.id, t])));
            setBookingListings(Object.fromEntries(bListings.map((l) => [l.id, l])));
          }
        }

        // Load check failures for non-approved listings
        const nonApprovedIds = listingRows.filter((r) => r.status !== 'approved').map((r) => r.id).filter(Boolean);
        if (nonApprovedIds.length > 0) {
          const checkRows = await selectRows('listing_checks', {
            select: 'listing_id,check_type,result,severity,detail',
            filters: [
              { column: 'listing_id', op: 'in', value: `(${nonApprovedIds.join(',')})` },
              { column: 'result', op: 'eq', value: 'block' }
            ],
            order: 'checked_at.desc',
            limit: 100,
            accessToken: token
          });
          const grouped: Record<string, any[]> = {};
          checkRows.forEach((c) => {
            if (!grouped[c.listing_id]) grouped[c.listing_id] = [];
            grouped[c.listing_id].push(c);
          });
          if (mounted) setListingChecks(grouped);
        }

        if (mounted) setConversationStats({ total: conversationRows.length, open: conversationRows.filter((row) => row.inquiry_status === 'open').length, unread });
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
          setProfile(null);
          setListings([]);
          setConversationStats({ total: 0, open: 0, unread: 0 });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => { mounted = false; };
  }, [user?.userId, token]);

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActingBookingId(null);
    }
  };

  const metrics = useMemo(
    () => [
      { label: t('dashboard.totalListings'), value: listings.length, id: 'all' },
      { label: t('dashboard.pending'), value: countByStatus(listings, 'pending'), id: 'pending' },
      { label: t('dashboard.approved'), value: countByStatus(listings, 'approved'), id: 'approved' },
      { label: t('dashboard.rejected'), value: countByStatus(listings, 'rejected'), id: 'rejected' },
      { label: t('dashboard.flagged'), value: countByStatus(listings, 'flagged'), id: 'flagged' }
    ],
    [listings, t]
  );

  const filteredListings = useMemo(() => {
    if (statusFilter === 'all') return listings;
    return listings.filter((listing) => listing.status === statusFilter);
  }, [listings, statusFilter]);

  return (
    <div className="container section">
      <div className="section__header">
        <div>
          <h1>{t('dashboard.listerDashboard')}</h1>
          <p>{t('dashboard.listerDashboardSubtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link className="btn btn--ghost btn--small" to="/landlord/payments">💰 Payments</Link>
          {profile?.phone_verified ? (
            <Link className="btn" to="/list-property">{t('dashboard.addListing')}</Link>
          ) : (
            <button className="btn" disabled title="Please verify your phone number first">Add Listing (Requires Phone)</button>
          )}
        </div>
      </div>

      {!loading && profile && !profile.phone_verified ? (
        <section className="card" style={{ borderLeft: '4px solid var(--danger, #cf222e)', background: '#FEF2F1' }}>
          <h2 style={{ color: '#C0392B', fontSize: '1.2rem' }}>⚠️ Phone Verification Required</h2>
          <p style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
            You must verify your phone number before you can publish listings and accept bookings. This ensures trust and safety on our platform.
          </p>
          <Link to="/profile" className="btn btn--small">Verify Phone Number →</Link>
        </section>
      ) : null}

      {loading ? <p className="muted">{t('dashboard.loadingDashboard')}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {/* Booking Approval Panel */}
      {bookings.length > 0 ? (
        <section className="card" style={{ borderLeft: '4px solid var(--jade, #22c55e)' }}>
          <h2>📋 Booking Requests <span className="badge">{bookings.length}</span></h2>
          <p className="muted" style={{ marginBottom: '1rem' }}>Tenants waiting for your approval. Approving a booking auto-generates monthly payment records and marks the listing as occupied.</p>
          {bookings.map((b) => {
            const tenant = bookingTenants[b.tenant_id];
            const bl = bookingListings[b.listing_id];
            const isOccupied = bl?.vacancy_status === 'occupied';
            return (
              <div key={b.id} style={{ padding: '1rem', marginBottom: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 600 }}>{tenant?.full_name || 'Unknown tenant'}</p>
                    <p className="muted" style={{ fontSize: '0.85rem' }}>
                      {bl?.title || b.listing_id} · Move-in: {formatDate(b.move_in_date)} · {b.duration_months} month{b.duration_months !== 1 ? 's' : ''}
                    </p>
                    <p className="muted" style={{ fontSize: '0.85rem' }}>Preference: {b.contact_preference || '—'}</p>
                    {b.message ? <p style={{ marginTop: '0.25rem', fontSize: '0.88rem' }}>&ldquo;{b.message}&rdquo;</p> : null}
                    {isOccupied ? <p style={{ color: '#c47900', fontSize: '0.82rem', marginTop: '0.25rem' }}>⚠️ This listing is already marked as occupied.</p> : null}
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

      {profile ? (
        <section className="card">
          <h2>{t('dashboard.verificationStatus')}</h2>
          <p><strong>{String(profile.verification_status || '').toUpperCase()}</strong></p>
          <p className="muted">
            {t('auth.listerType')}: {profile.lister_type || t('auth.owner')} | {t('dashboard.plan')}: {profile.subscription_plan || 'free'}
          </p>
          {profile.payout_provider ? (
            <p className="muted">
              {t('dashboard.payout')}: {profile.payout_provider} ({profile.payout_reference || 'not set'})
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="card">
        <h2>{t('dashboard.inquiriesAndMessages')}</h2>
        <p className="muted">
          {t('dashboard.conversations')}: {conversationStats.total} | {t('dashboard.openInquiries')}: {conversationStats.open} |
          {t('dashboard.unreadMessages')}: {conversationStats.unread}
        </p>
        <Link to="/messages" className="btn btn--small">{t('dashboard.openMessages')}</Link>
      </section>

      <section className="metric-grid">
        {metrics.map((metric) => (
          <button
            key={metric.id}
            type="button"
            className={`metric-card metric-card--clickable ${statusFilter === metric.id ? 'is-active' : ''}`}
            onClick={() => setStatusFilter(metric.id)}
            style={{ textAlign: 'left', cursor: 'pointer', border: statusFilter === metric.id ? '2px solid var(--jade)' : '' }}
          >
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
          </button>
        ))}
      </section>

      <section className="card">
        <h2>{t('dashboard.yourListings')} {statusFilter !== 'all' ? `(${statusFilter})` : ''}</h2>
        {filteredListings.length === 0 ? <p className="muted">{t('dashboard.noCategoryListings')}</p> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('dashboard.titleColumn')}</th>
                <th>{t('dashboard.statusColumn')}</th>
                <th>{t('dashboard.rentColumn')}</th>
                <th>{t('dashboard.viewsColumn')}</th>
                <th>{t('dashboard.reasonColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredListings.map((listing) => {
                const checks = listingChecks[listing.id] || [];
                const isBlocked = listing.status === 'pending' && checks.length > 0;
                return (
                  <tr key={listing.id} style={isBlocked ? { background: '#FEF2F1' } : {}}>
                    <td>
                      <Link to={`/rooms/${listing.id}`} style={{ fontWeight: '500', color: 'var(--jade)' }}>
                        {listing.title}
                      </Link>
                      {isBlocked ? (
                        <div style={{ marginTop: '0.4rem' }}>
                          {checks.slice(0, 2).map((c) => (
                            <p key={c.check_type} style={{ fontSize: '0.75rem', color: '#C0392B', margin: '0 0 2px' }}>
                              ⚠️ {c.detail}
                            </p>
                          ))}
                          <Link
                            to={`/list-property?edit=${listing.id}`}
                            className="btn btn--small"
                            style={{ marginTop: '0.35rem', fontSize: '0.75rem', display: 'inline-block' }}
                          >
                            {t('dashboard.fixAndResubmit')}
                          </Link>
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span style={listing.status === 'flagged' ? { color: '#B45309', fontWeight: 600 } : listing.status === 'approved' ? { color: '#1A6B3A', fontWeight: 600 } : {}}>
                        {String(t(`dashboard.${listing.status}`, listing.status))}
                      </span>
                    </td>
                    <td>{new Intl.NumberFormat('en-TZ').format(listing.priceMonthly)} TZS</td>
                    <td>{listing.viewCount}</td>
                    <td>{listing.rejectionReason || (isBlocked ? t('dashboard.autoBlocked') : '-')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
