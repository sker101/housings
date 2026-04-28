import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  ChevronRight, 
  Home, 
  Eye, 
  Heart, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter,
  TrendingUp,
  DollarSign,
  Zap,
  Edit3,
  Ban,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { selectRows, updateRows, deleteRows } from '../lib/supabase';
import { mapListingRow, fetchPhotosForListings } from '../lib/listings';
import PaymentModal from '../components/PaymentModal';

export default function LandlordListingsPage() {
  const navigate = useNavigate();
  const [isDashboardActive, setIsDashboardActive] = useState(false);
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
        const rows = await selectRows('listings', {
          select: '*',
          filters: [{ column: 'lister_id', op: 'eq', value: user.userId }],
          order: 'created_at.desc',
          limit: 1000,
          accessToken: token
        });

        if (!mounted) return;

        if (rows.length === 0) {
          setListings([]);
          return;
        }

        const rawRows = rows as any[];
        const listingIds = rawRows.map(r => r.id);

        // Fetch photos for these listings
        const photosMap = await fetchPhotosForListings(listingIds, token);

        const listingRows = rawRows.map(r => {
          const photos = photosMap.get(r.id) || [];
          return mapListingRow(r, photos);
        });

        // Fetch saves
        const savedRows = await selectRows('saved_listings', {
          select: 'listing_id',
          filters: [{ column: 'listing_id', op: 'in', value: `(${listingIds.join(',')})` }],
          limit: 5000,
          accessToken: token
        });

        // Fetch bookings
        let bookingRows: any[] = [];
        bookingRows = await selectRows('bookings', {
          select: 'id,listing_id,status,total_tzs,created_at',
          filters: [{ column: 'listing_id', op: 'in', value: `(${listingIds.join(',')})` }],
          limit: 5000,
          accessToken: token
        }).catch(() => []);

        // Aggregate stats
        const savesByListing = savedRows.reduce((acc: any, r: any) => {
          acc[r.listing_id] = (acc[r.listing_id] || 0) + 1;
          return acc;
        }, {});

        const bookingsByListing = bookingRows.reduce((acc: any, r: any) => {
          const listingId = r.listing_id;
          if (listingId) {
            acc[listingId] = (acc[listingId] || 0) + 1;
          }
          return acc;
        }, {});

        const enriched = listingRows.map((l) => ({
          ...l,
          saveCount: savesByListing[l.id] || 0,
          bookingCount: bookingsByListing[l.id] || 0,
          totalEarned: (bookingRows as any[])
            .filter(b => b.listing_id === l.id && (b.status === 'paid' || b.status === 'completed'))
            .reduce((sum, b) => sum + (Number(b.total_tzs) || 0), 0)
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
        prev.map((l) => (l.id === listingId ? { ...l, vacancy_status: nextStatus, vacancyStatus: nextStatus } : l))
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

  const totalViews = listings.reduce((sum, l) => sum + (Number(l.viewCount) || 0), 0);
  const vacantCount = listings.filter((l) => l.vacancyStatus === 'available').length;
  const approvedCount = listings.filter((l) => l.status === 'approved').length;
  const maxViews = Math.max(...listings.map((l) => Number(l.viewCount) || 0), 1);

  // StatCard Component
  function StatCard({ label, value, sub, icon: Icon, color, delay = 0 }: {
    label: string; value: string | number; sub?: string; icon: any; color: string; delay?: number;
  }) {
    return (
      <div style={{ 
        background: 'white', 
        border: '1px solid var(--border)',
        borderRadius: 16, 
        padding: '1rem',
        animationDelay: `${delay}ms`,
        transition: 'all 0.2s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 12, 
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color
          }}>
            <Icon size={20} />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </span>
        </div>
        <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 0.25rem', lineHeight: 1.2 }}>
          {value}
        </p>
        {sub && <p style={{ fontSize: '0.8rem', color: 'var(--mid)' }}>{sub}</p>}
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} .lst-page{padding:2rem} .kpi-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:1.5rem} .kpi{background:var(--cream,#f8faf9);border-radius:12px;padding:14px 16px} .kpi-lbl{font-size:11px;color:var(--mid);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em} .kpi-val{font-size:22px;font-weight:700;line-height:1;color:var(--ink)} .kpi-sub{font-size:11px;margin-top:4px;color:var(--mid)} .toolbar{display:flex;align-items:center;gap:10px;margin-bottom:1.25rem;flex-wrap:wrap} .lst-search{flex:1;max-width:360px;padding:8px 12px;border-radius:10px;border:0.5px solid var(--border);background:#fff;font-size:13px;color:var(--ink);outline:none} .ftab{padding:6px 14px;borderRadius:10px;border:0.5px solid var(--border);background:#fff;font-size:12px;color:var(--mid);cursor:pointer;transition:all 0.15s} .ftab.on{background:#EAF3DE;color:#27500A;border-color:#97C459;fontWeight:600} .lst-table-wrap{overflow-x:auto} .lst-table{width:100%;borderCollapse:collapse;font-size:12px} .lst-table th{padding:9px 14px;text-align:left;font-size:10px;font-weight:600;color:var(--mid);textTransform:uppercase;letterSpacing:.05em;borderBottom:0.5px solid var(--border);background:#fafafa;whiteSpace:nowrap} .lst-table td{padding:12px 14px;borderBottom:0.5px solid var(--border);color:var(--ink);verticalAlign:middle} .lst-table tr:last-child td{borderBottom:none} .lst-table tr:hover td{background:#fafcfb} .l-name{font-size:13px;fontWeight:600;color:var(--jade);textDecoration:none} .l-name:hover{textDecoration:underline} .l-type{font-size:11px;color:var(--mid);marginTop:2px} .pill{display:inlineFlex;alignItems:center;gap:4px;padding:2px 9px;borderRadius:20px;fontSize:11px;fontWeight:600} .p-dot{width:5px;height:5px;borderRadius:50%;flexShrink:0} .p-approved{background:#EAF3DE;color:#27500A} .p-approved .p-dot{background:#3B6D11} .p-pending{background:#FAEEDA;color:#633806} .p-pending .p-dot{background:#D97706} .p-flagged{background:#FEE2E2;color:#991B1B} .p-flagged .p-dot{background:#DC2626} .p-available{background:#EAF3DE;color:#27500A} .p-available .p-dot{background:#22C55E} .p-occupied{background:#F1EFE8;color:#444441} .p-occupied .p-dot{background:#A3A3A3} .p-boosted{background:linear-gradient(135deg,#F59E0B,#D97706);color:white} .vbar-wrap{height:3px;background:var(--border);borderRadius:99;overflow:hidden;margin-top:4px} .vbar{height:100%;background:var(--jade);borderRadius:99} .vbar.low{background:#D97706} .act-btn{padding:5px 10px;borderRadius:6px;border:0.5px solid var(--border);background:#fff;fontSize:11px;color:var(--ink);cursor:pointer;transition:all 0.15s} .act-btn:hover{background:var(--cream)} .act-btn:disabled{opacity:0.5;cursor:not-allowed} .act-fix{background:#FEF2F1;color:#B91C1C;border-color:#FCA5A5} .act-boost{background:linear-gradient(135deg,#F59E0B,#D97706);color:white;border:none} .act-done{background:#EAF3DE;color:#27500A;border-color:#97C459} .add-btn{padding:8px 16px;borderRadius:10px;background:linear-gradient(135deg,#16a34a,#166534);color:#fff;fontSize:13px;fontWeight:600;textDecoration:none;display:inlineBlock;boxShadow:0 2px 8px rgba(22,163,74,0.25)} .lst-empty{padding:3rem 2rem;textAlign:center;color:var(--mid)}`}</style>

      {/* ── Header ──────────────────────────────── */}
      <header style={{ margin: '1rem 1.5rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink)', margin: 0, whiteSpace: 'nowrap' }}>
            My Properties
          </h1>
        </div>
        <Link 
          to="/landlord/properties/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.875rem',
            background: 'linear-gradient(135deg, #16a34a, #166534)',
            color: 'white',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          <Plus size={16} />
          Add Property
        </Link>
      </header>

      <div className="lst-page" style={{ padding: '0 1.5rem' }}>

        {error && <p className="error-text">{error}</p>}

      {/* ── Stats Overview ───────────────────────────────── */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)' }}>Overview</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`kpi-skel-${i}`}
                  style={{
                    height: 100,
                    borderRadius: 16,
                    background: 'var(--cream)',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}
                />
              ))
            : (
              <>
                <StatCard 
                  label="Total Listings" 
                  value={listings.length} 
                  sub="All time" 
                  icon={Home} 
                  color="#3b82f6" 
                  delay={100}
                />
                <StatCard 
                  label="Approved & Live" 
                  value={approvedCount} 
                  sub="Currently published" 
                  icon={CheckCircle2} 
                  color="#22c55e" 
                  delay={200}
                />
                <StatCard 
                  label="Total Views" 
                  value={totalViews.toLocaleString()} 
                  sub="Across all listings" 
                  icon={Eye} 
                  color="#8b5cf6" 
                  delay={300}
                />
                <StatCard 
                  label="Vacant Rooms" 
                  value={vacantCount} 
                  sub="Available now" 
                  icon={Calendar} 
                  color="#f59e0b" 
                  delay={400}
                />
              </>
            )}
        </div>
      </section>

      {/* ── Properties List ─────────────────────────────────── */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)' }}>
            Your Properties <span style={{ fontSize: '0.85rem', color: 'var(--mid)', fontWeight: 400 }}>({filtered.length} of {listings.length})</span>
          </h3>
        </div>

        {/* Toolbar */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem', 
          marginBottom: '1rem',
          flexWrap: 'wrap',
          background: 'white',
          padding: '0.75rem',
          borderRadius: 12,
          border: '1px solid var(--border)'
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 400 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--mid)' }} />
            <input
              type="search"
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem 0.6rem 2.5rem',
                borderRadius: 10,
                border: '1px solid var(--border)',
                fontSize: '0.9rem',
                outline: 'none',
                background: 'var(--surface)'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--mid)' }} />
            {['all', 'approved', 'pending', 'flagged'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: statusFilter === key ? '#EAF3DE' : 'white',
                  color: statusFilter === key ? '#27500A' : 'var(--mid)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', animation: 'pulse 1.5s ease-in-out infinite' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--border)', animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
              <p style={{ color: 'var(--mid)', fontSize: '0.9rem' }}>Loading properties...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ 
                width: 64, 
                height: 64, 
                borderRadius: '50%', 
                background: '#f1f5f9', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <Home size={28} style={{ color: 'var(--mid)' }} />
              </div>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.5rem' }}>
                {searchQuery ? 'No properties match your search' : 'No properties yet'}
              </p>
              <p style={{ color: 'var(--mid)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {searchQuery ? 'Try adjusting your search or filters' : 'Start by adding your first property listing'}
              </p>
              {listings.length === 0 && !searchQuery ? (
                <Link 
                  to="/landlord/properties/new" 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1.25rem',
                    background: 'linear-gradient(135deg, #16a34a, #166534)',
                    color: 'white',
                    borderRadius: 10,
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }}
                >
                  <Plus size={18} />
                  Add Your First Property
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="lst-table-wrap">
              <table className="lst-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Rent</th>
                    <th>Status</th>
                    <th>Vacancy</th>
                    <th>Earned</th>
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
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: '#f1f5f9', flexShrink: 0, border: '1px solid var(--border)' }}>
                              <img 
                                src={l.imageUrl || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80'} 
                                alt="" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Link to={`/listings/${l.id}`} className="l-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                                  {l.title}
                                </Link>
                                {l.featured ? (
                                  <span className="pill p-boosted" style={{ marginLeft: 6 }}>
                                    ⚡ Boosted
                                  </span>
                                ) : null}
                              </div>
                              <div className="l-type">{String(t(`rooms.type.${l.roomType}`, l.roomType))}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>
                            TZS {new Intl.NumberFormat('sw-TZ').format(Number(l.priceMonthly || 0))}
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
                          <span className={`pill p-${l.vacancyStatus}`}>
                            <span className="p-dot" />
                            {l.vacancyStatus ? l.vacancyStatus.charAt(0).toUpperCase() + l.vacancyStatus.slice(1) : '-'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--jade)' }}>
                            {new Intl.NumberFormat('sw-TZ').format(l.totalEarned || 0)}
                          </span>
                        </td>
                        <td>
                          <div>{l.viewCount || 0}</div>
                          <div className="vbar-wrap">
                            <div
                              className={`vbar${Number(l.viewCount || 0) < maxViews * 0.15 ? ' low' : ''}`}
                              style={{
                                width: `${Math.round((Number(l.viewCount || 0) / maxViews) * 100)}%`
                              }}
                            />
                          </div>
                        </td>
                        <td>{l.saveCount}</td>
                        <td>{l.bookingCount}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <Link 
                              to={`/landlord/properties/new?edit=${l.id}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '0.35rem 0.75rem',
                                borderRadius: 6,
                                border: '1px solid var(--border)',
                                background: 'white',
                                color: 'var(--ink)',
                                textDecoration: 'none',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                transition: 'all 0.15s'
                              }}
                              title="Edit property"
                            >
                              <Edit3 size={14} />
                              Edit
                            </Link>
                            {(l.status === 'flagged' || l.status === 'reported') && (
                              <Link 
                                to={`/landlord/properties/new?edit=${l.id}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: 6,
                                  border: '1px solid #FCD34D',
                                  background: '#FEF3C7',
                                  color: '#92400E',
                                  textDecoration: 'none',
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }}
                              >
                                <RotateCcw size={14} />
                                Fix &amp; Relist
                              </Link>
                            )}
                            {!(l.status === 'flagged' || l.status === 'rejected') && (
                              <button
                                disabled={actingId === l.id}
                                onClick={() => toggleVacancy(l.id, l.vacancyStatus)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: 6,
                                  border: '1px solid var(--border)',
                                  background: l.vacancyStatus === 'available' ? '#FEE2E2' : '#EAF3DE',
                                  color: l.vacancyStatus === 'available' ? '#991B1B' : '#27500A',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: actingId === l.id ? 'not-allowed' : 'pointer',
                                  opacity: actingId === l.id ? 0.6 : 1
                                }}
                                title={l.vacancyStatus === 'available' ? 'Mark as occupied' : 'Mark as available'}
                              >
                                {actingId === l.id ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 12, height: 12, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                    Saving...
                                  </span>
                                ) : l.vacancyStatus === 'available' ? (
                                  <><Ban size={14} /> Mark Occupied</>
                                ) : (
                                  <><CheckCircle2 size={14} /> Mark Available</>
                                )}
                              </button>
                            )}
                            {l.status === 'approved' && !l.featured ? (
                              <button 
                                onClick={() => handleBoostClick(l.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: 6,
                                  border: '1px solid #FCD34D',
                                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                  color: 'white',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)'
                                }}
                              >
                                <Zap size={14} />
                                Boost
                              </button>
                            ) : null}
                            {l.featured ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: 6,
                                  border: '1px solid #FCD34D',
                                  background: '#FEF3C7',
                                  color: '#92400E',
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }}
                              >
                                <Zap size={14} />
                                Boosted
                              </span>
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
      </section>

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
