import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { selectRows, updateRows } from '../lib/supabase';
import PaymentModal from '../components/PaymentModal';

export default function LandlordListingsPage() {
  const { user, token } = useAuth();
  const { t } = useTranslation();

  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Payment Modal State
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [boostingListingId, setBoostingListingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user?.userId || !token) return;
      setLoading(true);
      try {
        // Fetch listings
        const listingRows = await selectRows('listings', {
          select: 'id,title,room_type,price_monthly,status,vacancy_status,view_count,featured',
          filters: [{ column: 'lister_id', op: 'eq', value: user.userId }],
          order: 'created_at.desc',
          limit: 1000,
          accessToken: token
        });

        if (!mounted) return;

        if (listingRows.length === 0) {
          setListings([]);
          return;
        }

        const listingIds = listingRows.map((r) => r.id);

        // Fetch saves
        const savedRows = await selectRows('saved_listings', {
          select: 'listing_id',
          filters: [{ column: 'listing_id', op: 'in', value: `(${listingIds.join(',')})` }],
          limit: 5000,
          accessToken: token
        });

        // Fetch bookings
        const bookingRows = await selectRows('bookings', {
          select: 'id,listing_id',
          filters: [{ column: 'listing_id', op: 'in', value: `(${listingIds.join(',')})` }],
          limit: 5000,
          accessToken: token
        });

        // Aggregate stats
        const savesByListing = savedRows.reduce((acc: any, r: any) => {
          acc[r.listing_id] = (acc[r.listing_id] || 0) + 1;
          return acc;
        }, {});

        const bookingsByListing = bookingRows.reduce((acc: any, r: any) => {
          acc[r.listing_id] = (acc[r.listing_id] || 0) + 1;
          return acc;
        }, {});

        const enriched = listingRows.map((l) => ({
          ...l,
          saveCount: savesByListing[l.id] || 0,
          bookingCount: bookingsByListing[l.id] || 0
        }));

        setListings(enriched);
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [user?.userId, token]);

  const toggleVacancy = async (listingId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'available' ? 'occupied' : 'available';
    setActingId(listingId);
    try {
      await updateRows(
        'listings',
        { vacancy_status: nextStatus },
        {
          filters: [{ column: 'id', op: 'eq', value: listingId }],
          accessToken: token
        }
      );
      setListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, vacancy_status: nextStatus } : l))
      );
    } catch (err: any) {
      console.error('Failed to update vacancy status', err);
    } finally {
      setActingId(null);
    }
  };

  const handleBoostClick = (listingId: string) => {
    setBoostingListingId(listingId);
    setBoostModalOpen(true);
  };

  const handleBoostSuccess = async () => {
    if (!boostingListingId) return;
    try {
      await updateRows(
        'listings',
        { featured: true },
        {
          filters: [{ column: 'id', op: 'eq', value: boostingListingId }],
          accessToken: token
        }
      );
      setListings((prev) =>
        prev.map((l) => (l.id === boostingListingId ? { ...l, featured: true } : l))
      );
    } catch (err) {
      console.error('Failed to boost listing', err);
    }
  };

  const filtered = listings.filter((l) => {
    const matchesSearch = (l.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const totalViews = listings.reduce((sum, l) => sum + (Number(l.view_count) || 0), 0);
  const vacantCount = listings.filter((l) => l.vacancy_status === 'available').length;
  const approvedCount = listings.filter((l) => l.status === 'approved').length;
  const maxViews = Math.max(...listings.map((l) => Number(l.view_count) || 0), 1);

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} .lst-page{padding:2rem} .kpi-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:1.5rem} .kpi{background:var(--cream,#f8faf9);border-radius:12px;padding:14px 16px} .kpi-lbl{font-size:11px;color:var(--mid);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em} .kpi-val{font-size:22px;font-weight:700;line-height:1;color:var(--ink)} .kpi-sub{font-size:11px;margin-top:4px;color:var(--mid)} .toolbar{display:flex;align-items:center;gap:10px;margin-bottom:1.25rem;flex-wrap:wrap} .lst-search{flex:1;max-width:360px;padding:8px 12px;border-radius:10px;border:0.5px solid var(--border);background:#fff;font-size:13px;color:var(--ink);outline:none} .ftab{padding:6px 14px;border-radius:10px;border:0.5px solid var(--border);background:#fff;font-size:12px;color:var(--mid);cursor:pointer;transition:all 0.15s} .ftab.on{background:#EAF3DE;color:#27500A;border-color:#97C459;font-weight:600} .lst-table-wrap{overflow-x:auto} .lst-table{width:100%;border-collapse:collapse;font-size:12px} .lst-table th{padding:9px 14px;text-align:left;font-size:10px;font-weight:600;color:var(--mid);text-transform:uppercase;letter-spacing:.05em;border-bottom:0.5px solid var(--border);background:#fafafa;white-space:nowrap} .lst-table td{padding:12px 14px;border-bottom:0.5px solid var(--border);color:var(--ink);vertical-align:middle} .lst-table tr:last-child td{border-bottom:none} .lst-table tr:hover td{background:#fafcfb} .l-name{font-size:13px;font-weight:600;color:var(--jade);text-decoration:none} .l-name:hover{text-decoration:underline} .l-type{font-size:11px;color:var(--mid);margin-top:2px} .pill{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600} .p-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0} .p-approved{background:#EAF3DE;color:#27500A} .p-approved .p-dot{background:#3B6D11} .p-pending{background:#FAEEDA;color:#633806} .p-pending .p-dot{background:#854F0B} .p-flagged{background:#FCEBEB;color:#791F1F} .p-flagged .p-dot{background:#A32D2D} .p-rejected{background:#F1EFE8;color:#444441} .p-rejected .p-dot{background:#888780} .p-available{background:#E6F1FB;color:#0C447C} .p-available .p-dot{background:#185FA5} .p-occupied{background:#FCEBEB;color:#791F1F} .p-occupied .p-dot{background:#A32D2D} .p-boosted{background:#FAEEDA;color:#633806} .vbar-wrap{margin-top:4px;height:3px;border-radius:2px;background:var(--border);overflow:hidden;width:80px} .vbar{height:100%;border-radius:2px;background:var(--jade)} .vbar.low{background:#A32D2D} .act-btn{padding:5px 10px;border-radius:7px;border:0.5px solid var(--border);background:#fff;font-size:11px;font-weight:500;cursor:pointer;color:var(--ink);white-space:nowrap;transition:background 0.15s} .act-btn:hover{background:var(--cream)} .act-btn:disabled{opacity:0.5;cursor:default} .act-boost{background:#FAEEDA;color:#633806;border-color:#FAC775} .act-boost:hover{background:#FAC775} .act-fix{color:#791F1F;border-color:#F09595} .act-fix:hover{background:#FCEBEB} .act-done{background:#f3f4f6;color:#9ca3af;border-color:transparent;cursor:default} .lst-empty{padding:3rem 2rem;text-align:center;color:var(--mid);font-size:13px} .add-btn{padding:8px 18px;border-radius:10px;border:none;background:var(--jade);color:#fff;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block} @media(max-width:768px){.kpi-strip{grid-template-columns:1fr 1fr}.lst-page{padding:1rem}}`}</style>

      <div className="lst-page">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem'
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
              My listings <span style={{ fontSize: 14, color: 'var(--mid)', fontWeight: 400 }}>({listings.length})</span>
            </h1>
            <p style={{ fontSize: 12, color: 'var(--mid)', marginTop: 4 }}>
              Manage properties, track views, and control availability
            </p>
          </div>
          <Link to="/list-property" className="add-btn">
            + Add listing
          </Link>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="kpi-strip">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`kpi-skel-${i}`}
                  style={{
                    height: 72,
                    borderRadius: 12,
                    background: 'var(--cream)',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}
                />
              ))
            : (
              <>
                <div className="kpi">
                  <div className="kpi-lbl">Total listings</div>
                  <div className="kpi-val">{listings.length}</div>
                  <div className="kpi-sub">All time</div>
                </div>
                <div className="kpi">
                  <div className="kpi-lbl">Approved &amp; live</div>
                  <div className="kpi-val" style={{ color: '#27500A' }}>{approvedCount}</div>
                  <div className="kpi-sub">Currently published</div>
                </div>
                <div className="kpi">
                  <div className="kpi-lbl">Total views</div>
                  <div className="kpi-val" style={{ color: '#0C447C' }}>{totalViews.toLocaleString()}</div>
                  <div className="kpi-sub">Across all listings</div>
                </div>
                <div className="kpi">
                  <div className="kpi-lbl">Vacant rooms</div>
                  <div className="kpi-val" style={{ color: '#633806' }}>{vacantCount}</div>
                  <div className="kpi-sub">Available now</div>
                </div>
              </>
            )}
        </div>

        <div className="toolbar">
          <input
            type="search"
            className="lst-search"
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {['all', 'approved', 'pending', 'flagged'].map((key) => (
            <button
              key={key}
              type="button"
              className={`ftab${statusFilter === key ? ' on' : ''}`}
              onClick={() => setStatusFilter(key)}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ background: '#ffffff', border: '0.5px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {loading ? (
            <div className="lst-empty" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>Loading listings...</div>
          ) : filtered.length === 0 ? (
            <div className="lst-empty">
              No listings found.
              {listings.length === 0 ? (
                <div style={{ marginTop: '1rem' }}>
                  <Link to="/list-property" className="add-btn">Add your first listing</Link>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="lst-table-wrap">
              <table className="lst-table">
                <thead>
                  <tr>
                    <th>Listing</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Vacancy</th>
                    <th>Views</th>
                    <th>Saves</th>
                    <th>Bookings</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => {
                    const statusClass = l.status === 'reported' ? 'flagged' : l.status;
                    return (
                      <tr key={l.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Link to={`/rooms/${l.id}`} className="l-name">
                              {l.title}
                            </Link>
                            {l.featured ? (
                              <span className="pill p-boosted" style={{ marginLeft: 6 }}>
                                ⚡ Boosted
                              </span>
                            ) : null}
                          </div>
                          <div className="l-type">{String(t(`rooms.type.${l.room_type}`, l.room_type))}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>
                            TZS {new Intl.NumberFormat('sw-TZ').format(Number(l.price_monthly || 0))}
                          </span>{' '}
                          <span style={{ fontSize: 10, color: 'var(--mid)' }}>/mo</span>
                        </td>
                        <td>
                          <span className={`pill p-${statusClass}`}>
                            <span className="p-dot" />
                            {l.status ? l.status.charAt(0).toUpperCase() + l.status.slice(1) : '-'}
                          </span>
                        </td>
                        <td>
                          <span className={`pill p-${l.vacancy_status}`}>
                            <span className="p-dot" />
                            {l.vacancy_status ? l.vacancy_status.charAt(0).toUpperCase() + l.vacancy_status.slice(1) : '-'}
                          </span>
                        </td>
                        <td>
                          <div>{l.view_count || 0}</div>
                          <div className="vbar-wrap">
                            <div
                              className={`vbar${Number(l.view_count || 0) < maxViews * 0.15 ? ' low' : ''}`}
                              style={{
                                width: `${Math.round((Number(l.view_count || 0) / maxViews) * 100)}%`
                              }}
                            />
                          </div>
                        </td>
                        <td>{l.saveCount}</td>
                        <td>{l.bookingCount}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <Link to={`/list-property?edit=${l.id}`} className="act-btn">
                              Edit
                            </Link>
                            {(l.status === 'flagged' || l.status === 'reported') && (
                              <Link to={`/list-property?edit=${l.id}`} className="act-btn act-fix">
                                Fix &amp; relist
                              </Link>
                            )}
                            {!(l.status === 'flagged' || l.status === 'rejected') && (
                              <button
                                className="act-btn"
                                disabled={actingId === l.id}
                                onClick={() => toggleVacancy(l.id, l.vacancy_status)}
                              >
                                {actingId === l.id
                                  ? 'Saving...'
                                  : l.vacancy_status === 'available'
                                    ? 'Mark occupied'
                                    : 'Mark available'}
                              </button>
                            )}
                            {l.status === 'approved' && !l.featured ? (
                              <button className="act-btn act-boost" onClick={() => handleBoostClick(l.id)}>
                                Boost ⚡
                              </button>
                            ) : null}
                            {l.featured ? (
                              <button className="act-btn act-done" disabled>
                                Boosted
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <PaymentModal
          isOpen={boostModalOpen}
          amount={5000}
          description="Featured listing boost"
          onClose={() => {
            setBoostModalOpen(false);
            setBoostingListingId(null);
          }}
          onSuccess={handleBoostSuccess}
        />
      </div>
    </>
  );
}
