import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mapListingRow } from '../lib/listings';
import { selectRows } from '../lib/supabase';

function countByStatus(listings, status) {
  return listings.filter((listing) => listing.status === status).length;
}

export default function LandlordDashboardPage() {
  const { user, token } = useAuth();

  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [conversationStats, setConversationStats] = useState({
    total: 0,
    open: 0,
    unread: 0
  });
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
        const [profileRows, listingRows, conversationRows] = await Promise.all([
          selectRows('profiles', {
            select:
              'id,full_name,verification_status,lister_type,subscription_plan,commission_rate_pct,payout_provider,payout_reference',
            filters: [{ column: 'id', op: 'eq', value: user.userId }],
            limit: 1,
            accessToken: token
          }),
          selectRows('listings', {
            select:
              'id,lister_id,title,description,room_type,gender_preference,price_monthly,utilities_included,region,district,ward,street,lat,lng,amenities,house_rules,available_from,vacancy_status,status,rejection_reason,featured,near_universities,view_count,created_at',
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

        if (!mounted) {
          return;
        }

        setProfile(profileRows[0] || null);
        setListings(listingRows.map((row) => mapListingRow(row, [])));
        setConversationStats({
          total: conversationRows.length,
          open: conversationRows.filter((row) => row.inquiry_status === 'open').length,
          unread
        });
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setProfile(null);
          setListings([]);
          setConversationStats({
            total: 0,
            open: 0,
            unread: 0
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [user?.userId, token]);

  const metrics = useMemo(
    () => [
      { label: 'Total listings', value: listings.length },
      { label: 'Pending', value: countByStatus(listings, 'pending') },
      { label: 'Approved', value: countByStatus(listings, 'approved') },
      { label: 'Rejected', value: countByStatus(listings, 'rejected') },
      { label: 'Flagged', value: countByStatus(listings, 'flagged') }
    ],
    [listings]
  );

  return (
    <div className="container section">
      <div className="section__header">
        <div>
          <h1>Lister Dashboard</h1>
          <p>Track listing performance and moderation status.</p>
        </div>
        <Link className="btn" to="/list-property">
          Add listing
        </Link>
      </div>

      {loading ? <p className="muted">Loading dashboard...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {profile ? (
        <section className="card">
          <h2>Verification Status</h2>
          <p>
            <strong>{String(profile.verification_status || '').toUpperCase()}</strong>
          </p>
          <p className="muted">
            Lister type: {profile.lister_type || 'owner'} | Plan:{' '}
            {profile.subscription_plan || 'free'}
          </p>
          {profile.payout_provider ? (
            <p className="muted">
              Payout: {profile.payout_provider} ({profile.payout_reference || 'not set'})
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="card">
        <h2>Inquiries & Messages</h2>
        <p className="muted">
          Conversations: {conversationStats.total} | Open inquiries: {conversationStats.open} |
          Unread messages: {conversationStats.unread}
        </p>
        <Link to="/messages" className="btn btn--small">
          Open messages
        </Link>
      </section>

      <section className="metric-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="card">
        <h2>Your Listings</h2>
        {listings.length === 0 ? <p className="muted">No listings submitted yet.</p> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Rent</th>
                <th>Views</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing.id}>
                  <td>{listing.title}</td>
                  <td>{listing.status}</td>
                  <td>{new Intl.NumberFormat('en-TZ').format(listing.priceMonthly)} TZS</td>
                  <td>{listing.viewCount}</td>
                  <td>{listing.rejectionReason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
