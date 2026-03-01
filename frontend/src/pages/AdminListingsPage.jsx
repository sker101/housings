import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { invokeFunction, selectRows, insertRows } from '../lib/supabase';

const REASON_TEMPLATES = {
  reject: [
    'Description is incomplete or misleading',
    'Required photos do not match listed room',
    'Pricing or location details are inconsistent'
  ],
  flag: [
    'Potential scam indicators detected',
    'Suspicious listing duplication',
    'Policy violation pending final review'
  ]
};

export default function AdminListingsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [reports, setReports] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [messagingListerId, setMessagingListerId] = useState(null);
  const [error, setError] = useState('');

  const loadListings = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const rows = await selectRows('listings', {
        select:
          'id,title,region,district,ward,street,price_monthly,status,rejection_reason,created_at,lister_id',
        order: 'created_at.desc',
        limit: 200,
        accessToken: token
      });

      setListings(rows);

      // Fetch reports for flagged listings
      const flaggedIds = rows.filter((r) => r.status === 'flagged').map((r) => r.id);
      if (flaggedIds.length > 0) {
        const reportRows = await selectRows('listing_reports', {
          select: 'id,listing_id,reason,description,reporter_has_booking',
          filters: [{ column: 'listing_id', op: 'in', value: `(${flaggedIds.join(',')})` }],
          order: 'created_at.desc',
          accessToken: token
        });

        const groupedReports = {};
        reportRows.forEach((rpt) => {
          if (!groupedReports[rpt.listing_id]) groupedReports[rpt.listing_id] = [];
          groupedReports[rpt.listing_id].push(rpt);
        });
        setReports(groupedReports);
      } else {
        setReports({});
      }

      setSelectedIds((prev) => {
        const valid = new Set(rows.map((row) => row.id));
        const next = new Set();
        prev.forEach((id) => {
          if (valid.has(id)) {
            next.add(id);
          }
        });
        return next;
      });
    } catch (err) {
      setError(err.message);
      setListings([]);
      setReports({});
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [token]);

  const pendingOrFlagged = listings.filter(
    (listing) => listing.status === 'pending' || listing.status === 'flagged'
  );

  const resolveReason = (action) => {
    if (action === 'approve' || action === 'unflag') {
      return null;
    }

    const templates = REASON_TEMPLATES[action] || [];
    const prefill = templates
      .map((template, index) => `${index + 1}. ${template}`)
      .join('\n');
    const input = window.prompt(
      `Provide moderation reason:\n${prefill}\n\nType the number or custom reason.`
    );

    if (!input) {
      return '';
    }

    const parsedIndex = Number(input);
    if (Number.isInteger(parsedIndex) && parsedIndex >= 1 && parsedIndex <= templates.length) {
      return templates[parsedIndex - 1];
    }

    return input;
  };

  const moderateListing = async (
    listingId,
    action,
    customReason = null,
    options = {}
  ) => {
    const reason = customReason ?? resolveReason(action);

    if (action !== 'approve' && action !== 'unflag' && !reason.trim()) {
      return;
    }

    try {
      await invokeFunction(
        'admin-action',
        {
          action:
            action === 'approve'
              ? 'approve_listing'
              : action === 'reject'
                ? 'reject_listing'
                : action === 'flag'
                  ? 'flag'
                  : 'unflag',
          targetType: 'listing',
          targetId: listingId,
          reason: reason || null
        },
        token
      );

      if (options.reload !== false) {
        await loadListings();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleSelected = (listingId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(listingId)) {
        next.delete(listingId);
      } else {
        next.add(listingId);
      }
      return next;
    });
  };

  const toggleAll = (checked) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(pendingOrFlagged.map((listing) => listing.id)));
  };

  const moderateSelected = async (action) => {
    if (selectedIds.size === 0) {
      return;
    }

    const reason = resolveReason(action);
    if (action !== 'approve' && action !== 'unflag' && !reason.trim()) {
      return;
    }

    for (const listingId of selectedIds) {
      // eslint-disable-next-line no-await-in-loop
      await moderateListing(listingId, action, reason, { reload: false });
    }

    setSelectedIds(new Set());
    await loadListings();
  };

  const messageLister = async (listingId, listerId) => {
    setMessagingListerId(listingId);
    setError('');

    try {
      // Check if conversation already exists between Admin and Lister for this listing
      const existing = await selectRows('conversations', {
        select: 'id',
        filters: [
          { column: 'listing_id', op: 'eq', value: listingId },
          { column: 'tenant_id', op: 'eq', value: user.userId }
        ],
        limit: 1,
        accessToken: token
      });

      let conversationId = existing[0]?.id;

      if (!conversationId) {
        const created = await insertRows(
          'conversations',
          {
            listing_id: listingId,
            tenant_id: user.userId,
            lister_id: listerId,
            inquiry_status: 'open'
          },
          { accessToken: token }
        );
        conversationId = created?.[0]?.id;
      }

      if (conversationId) {
        navigate(`/messages/${conversationId}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setMessagingListerId(null);
    }
  };

  return (
    <div className="container section">
      <div className="section__header">
        <div>
          <h1>Listing Review Queue</h1>
          <p>Moderate pending and flagged listings.</p>
        </div>
      </div>

      {loading ? <p className="muted">Loading listings...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <section className="card">
        <div className="moderation-toolbar">
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={pendingOrFlagged.length > 0 && selectedIds.size === pendingOrFlagged.length}
              onChange={(event) => toggleAll(event.target.checked)}
            />
            Select all ({selectedIds.size})
          </label>
          <div className="moderation-toolbar__actions">
            <button className="btn btn--small" onClick={() => moderateSelected('approve')} disabled={selectedIds.size === 0}>
              Bulk approve
            </button>
            <button
              className="btn btn--small btn--secondary"
              onClick={() => moderateSelected('reject')}
              disabled={selectedIds.size === 0}
            >
              Bulk reject
            </button>
            <button className="btn btn--small btn--danger" onClick={() => moderateSelected('flag')} disabled={selectedIds.size === 0}>
              Bulk flag
            </button>
          </div>
        </div>

        {pendingOrFlagged.length === 0 ? <p className="muted">No listings in queue.</p> : null}

        {pendingOrFlagged.map((listing) => (
          <article key={listing.id} className="moderation-card">
            <div>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={selectedIds.has(listing.id)}
                  onChange={() => toggleSelected(listing.id)}
                />
                Select
              </label>
              <p>
                <strong>{listing.title}</strong>
              </p>
              <p>
                {[listing.street, listing.ward, listing.district, listing.region]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <p>
                {new Intl.NumberFormat('en-TZ').format(Number(listing.price_monthly || 0))} TZS / month
              </p>
              <p>Status: {listing.status}</p>
              <p>Reason: {listing.rejection_reason || '-'}</p>

              {reports[listing.id] && reports[listing.id].length > 0 && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#FEF2F1', borderRadius: '4px', border: '1px solid #F5C6C2' }}>
                  <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>🚩 User Reports ({reports[listing.id].length}):</strong>
                  <ul style={{ paddingLeft: '1rem', fontSize: '0.8rem', color: '#C0392B', margin: 0 }}>
                    {reports[listing.id].map(rpt => (
                      <li key={rpt.id}>
                        {rpt.reason.replace(/_/g, ' ')} {rpt.reporter_has_booking ? '(Tenant)' : ''}
                        {rpt.description ? `: "${rpt.description}"` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <Link to={`/rooms/${listing.id}`} className="btn btn--small btn--ghost">
                  Preview
                </Link>
                <button
                  className="btn btn--small btn--ghost"
                  onClick={() => messageLister(listing.id, listing.lister_id)}
                  disabled={messagingListerId === listing.id}
                >
                  {messagingListerId === listing.id ? 'Loading...' : 'Message Lister'}
                </button>
              </div>
            </div>

            <div className="moderation-card__actions">
              <button className="btn" onClick={() => moderateListing(listing.id, 'approve')}>
                Approve
              </button>
              <button className="btn btn--secondary" onClick={() => moderateListing(listing.id, 'reject')}>
                Reject
              </button>
              {listing.status !== 'flagged' ? (
                <button className="btn btn--danger" onClick={() => moderateListing(listing.id, 'flag')}>
                  Flag
                </button>
              ) : (
                <button className="btn btn--ghost" onClick={() => moderateListing(listing.id, 'unflag')}>
                  Unflag
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
