import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building, RefreshCw, Search, Eye, CheckCircle, XCircle,
  Flag, AlertTriangle, LayoutList, Clock, BadgeCheck, Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { selectRows, updateRows } from '../lib/supabase';
import { mapListingRow } from '../lib/listings';
import { SkeletonCard } from '../components/SkeletonCard';
import { formatDate, TZSFormat } from '../utils/format';
import toast from 'react-hot-toast';

type StatusTab = 'all' | 'approved' | 'pending' | 'flagged' | 'rejected' | 'removed';

const STATUS_TABS: { key: StatusTab; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <LayoutList size={14} /> },
  { key: 'approved', label: 'Live', icon: <BadgeCheck size={14} /> },
  { key: 'pending', label: 'Pending', icon: <Clock size={14} /> },
  { key: 'flagged', label: 'Flagged', icon: <Flag size={14} /> },
  { key: 'rejected', label: 'Rejected', icon: <XCircle size={14} /> },
  { key: 'removed', label: 'Removed', icon: <Trash2 size={14} /> },
];

interface Listing {
  id: string;
  title: string;
  region: string;
  district: string;
  ward: string;
  street: string;
  price_tzs: number;
  status: string;
  room_type: string;
  lister_id: string;
  lister_name?: string;
  lister_phone?: string;
  lister_role?: string;
  rejection_reason?: string;
  created_at: string;
  view_count?: number;
}

