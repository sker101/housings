import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { selectRows, updateRows, insertRows, invokeFunction } from '../lib/supabase';

type Listing = {
  id: string;
  title: string;
  status: string;
  price_monthly: number;
  room_type?: string;
  district?: string;
  ward?: string;
  created_at?: string;
  lister_id?: string;
};

type Profile = {
  id: string;
  full_name?: string;
  role?: string;
  verification_status?: string;
  phone?: string;
  lister_type?: string;
  created_at?: string;
  avatar_url?: string;
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

function verificationPill(status: string) {
  const st = (status || 'pending').toLowerCase();
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: '#FEF3C7', color: '#92400E', label: 'Pending Verification' },
    verified: { bg: '#DCFCE7', color: '#166534', label: 'Verified' },
    rejected: { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' },
    unverified: { bg: '#F1F5F9', color: '#475569', label: 'Unverified' }
  };
  const s = styles[st] || styles.pending;
  return (
    <span style={{ padding: '0.2rem 0.65rem', borderRadius: 999, background: s.bg, color: s.color, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
      {s.label}
    </span>
  );
}

export default function AdminLandlordsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [listingsByLister, setListingsByLister] = useState<Record<string, Listing[]>>({});
  const [photosByListing, setPhotosByListing] = useState<Record<string, string[]>>({});
  
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [previewProfileId, setPreviewProfileId] = useState<string | null>(null);

  const loadData = async (initial = false) => {
    if (!token || sessionExpired) return;
    if (initial) setLoading(true);
    setError('');
    try {
      const listers = await selectRows('profiles', {
        select: 'id,full_name,role,verification_status,phone,lister_type,created_at,avatar_url',
        filters: [{ column: 'role', op: 'eq', value: 'lister' }],
        order: 'created_at.desc',
        accessToken: token
      });
      setAllProfiles(listers);

      if (listers.length > 0) {
        const ids = listers.map(l => l.id);
        const listings = await selectRows('listings', {
          select: 'id,title,status,price_monthly,room_type,district,ward,created_at,lister_id',
          filters: [{ column: 'lister_id', op: 'in', value: `(${ids.join(',')})` }],
          accessToken: token
        }).catch(() => []);

        const lMap: Record<string, Listing[]> = {};
        listings.forEach((l: any) => {
          if (!lMap[l.lister_id]) lMap[l.lister_id] = [];
          lMap[l.lister_id].push(l);
        });
        setListingsByLister(lMap);

        const listingIds = listings.map((l: any) => l.id);
        if (listingIds.length > 0) {
          const photos = await selectRows('listing_photos', {
            select: 'listing_id,url,position',
            filters: [{ column: 'listing_id', op: 'in', value: `(${listingIds.join(',')})` }],
            order: 'position.asc',
            accessToken: token
          }).catch(() => []);

          const pMap: Record<string, string[]> = {};
          photos.forEach((ph: any) => {
            if (!pMap[ph.listing_id]) pMap[ph.listing_id] = [];
            if (pMap[ph.listing_id].length < 4) pMap[ph.listing_id].push(ph.url);
          });
          setPhotosByListing(pMap);
        }
      }
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('jwt')) setSessionExpired(true);
      else setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    if (!token || sessionExpired) return;
    try {
      const rows = await selectRows('admin_notifications', {
        select: 'id,listing_id,poster_name,room_type,location,created_at,read_at',
        order: 'created_at.desc',
        limit: 10,
        accessToken: token
      }).catch(() => []);
      setNotifications(rows);
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('jwt')) setSessionExpired(true);
    }
  };

  useEffect(() => {
    loadData(true);
    loadNotifications();
    const t = setInterval(() => {
      if (!sessionExpired) {
        loadData(false);
        loadNotifications();
      }
    }, 30000);
    return () => clearInterval(t);
  }, [token, sessionExpired]);

  const filteredProfiles = useMemo(() => {
    if (activeTab === 'all') return allProfiles;
    return allProfiles.filter(p => (p.verification_status || 'pending').toLowerCase() === activeTab);
  }, [allProfiles, activeTab]);

  const counts = useMemo(() => {
    const base = { total: allProfiles.length, pending: 0, verified: 0, rejected: 0 };
    allProfiles.forEach(p => {
      const s = (p.verification_status || 'pending').toLowerCase();
      if (s === 'verified') base.verified++;
      else if (s === 'rejected') base.rejected++;
      else base.pending++;
    });
    return base;
  }, [allProfiles]);

  const handleApprove = async (id: string) => {
    if (!token) return;
    setActionLoading(id);
    try {
      const profile = allProfiles.find(p => p.id === id);
      await updateRows('profiles', { verification_status: 'verified' }, {
        filters: [{ column: 'id', op: 'eq', value: id }],
        accessToken: token
      });
      
      await insertRows('notifications', {
        user_id: id,
        type: 'system',
        title: 'Account Verified! ✅',
        body: 'Congratulations! Your dalali account has been verified.',
      }, { accessToken: token }).catch(() => null);

      if (profile?.phone) {
        await invokeFunction('send-sms', {
          to: profile.phone,
          message: `CampusStay TZ: Hello ${profile.full_name}, your dalali account has been officially verified!`
        }, token).catch(() => null);
      }

      setAllProfiles(prev => prev.map(p => p.id === id ? { ...p, verification_status: 'verified' } : p));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !token) return;
    const id = rejectTarget;
    setActionLoading(id);
    try {
      const profile = allProfiles.find(p => p.id === id);
      await updateRows('profiles', { verification_status: 'rejected' }, {
        filters: [{ column: 'id', op: 'eq', value: id }],
        accessToken: token
      });

      await insertRows('notifications', {
        user_id: id,
        type: 'system',
        title: 'Account Verification Declined',
        body: `Your account verification was declined. Reason: ${rejectReason}`,
      }, { accessToken: token }).catch(() => null);

      if (profile?.phone) {
        await invokeFunction('send-sms', {
          to: profile.phone,
          message: `CampusStay TZ: Sorry ${profile.full_name}, your account verification was declined. Reason: ${rejectReason}`
        }, token).catch(() => null);
      }

      setAllProfiles(prev => prev.map(p => p.id === id ? { ...p, verification_status: 'rejected' } : p));
      setRejectTarget(null);
      setRejectReason('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const previewProfile = useMemo(() => allProfiles.find(p => p.id === previewProfileId), [allProfiles, previewProfileId]);
  const previewListings = previewProfileId ? listingsByLister[previewProfileId] || [] : [];

  return (
    <div className="container section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>Vetting Dalalis</h1>
          <p className="muted" style={{ margin: 0 }}>Review and approve landlord/dalali accounts.</p>
        </div>
        <div style={{ position: 'relative' }}>
          <button type="button" className="btn btn--ghost" onClick={() => setNotifOpen(!notifOpen)}>🔔</button>
          {notifOpen && (
            <div className="card" style={{ position: 'absolute', right: 0, top: '100%', width: 280, zIndex: 100, padding: '0.5rem', maxHeight: 300, overflowY: 'auto' }}>
              <strong>Recent Activity</strong>
              {notifications.map(n => <div key={n.id} style={{ fontSize: '0.8rem', padding: '0.3rem 0' }}>{n.poster_name}: {n.room_type}</div>)}
            </div>
          )}
        </div>
      </header>

      {error && <p className="error-text">{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem' }}>
        <StatCard label="Total" value={counts.total} color="var(--ink)" />
        <StatCard label="Pending" value={counts.pending} color={AMBER} />
        <StatCard label="Verified" value={counts.verified} color={PRIMARY} />
        <StatCard label="Rejected" value={counts.rejected} color={RED} />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {(['pending', 'verified', 'rejected', 'all'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`btn ${activeTab === tab ? '' : 'btn--ghost'}`}
            style={{ borderRadius: 12, padding: '0.4rem 0.8rem', minWidth: 90, background: activeTab === tab ? PRIMARY : undefined, color: activeTab === tab ? '#fff' : undefined }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} ({tab === 'pending' ? counts.pending : tab === 'verified' ? counts.verified : tab === 'rejected' ? counts.rejected : counts.total})
          </button>
        ))}
      </div>

      {loading ? <p className="muted">Loading dalalis...</p> : (
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {filteredProfiles.map(p => (
            <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: PRIMARY }}>
                {(p.full_name || 'D')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem' }}>{p.full_name}</h3>
                  {verificationPill(p.verification_status || 'pending')}
                </div>
                <p style={{ margin: 0, color: 'var(--mid)', fontSize: '0.8rem' }}>{p.phone} • Joined {timeAgo(p.created_at)}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="btn btn--ghost btn--small" onClick={() => setPreviewProfileId(p.id)}>Inspect</button>
                {(p.verification_status || 'pending').toLowerCase() === 'pending' && (
                  <>
                    <button className="btn btn--ghost btn--small" style={{ color: RED }} onClick={() => setRejectTarget(p.id)}>Reject</button>
                    <button className="btn btn--small" style={{ background: PRIMARY, color: '#fff' }} onClick={() => handleApprove(p.id)} disabled={actionLoading === p.id}>
                      {actionLoading === p.id ? '...' : 'Approve'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {previewProfile && (
        <div className="sheet-backdrop" style={{ alignItems: 'center' }} onClick={() => setPreviewProfileId(null)}>
          <article className="sheet" style={{ maxWidth: 600, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Dalali Inspection</h2>
              <button className="btn btn--ghost" onClick={() => setPreviewProfileId(null)}>✕</button>
            </div>
            
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: 12, marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{previewProfile.full_name}</h3>
              <p style={{ margin: '0.4rem 0' }}><strong>Phone:</strong> {previewProfile.phone}</p>
              <p style={{ margin: 0 }}><strong>Type:</strong> {previewProfile.lister_type || 'Landlord'}</p>
              <div style={{ marginTop: '0.5rem' }}>{verificationPill(previewProfile.verification_status || 'pending')}</div>
            </div>

            <h4>Listings for Verification ({previewListings.length})</h4>
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {previewListings.map(l => (
                <div key={l.id} className="card" style={{ padding: '0.6rem', display: 'flex', gap: '0.8rem', border: '1px solid var(--border)' }}>
                   <div style={{ width: 60, height: 60, borderRadius: 6, background: 'var(--cream)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏡</div>
                   <div>
                     <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{l.title}</p>
                     <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--mid)' }}>{l.district}, {l.ward}</p>
                     <p style={{ margin: '0.2rem 0 0', fontWeight: 800, color: PRIMARY, fontSize: '0.85rem' }}>{fmtTZS(l.price_monthly)}</p>
                   </div>
                </div>
              ))}
              {previewListings.length === 0 && <p className="muted">No listings posted yet.</p>}
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
               <button className="btn btn--ghost" onClick={() => setPreviewProfileId(null)}>Close</button>
               {(previewProfile.verification_status || 'pending').toLowerCase() === 'pending' && (
                 <>
                   <button className="btn btn--ghost" style={{ color: RED }} onClick={() => { setRejectTarget(previewProfile.id); setPreviewProfileId(null); }}>Reject Account</button>
                   <button className="btn" style={{ background: PRIMARY, color: '#fff' }} onClick={() => { handleApprove(previewProfile.id); setPreviewProfileId(null); }}>Verify & Approve</button>
                 </>
               )}
            </div>
          </article>
        </div>
      )}

      {rejectTarget && (
        <div className="sheet-backdrop" style={{ alignItems: 'center' }} onClick={() => setRejectTarget(null)}>
          <article className="sheet" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3>Reject Dalali</h3>
            <p className="muted" style={{ fontSize: '0.9rem' }}>Reason for rejection (sent via SMS):</p>
            <textarea 
              style={{ width: '100%', minHeight: 80, padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border)', marginTop: '0.5rem' }}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Invalid documents, unreachable phone..."
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn--ghost" onClick={() => setRejectTarget(null)}>Cancel</button>
              <button className="btn" style={{ background: RED, color: '#fff' }} onClick={handleReject} disabled={!rejectReason.trim()}>Confirm Reject</button>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '0.8rem' }}>
      <p style={{ margin: 0, color: 'var(--mid)', fontSize: '0.75rem', fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '0.1rem 0 0', fontSize: '1.2rem', fontWeight: 800, color }}>{value}</p>
    </div>
  );
}
