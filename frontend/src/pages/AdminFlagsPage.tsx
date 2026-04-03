import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { selectRows, updateRows, countRows } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, AlertCircle, Loader, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

type FlagFilter = 'flagged' | 'approved' | 'rejected';

export default function AdminFlagsPage() {
  const { token } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FlagFilter>('flagged');
  const [counts, setCounts] = useState({ flagged: 0, approved: 0, rejected: 0 });
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    loadListings();
    loadCounts();
  }, [filter, token]);

  const loadCounts = async () => {
    if (!token) return;
    try {
      const [flagged, approved, rejected] = await Promise.all([
        countRows('listings', { filters: [{ column: 'status', op: 'eq', value: 'flagged' }], accessToken: token }),
        countRows('listings', { filters: [{ column: 'status', op: 'eq', value: 'approved' }], accessToken: token }),
        countRows('listings', { filters: [{ column: 'status', op: 'eq', value: 'rejected' }], accessToken: token }),
      ]);
      setCounts({ flagged, approved, rejected });
    } catch (err) {
      console.error('Failed to load counts:', err);
    }
  };

  const loadListings = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const rows = await selectRows('listings', {
        select: 'id,title,status,district,region,price_monthly,room_type,lister_id,created_at',
        filters: [{ column: 'status', op: 'eq', value: filter }],
        order: 'created_at.desc',
        limit: 100,
        accessToken: token,
      });

      if (rows.length === 0) { setListings([]); setIsLoading(false); return; }

      // Enrich with lister name
      const listerIds = [...new Set(rows.map((r: any) => r.lister_id))];
      const listers = await selectRows('profiles', {
        select: 'id,full_name,phone',
        filters: [{ column: 'id', op: 'in', value: `(${listerIds.join(',')})` }],
        accessToken: token,
      }).catch(() => []);
      const listerMap = new Map(listers.map((l: any) => [l.id, l]));

      // Load reports counts for each listing
      const listingIds = rows.map((r: any) => r.id);
      const reports = await selectRows('listing_reports', {
        select: 'listing_id,status',
        filters: [{ column: 'listing_id', op: 'in', value: `(${listingIds.join(',')})` }],
        accessToken: token,
      }).catch(() => []);

      const reportCounts: Record<string, number> = {};
      reports.forEach((r: any) => {
        reportCounts[r.listing_id] = (reportCounts[r.listing_id] || 0) + 1;
      });

      setListings(rows.map((r: any) => ({
        ...r,
        lister: listerMap.get(r.lister_id),
        reportCount: reportCounts[r.id] || 0,
      })));
    } catch (err) {
      toast.error('Failed to load flagged content');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const setListingStatus = async (listingId: string, status: string) => {
    setActingId(listingId);
    try {
      await updateRows('listings', { status }, {
        filters: [{ column: 'id', op: 'eq', value: listingId }],
        accessToken: token,
      });
      toast.success(status === 'approved' ? 'Listing approved & restored' : 'Listing rejected');
      loadListings();
      loadCounts();
    } catch {
      toast.error('Failed to update listing status');
    } finally {
      setActingId(null);
    }
  };

  const filterTabs: { id: FlagFilter; label: string; color: string }[] = [
    { id: 'flagged', label: '🚩 Flagged', color: '#f59e0b' },
    { id: 'approved', label: '✅ Approved', color: '#10b981' },
    { id: 'rejected', label: '❌ Rejected', color: '#ef4444' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>Flagged Content</h1>
        <p style={{ color: '#6b7280' }}>Review flagged listings and take moderation action</p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {filterTabs.map((t) => (
          <div key={t.id} style={{ background: '#fff', border: `2px solid ${filter === t.id ? t.color : '#e5e7eb'}`, borderRadius: '8px', padding: '1rem 1.25rem', cursor: 'pointer', transition: 'all 0.15s' }}
            onClick={() => setFilter(t.id)}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.label}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 800, color: t.color, lineHeight: 1 }}>{counts[t.id]}</p>
          </div>
        ))}
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <Loader size={32} style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
          Loading listings...
        </div>
      )}

      {!isLoading && listings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#f9fafb', borderRadius: '8px', color: '#6b7280' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          No {filter} listings found
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {listings.map((listing: any) => (
          <div key={listing.id} style={{
            background: '#fff',
            border: listing.status === 'flagged' ? '2px solid #f59e0b' : '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1.5rem',
            display: 'flex',
            gap: '1.5rem',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                  <Link to={`/rooms/${listing.id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1f2937', textDecoration: 'none' }}>
                    {listing.title}
                  </Link>
                </h3>
                {listing.reportCount > 0 && (
                  <span style={{ background: '#fef3c7', color: '#d97706', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '999px' }}>
                    {listing.reportCount} report{listing.reportCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.88rem' }}>
                {listing.room_type} · {listing.district}, {listing.region} ·{' '}
                <strong>TZS {Number(listing.price_monthly).toLocaleString()}/mo</strong>
              </p>
              <p style={{ margin: '0.3rem 0 0', color: '#9ca3af', fontSize: '0.8rem' }}>
                Lister: {listing.lister?.full_name || 'Unknown'} ({listing.lister?.phone || '—'}) ·{' '}
                Listed {listing.created_at ? new Date(listing.created_at).toLocaleDateString() : '—'}
              </p>
            </div>

            {listing.status === 'flagged' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                <button
                  onClick={() => setListingStatus(listing.id, 'approved')}
                  disabled={actingId === listing.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', opacity: actingId === listing.id ? 0.6 : 1 }}
                >
                  <CheckCircle size={15} />
                  {actingId === listing.id ? '…' : 'Approve'}
                </button>
                <button
                  onClick={() => setListingStatus(listing.id, 'rejected')}
                  disabled={actingId === listing.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', opacity: actingId === listing.id ? 0.6 : 1 }}
                >
                  <XCircle size={15} />
                  {actingId === listing.id ? '…' : 'Reject'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