export default function AdminListingsPage() {
  const { token } = useAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inspectListing, setInspectListing] = useState<Listing | null>(null);
  const [inspectPhotos, setInspectPhotos] = useState<any[]>([]);
  const [inspectPhotoIdx, setInspectPhotoIdx] = useState(0);
  const [inspectLoading, setInspectLoading] = useState(false);

  const loadListings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const rows = await selectRows('listings', {
        select: '*',
        order: 'created_at.desc',
        limit: 300,
        accessToken: token,
      });

      // Enrich with lister profile in one separate batch
      const listerIds = [...new Set((rows as any[]).map((r) => r.lister_id).filter(Boolean))];
      let profileMap: Record<string, { full_name: string; phone: string; role?: string }> = {};
      if (listerIds.length > 0) {
        try {
          const profiles = await selectRows('profiles', {
            select: 'id,full_name,phone,role',
            filters: [{ column: 'id', op: 'in', value: `(${listerIds.join(',')})` }],
            accessToken: token,
          });
          profiles.forEach((p: any) => { profileMap[p.id] = p; });
        } catch { /* non-fatal */ }
      }

      const enriched = (rows as any[]).map((r) => {
        const mapped = mapListingRow(r);
        return {
          ...mapped,
          lister_name: profileMap[mapped.listerId]?.full_name || '—',
          lister_phone: profileMap[mapped.listerId]?.phone || '—',
          lister_role: profileMap[mapped.listerId]?.role || '—',
        };
      });

      setListings(enriched as any);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadListings(); }, [loadListings]);

  // ── Moderation actions ────────────────────────────────────────
  const moderate = async (id: string, action: 'approve' | 'reject' | 'flag' | 'unflag' | 'remove', reason?: string) => {
    if (!token) return;
    setBusyId(id);
    // Optimistic update
    const statusMap: Record<string, string> = {
      approve: 'approved',
      reject: 'rejected',
      flag: 'flagged',
      unflag: 'approved',
      remove: 'removed',
    };
    const newStatus = statusMap[action];
    setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: newStatus } : l));

    try {
      const response = await updateRows('listings', {
        status: newStatus,
        ...(reason ? { rejection_reason: reason } : {}),
      }, {
        filters: [{ column: 'id', op: 'eq', value: id }],
        accessToken: token,
      });
      
      console.log('[Admin] Moderation response:', response);
      
      if (Array.isArray(response) && response.length === 0) {
        console.warn('[Admin] No rows were updated. Check if the ID is correct or if RLS is blocking the update.');
        throw new Error('Update failed: No changes were saved. This might be a permission issue.');
      }

      toast.success(`Listing ${action}d successfully`);
      await loadListings(); // Ensure full sync after update
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
      await loadListings(); // revert by reloading
    } finally {
      setBusyId(null);
    }
  };

  // ── Inspect ───────────────────────────────────────────────────
  const handleInspect = async (listing: Listing) => {
    setInspectListing(listing);
    setInspectPhotoIdx(0);
    setInspectPhotos([]);
    setInspectLoading(true);
    try {
      const photos = await selectRows('listing_photos', {
        select: 'id,public_url,angle,caption,position',
        filters: [{ column: 'listing_id', op: 'eq', value: listing.id }],
        order: 'position.asc',
        accessToken: token!,
      });
      setInspectPhotos(photos);
    } catch { /* non-fatal */ }
    setInspectLoading(false);
  };

  // ── Counts + filter ───────────────────────────────────────────
  const counts: Record<StatusTab, number> = {
    all: listings.length,
    approved: listings.filter((l) => l.status === 'approved').length,
    pending: listings.filter((l) => l.status === 'pending').length,
    flagged: listings.filter((l) => l.status === 'flagged').length,
    rejected: listings.filter((l) => l.status === 'rejected').length,
    removed: listings.filter((l) => l.status === 'removed').length,
  };

  const filtered = listings.filter((l) => {
    const matchTab = activeTab === 'all' || l.status === activeTab;
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      l.title?.toLowerCase().includes(q) ||
      l.lister_name?.toLowerCase().includes(q) ||
      l.district?.toLowerCase().includes(q) ||
      l.ward?.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const accentFor = (status: string) => {
    if (status === 'approved') return 'var(--jade)';
    if (status === 'pending') return 'var(--amber)';
    if (status === 'flagged') return '#e67e22';
    if (status === 'rejected') return 'var(--red)';
    return 'var(--mid)';
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <style>{`
        .admin-tabs-container {
          display: flex;
          gap: 0.35rem;
          margin-bottom: 1.25rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          -webkit-overflow-scrolling: touch;
        }
        .admin-tabs-container::-webkit-scrollbar {
          display: none;
        }
        .listing-mobile-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 1rem;
          margin-bottom: 0.75rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        .listing-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.75rem;
        }
        .listing-card-title {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--top);
          margin: 0;
          line-height: 1.3;
        }
        .listing-card-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-bottom: 1rem;
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 10px;
        }
        .meta-item label {
          display: block;
          font-size: 0.65rem;
          text-transform: uppercase;
          color: var(--mid);
          font-weight: 700;
          margin-bottom: 0.1rem;
        }
        .meta-item value {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--top);
        }
        .listing-card-actions {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .listing-card-actions > * {
          flex: 1;
          min-width: 80px;
        }
      `}</style>

      {/* Title */}
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: " sans-serif", fontWeight: 800, fontSize: isMobile ? '1.1rem' : '1.2rem', margin: 0 }}>
          {isMobile ? 'Listings Moderation' : 'All Listings'}
        </h2>
        <p style={{ color: 'var(--mid)', fontSize: '0.84rem', marginTop: '0.2rem' }}>
          {isMobile ? 'Review and manage properties.' : 'View, moderate and manage every property on the platform.'}
        </p>
      </div>

      {/* Search + Refresh */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--mid)' }} />
          <input
            type="text"
            placeholder="Search listings…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem', width: '100%', borderRadius: '12px' }}
          />
        </div>
        <button className="btn btn--ghost btn--small" onClick={loadListings} title="Refresh" style={{ flexShrink: 0, borderRadius: '12px' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Status Tabs - Scrollable */}
      <div className="admin-tabs-container">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.45rem 0.9rem', borderRadius: 99,
              border: isActive ? '2px solid var(--jade)' : '1px solid var(--border)',
              background: isActive ? 'var(--jade-muted, #e8f8f2)' : 'var(--surface)',
              color: isActive ? 'var(--jade)' : 'var(--mid)',
              fontWeight: isActive ? 700 : 500, fontSize: '0.8rem', cursor: 'pointer',
              transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0
            }}>
              {tab.icon}
              {tab.label}
              <span style={{
                background: isActive ? 'var(--jade)' : 'var(--border)',
                color: isActive ? '#fff' : 'var(--mid)',
                borderRadius: 99, fontSize: '0.7rem', fontWeight: 700,
                padding: '0 0.4rem', lineHeight: '1.5', marginLeft: '0.2rem'
              }}>
                {counts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {loading ? (
        <div style={{ display: 'grid', gap: '0.5rem' }}><SkeletonCard variant="row" count={10} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <Building size={36} style={{ color: 'var(--mid)', marginBottom: '0.75rem' }} />
          <p style={{ color: 'var(--mid)' }}>No listings in this category.</p>
        </div>
      ) : isMobile ? (
        /* Mobile Card View */
        <div style={{ paddingBottom: '3rem' }}>
          {filtered.map((l) => (
            <div key={l.id} className="listing-mobile-card" style={{ opacity: busyId === l.id ? 0.5 : 1 }}>
              <div className="listing-card-header">
                <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                  <h3 className="listing-card-title">{l.title}</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--mid)', marginTop: '0.2rem' }}>
                    {[l.ward, l.district].filter(Boolean).join(', ')}
                  </div>
                </div>
                <span style={{
                  display: 'inline-block', borderRadius: 99, padding: '0.15rem 0.55rem',
                  fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                  color: accentFor(l.status), background: `${accentFor(l.status)}14`,
                }}>{l.status}</span>
              </div>

              <div className="listing-card-meta">
                <div className="meta-item">
                  <label>Price</label>
                  <value style={{ color: 'var(--jade)' }}>{TZSFormat(l.price_tzs)}</value>
                </div>
                <div className="meta-item">
                  <label>Lister</label>
                  <value>{l.lister_name}</value>
                </div>
                <div className="meta-item">
                  <label>Type</label>
                  <value>{l.room_type || 'Room'}</value>
                </div>
                <div className="meta-item">
                  <label>Posted</label>
                  <value>{formatDate(l.created_at)}</value>
                </div>
              </div>

              <div className="listing-card-actions">
                <Link to={`/listings/${l.id}`} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--small" style={{ flex: 0.5 }}>
                  <Eye size={14} />
                </Link>
                <button className="btn btn--ghost btn--small" onClick={() => handleInspect(l)} style={{ flex: 0.5, color: '#2563eb', background: '#e8f3ff' }}>
                  <AlertTriangle size={14} />
                </button>
                {l.status !== 'approved' && (
                  <button className="btn btn--small" onClick={() => moderate(l.id, 'approve')} disabled={busyId === l.id} style={{ background: 'var(--jade)', color: '#fff' }}>
                    Approve
                  </button>
                )}
                {l.status !== 'rejected' && (
                  <button className="btn btn--red btn--small" onClick={() => { const r = prompt('Rejection reason (optional):'); moderate(l.id, 'reject', r || undefined); }} disabled={busyId === l.id}>
                    Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop Table View */
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 780 }}>
            <thead>
              <tr style={{ background: 'var(--cream)' }}>
                {['Title', 'Location', 'Price', 'Type', 'Lister', 'Role', 'Status', 'Posted', 'Actions'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.55rem 0.75rem', fontWeight: 700, color: 'var(--mid)', fontSize: '0.72rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={l.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', opacity: busyId === l.id ? 0.5 : 1 }}>
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--mid)', whiteSpace: 'nowrap' }}>{[l.ward, l.district].filter(Boolean).join(', ')}</td>
                  <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap', color: 'var(--jade)', fontWeight: 600 }}>{TZSFormat(l.price_tzs)}/mo</td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--mid)' }}>{l.room_type || '—'}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.81rem' }}>{l.lister_name}</p>
                    <p style={{ color: 'var(--mid)', fontSize: '0.76rem' }}>{l.lister_phone}</p>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <span style={{
                      padding: '0.15rem 0.45rem',
                      background: l.lister_role === 'property_manager' ? '#f5f3ff' : '#eff6ff',
                      color: l.lister_role === 'property_manager' ? '#7c3aed' : '#3b82f6',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}>
                      {l.lister_role === 'property_manager' ? 'PROJECT MANAGER' : l.lister_role?.toUpperCase() || 'TENANT'}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <span style={{
                      display: 'inline-block', borderRadius: 99, padding: '0.15rem 0.55rem',
                      fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                      color: accentFor(l.status), background: `${accentFor(l.status)}14`,
                    }}>{l.status}</span>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--mid)', whiteSpace: 'nowrap' }}>{formatDate(l.created_at)}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'nowrap' }}>
                      <Link to={`/listings/${l.id}`} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', padding: '0.3rem 0.5rem', borderRadius: 6, background: 'var(--surface-2, #f5f5f5)', border: '1px solid var(--border)', color: 'var(--mid)' }}
                        title="View listing">
                        <Eye size={13} />
                      </Link>
                      <button onClick={() => handleInspect(l)} title="Inspect & photos"
                        style={{ display: 'inline-flex', alignItems: 'center', padding: '0.3rem 0.5rem', borderRadius: 6, background: '#e8f3ff', border: 'none', color: '#2563eb', cursor: 'pointer' }}>
                        <AlertTriangle size={13} />
                      </button>
                      {l.status !== 'approved' && (
                        <button onClick={() => moderate(l.id, 'approve')} disabled={busyId === l.id} title="Approve"
                          style={{ display: 'inline-flex', alignItems: 'center', padding: '0.3rem 0.5rem', borderRadius: 6, background: 'var(--jade-muted)', border: 'none', color: 'var(--jade)', cursor: 'pointer' }}>
                          <CheckCircle size={13} />
                        </button>
                      )}
                      {l.status !== 'rejected' && (
                        <button onClick={() => { const r = prompt('Rejection reason (optional):'); moderate(l.id, 'reject', r || undefined); }} disabled={busyId === l.id} title="Reject"
                          style={{ display: 'inline-flex', alignItems: 'center', padding: '0.3rem 0.5rem', borderRadius: 6, background: 'var(--red-light)', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>
                          <XCircle size={13} />
                        </button>
                      )}
                      {l.status !== 'flagged' ? (
                        <button onClick={() => moderate(l.id, 'flag')} disabled={busyId === l.id} title="Flag"
                          style={{ display: 'inline-flex', alignItems: 'center', padding: '0.3rem 0.5rem', borderRadius: 6, background: '#fff3e0', border: 'none', color: '#e67e22', cursor: 'pointer' }}>
                          <Flag size={13} />
                        </button>
                      ) : (
                        <button onClick={() => moderate(l.id, 'unflag')} disabled={busyId === l.id} title="Unflag"
                          style={{ display: 'inline-flex', alignItems: 'center', padding: '0.3rem 0.5rem', borderRadius: 6, background: 'var(--jade-muted)', border: 'none', color: 'var(--jade)', cursor: 'pointer' }}>
                          <Flag size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--mid)' }}>
        Showing {filtered.length} of {listings.length} listings
      </p>

      {/* Inspect Modal */}
      {inspectListing && (
        <div onClick={() => setInspectListing(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4rem 1rem 2rem',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 600,
            maxHeight: '80vh', overflow: 'auto', padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontFamily: " sans-serif", fontSize: '1rem' }}>Listing Inspection</h3>
              <button onClick={() => setInspectListing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', fontSize: '1.2rem' }}>✕</button>
            </div>

            {inspectLoading ? (
              <p style={{ color: 'var(--mid)' }}>Loading photos…</p>
            ) : (
              <>
                {inspectPhotos.length > 0 ? (
                  <>
                    <img src={inspectPhotos[inspectPhotoIdx]?.public_url} alt="listing" style={{ width: '100%', height: 240, objectFit: 'cover', borderRadius: 10, marginBottom: '0.5rem', display: 'block' }} />
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      {inspectPhotos.map((p, idx) => (
                        <div key={p.id} onClick={() => setInspectPhotoIdx(idx)} style={{ width: 64, height: 48, borderRadius: 6, overflow: 'hidden', border: idx === inspectPhotoIdx ? '2px solid var(--jade)' : '2px solid transparent', cursor: 'pointer' }}>
                          <img src={p.public_url} alt={p.angle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ background: '#fff3cd', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem', color: '#856404' }}>No photos for this listing.</div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                  {[
                    ['Title', inspectListing.title],
                    ['Status', inspectListing.status],
                    ['Type', inspectListing.room_type],
                    ['Price', `${TZSFormat(inspectListing.price_monthly)}/mo`],
                    ['Location', [inspectListing.ward, inspectListing.district].filter(Boolean).join(', ')],
                    ['Lister', inspectListing.lister_name],
                    ['Phone', inspectListing.lister_phone],
                    ['Posted', formatDate(inspectListing.created_at)],
                  ].map(([label, value]) => (
                    <div key={String(label)} style={{ padding: '0.5rem 0.65rem', border: '1px solid var(--border)', borderRadius: 8 }}>
                      <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--mid)' }}>{label}</p>
                      <strong style={{ fontSize: '0.86rem' }}>{value || '—'}</strong>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  {inspectListing.status !== 'approved' && (
                    <button className="btn btn--small" onClick={() => { moderate(inspectListing.id, 'approve'); setInspectListing(null); }}>
                      ✓ Approve
                    </button>
                  )}
                  {inspectListing.status !== 'rejected' && (
                    <button className="btn btn--small" style={{ background: 'var(--red)', color: '#fff' }} onClick={() => { const r = prompt('Rejection reason:'); moderate(inspectListing.id, 'reject', r || undefined); setInspectListing(null); }}>
                      ✕ Reject
                    </button>
                  )}
                  <button className="btn btn--ghost btn--small" onClick={() => setInspectListing(null)}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
