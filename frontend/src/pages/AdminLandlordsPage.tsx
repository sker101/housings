import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { selectRows, updateRows, insertRows } from '../lib/supabase';

type Listing = {
  id: string;
  title: string;
  status: string;
  price_monthly: number;
  room_type?: string;
  district?: string;
  ward?: string;
  near_universities?: string[];
  created_at?: string;
  lister_id?: string;
  photos?: string[];
};

type Profile = {
  id: string;
  full_name?: string;
  role?: string;
  verification_status?: string;
  phone?: string;
};

type Notification = {
  id: string;
  listing_id: string;
  poster_name?: string;
  room_type?: string;
  location?: string;
  created_at?: string;
  read_at?: string | null;
};

const PRIMARY = '#1D9E75';
const AMBER = '#d97706';
const RED = '#b91c1c';

function fmtTZS(v?: number) {
  return `TZS ${Number(v || 0).toLocaleString('sw-TZ')}`;
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function statusPill(status: string) {
  const st = status?.toLowerCase() || 'pending';
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
    approved: { bg: '#DCFCE7', color: '#166534', label: 'Approved' },
    rejected: { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' }
  };
  const s = styles[st] || styles.pending;
  return (
    <span style={{ padding: '0.2rem 0.55rem', borderRadius: 999, background: s.bg, color: s.color, fontWeight: 700, fontSize: '0.82rem' }}>
      {s.label}
    </span>
  );
}

export default function AdminLandlordsPage() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [pendingListers, setPendingListers] = useState<Profile[]>([]);
  const [listerAction, setListerAction] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load listings + posters
  const loadData = async (initial = false) => {
    if (!token) return;
    if (initial) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const rows = await selectRows('listings', {
        select: 'id,title,status,price_monthly,room_type,district,ward,near_universities,created_at,lister_id',
        order: 'created_at.desc',
        accessToken: token
      });
      setListings(rows);
      const listerIds = Array.from(new Set(rows.map((r: any) => r.lister_id).filter(Boolean)));
      if (listerIds.length) {
        const profRows = await selectRows('profiles', {
          select: 'id,full_name,role,verification_status,phone',
          filters: [{ column: 'id', op: 'in', value: `(${listerIds.join(',')})` }],
          accessToken: token
        });
        const map: Record<string, Profile> = {};
        profRows.forEach((p: any) => { map[p.id] = p; });
        setProfiles(map);
      }
      const listingIds = rows.map((r: any) => r.id);
      if (listingIds.length) {
        const photoRows = await selectRows('listing_photos', {
          select: 'listing_id,url,position',
          filters: [{ column: 'listing_id', op: 'in', value: `(${listingIds.join(',')})` }],
          order: 'position.asc',
          accessToken: token
        }).catch(() => []);
        const thumbMap: Record<string, string> = {};
        (photoRows || []).forEach((p: any) => {
          if (!thumbMap[p.listing_id]) thumbMap[p.listing_id] = p.url;
        });
        setThumbnails(thumbMap);
      } else {
        setThumbnails({});
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPendingListers = async () => {
    if (!token) return;
    try {
      const rows = await selectRows('profiles', {
        select: 'id,full_name,role,verification_status,phone',
        filters: [
          { column: 'role', op: 'eq', value: 'lister' }
        ],
        order: 'created_at.desc',
        accessToken: token
      });
      const pending = rows.filter((p: any) => {
        const status = String(p.verification_status || '').toUpperCase();
        return status !== 'APPROVED';
      });
      setPendingListers(pending);
    } catch {
      // ignore
    }
  };

  // Load notifications
  const loadNotifications = async () => {
    if (!token) return;
    setNotifLoading(true);
    try {
      const rows = await selectRows('admin_notifications', {
        select: 'id,listing_id,poster_name,room_type,location,created_at,read_at',
        order: 'created_at.desc',
        limit: 20,
        accessToken: token
      }).catch(() => []);
      setNotifications(rows);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    loadPendingListers();
    loadNotifications();
    // Simple polling to emulate realtime
    const t = setInterval(() => {
      loadNotifications();
      loadData(false);
    }, 12000);
    return () => clearInterval(t);
  }, [token]);

  const filteredListings = useMemo(() => {
    if (activeTab === 'all') return listings;
    return listings.filter((l) => l.status === activeTab);
  }, [listings, activeTab]);

  const counts = useMemo(() => {
    const base = { total: listings.length, pending: 0, approved: 0, rejected: 0 };
    listings.forEach((l) => {
      base[l.status as 'pending' | 'approved' | 'rejected'] = (base as any)[l.status] + 1;
    });
    return base;
  }, [listings]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const handleApprove = async (id: string) => {
    if (!token) return;
    setActionLoading(id);
    try {
      await updateRows('listings', { status: 'approved' }, {
        filters: [{ column: 'id', op: 'eq', value: id }],
        accessToken: token
      });
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: 'approved' } : l));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !token) return;
    setActionLoading(rejectTarget);
    try {
      await updateRows('listings', { status: 'rejected', admin_notes: rejectReason }, {
        filters: [{ column: 'id', op: 'eq', value: rejectTarget }],
        accessToken: token
      });
      await insertRows('notifications', {
        user_id: profiles[listings.find((l) => l.id === rejectTarget)?.lister_id || '']?.id,
        title: 'Listing rejected',
        body: rejectReason || 'Your listing was rejected by admin.',
        type: 'system'
      }, { accessToken: token }).catch(() => undefined);
      setListings((prev) => prev.map((l) => l.id === rejectTarget ? { ...l, status: 'rejected' } : l));
      setRejectReason('');
      setRejectTarget(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveLister = async (id: string) => {
    if (!token) return;
    setListerAction(id);
    try {
      await updateRows('profiles', { verification_status: 'APPROVED' }, {
        filters: [{ column: 'id', op: 'eq', value: id }],
        accessToken: token
      });
      setPendingListers((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setListerAction(null);
    }
  };

  const handleRejectLister = async (id: string) => {
    if (!token) return;
    setListerAction(id);
    try {
      await updateRows('profiles', { verification_status: 'REJECTED' }, {
        filters: [{ column: 'id', op: 'eq', value: id }],
        accessToken: token
      });
      setPendingListers((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setListerAction(null);
    }
  };

  const markAllRead = async () => {
    if (!token) return;
    await updateRows('admin_notifications', { read_at: new Date().toISOString() }, { accessToken: token }).catch(() => undefined);
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
  };

  return (
    <div className="container section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>Listings approval</h1>
          {refreshing ? <p style={{ margin: 0, color: 'var(--mid)', fontSize: '0.85rem' }}>Refreshing…</p> : null}
        </div>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn btn--ghost"
            style={{ position: 'relative' }}
            onClick={() => setNotifOpen((p) => !p)}
          >
            🔔
            {unreadCount > 0 ? (
              <span style={{
                position: 'absolute', top: -4, right: -6, background: RED, color: '#fff',
                borderRadius: 999, padding: '0 6px', fontSize: '0.7rem', fontWeight: 700
              }}>
                {unreadCount}
              </span>
            ) : null}
          </button>
          {notifOpen ? (
            <div
              style={{
                position: 'absolute', right: 0, top: '110%',
                width: '320px', maxHeight: '360px', overflowY: 'auto',
                background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 12px 30px rgba(0,0,0,0.1)', zIndex: 10, padding: '0.6rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong>Recent activity</strong>
                <button type="button" className="btn btn--ghost btn--small" onClick={markAllRead}>Mark all read</button>
              </div>
              {notifLoading ? (
                <div style={{ height: 80, background: 'var(--cream)', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />
              ) : notifications.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>No notifications yet.</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} style={{ display: 'flex', gap: '0.6rem', padding: '0.45rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: n.read_at ? 'var(--border)' : PRIMARY, flexShrink: 0, marginTop: 6
                    }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700 }}>{n.poster_name || 'Lister'} • {n.room_type || 'Room'}</p>
                      <p style={{ margin: 0, color: 'var(--mid)', fontSize: '0.9rem' }}>{n.location || ''}</p>
                      <p style={{ margin: 0, color: 'var(--mid)', fontSize: '0.85rem' }}>{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </header>

      {error ? <p className="error-text">{error}</p> : null}

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
          gap: '0.75rem'
        }}
      >
        <StatCard label="Total listings" value={counts.total} color="var(--ink)" />
        <StatCard label="Pending review" value={counts.pending} color={AMBER} />
        <StatCard label="Approved" value={counts.approved} color={PRIMARY} />
        <StatCard label="Rejected" value={counts.rejected} color={RED} />
      </div>

      {/* Pending listers */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <strong>Pending dalali accounts</strong>
          <span className="muted">{pendingListers.length} awaiting approval</span>
        </div>
        {pendingListers.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No pending accounts.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {pendingListers.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: 10 }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <Avatar name={p.full_name || 'Dalali'} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 700 }}>{p.full_name || 'Dalali'}</p>
                    <p style={{ margin: 0, color: 'var(--mid)', fontSize: '0.9rem' }}>{p.phone || ''}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => handleRejectLister(p.id)} disabled={listerAction === p.id}>Reject</button>
                  <button type="button" className="btn btn--small" style={{ background: PRIMARY, color: '#fff' }} onClick={() => handleApproveLister(p.id)} disabled={listerAction === p.id}>
                    {listerAction === p.id ? 'Saving...' : 'Approve'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: 10,
              border: `1px solid ${activeTab === tab ? PRIMARY : 'var(--border)'}`,
              background: activeTab === tab ? PRIMARY : '#fff',
              color: activeTab === tab ? '#fff' : 'var(--ink)',
              fontWeight: 700,
              minWidth: 120
            }}
          >
            {tab === 'pending' ? 'Pending' : tab === 'approved' ? 'Approved' : tab === 'rejected' ? 'Rejected' : 'All listings'} ({tab === 'pending' ? counts.pending : tab === 'approved' ? counts.approved : tab === 'rejected' ? counts.rejected : counts.total})
          </button>
        ))}
      </div>

      {/* Listings */}
      {loading ? (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 140, borderRadius: 12, background: 'var(--cream)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="card" style={{ padding: '1.2rem', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--mid)' }}>No listings here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {filteredListings.map((l) => {
            const poster = profiles[l.lister_id || ''] || {};
            const thumb = Array.isArray(l.photos) && l.photos.length ? l.photos[0] : 'https://placehold.co/160x120/1D9E75/ffffff?text=Room';
            return (
              <div key={l.id} className="card" style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.8rem', padding: '0.9rem', alignItems: 'center' }}>
                <div style={{ width: '100%', height: 120, overflow: 'hidden', borderRadius: 10, background: '#f4f6f5' }}>
                  <img src={thumb} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{l.title}</h3>
                    {statusPill(l.status)}
                  </div>
                  <p style={{ margin: 0, color: 'var(--mid)' }}>
                    {l.ward || l.district || 'Location'} {l.near_universities?.length ? `• ${l.near_universities[0]} nearby` : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: PRIMARY }}>{fmtTZS(l.price_monthly)}/mo</span>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: 999, background: '#eef6f3', color: '#1f5a45', fontWeight: 700 }}>{l.room_type || 'Room'}</span>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <Avatar name={poster.full_name || 'Lister'} />
                      <div>
                        <p style={{ margin: 0, fontWeight: 700 }}>{poster.full_name || 'Lister'}</p>
                        <p style={{ margin: 0, color: 'var(--mid)', fontSize: '0.9rem' }}>
                          {poster.verification_status === 'APPROVED' ? 'Verified dalali' : (poster.role || 'Landlord')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <p style={{ margin: 0, color: 'var(--mid)' }}>{timeAgo(l.created_at)}</p>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <Link to={`/rooms/${l.id}`} className="btn btn--ghost btn--small">View</Link>
                      {l.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            className="btn btn--ghost btn--small"
                            onClick={() => { setRejectTarget(l.id); setRejectReason(''); }}
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            className="btn btn--small"
                            style={{ background: PRIMARY, color: '#fff' }}
                            onClick={() => handleApprove(l.id)}
                            disabled={actionLoading === l.id}
                          >
                            {actionLoading === l.id ? 'Saving...' : 'Approve'}
                          </button>
                        </>
                      ) : l.status === 'approved' ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          onClick={() => { setRejectTarget(l.id); setRejectReason('Policy violation'); }}
                        >
                          Revoke
                        </button>
                      ) : (
                        <span style={{ color: 'var(--mid)', fontSize: '0.9rem' }}>{l.admin_notes || 'Rejected'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rejectTarget ? (
        <div className="sheet-backdrop" role="presentation" onClick={() => setRejectTarget(null)} style={{ alignItems: 'center' }}>
          <article
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Reject listing"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420 }}
          >
            <h3>Reject listing</h3>
            <p className="muted">Add a short reason. The lister will be notified.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '0.6rem' }}
              placeholder="Reason for rejection"
            />
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.8rem' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setRejectTarget(null)}>Cancel</button>
              <button type="button" className="btn" style={{ background: RED, color: '#fff' }} onClick={handleReject} disabled={actionLoading === rejectTarget || !rejectReason.trim()}>
                {actionLoading === rejectTarget ? 'Saving...' : 'Reject'}
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '0.9rem' }}>
      <p style={{ margin: 0, color: 'var(--mid)', fontSize: '0.9rem' }}>{label}</p>
      <p style={{ margin: '0.1rem 0 0', fontSize: '1.4rem', fontWeight: 800, color }}>{value}</p>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'L';
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: '#eef6f3', color: PRIMARY,
      fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {initials}
    </div>
  );
}
