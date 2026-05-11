import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, ChevronRight, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchSavedListings, toggleSavedListing } from '../lib/listings';
import ListingCard from '../components/ListingCard';

export default function SavedListingsPage() {
  const { user, token } = useAuth();
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    async function loadSaved() {
      if (!user?.userId || !token) { setItems([]); setLoading(false); return; }
      setLoading(true); setError('');
      try {
        const rows = await fetchSavedListings(user.userId, token);
        if (mounted) setItems(rows);
      } catch (err: any) {
        if (mounted) { setError(err.message); setItems([]); }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadSaved();
    return () => { mounted = false; };
  }, [user?.userId, token]);

  const handleRemove = async (listingId: string) => {
    if (!user?.userId || !token || removing.has(listingId)) return;
    setRemoving((prev) => new Set(prev).add(listingId));
    try {
      await toggleSavedListing({ tenantId: user.userId, listingId, accessToken: token });
      // Optimistically remove from list
      setItems((prev) => prev.filter((item) => item.listing?.id !== listingId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRemoving((prev) => { const s = new Set(prev); s.delete(listingId); return s; });
    }
  };

  const listings = items.map((item) => item.listing).filter(Boolean);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream, #f8fafc)', padding: '1rem' }}>

      {/* ── Breadcrumb ── */}
      <header style={{
        background: 'white', borderRadius: 12, padding: '0.85rem 1.25rem',
        marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem',
      }}>
        <Link
          to="/tenant/dashboard"
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', textDecoration: 'none' }}
        >
          <LayoutDashboard size={16} /> Dashboard
        </Link>
        <ChevronRight size={14} color="#cbd5e1" />
        <span style={{ fontWeight: 600, color: '#1e293b' }}>Saved Rooms</span>
      </header>

      {/* ── Page title ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <Heart size={20} color="var(--jade, #22c55e)" />
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Saved Rooms</h1>
        {!loading && listings.length > 0 && (
          <span style={{
            background: 'var(--jade-muted, #e8f5ee)', color: 'var(--jade, #22c55e)',
            borderRadius: 999, fontSize: '0.78rem', fontWeight: 700,
            padding: '2px 10px',
          }}>
            {listings.length}
          </span>
        )}
      </div>

      {/* ── States ── */}
      {error && (
        <p style={{ color: 'var(--red, #e53e3e)', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      {loading ? (
        <div className="listing-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              borderRadius: 16, overflow: 'hidden', background: 'white',
              border: '1px solid var(--border, #e2e8f0)',
            }}>
              <div style={{
                aspectRatio: '16/10', background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
                backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
              }} />
              <div style={{ padding: '0.75rem' }}>
                <div style={{ height: 16, borderRadius: 6, background: '#f1f5f9', marginBottom: 8, width: '80%' }} />
                <div style={{ height: 12, borderRadius: 6, background: '#f1f5f9', width: '55%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
          <div style={{
            width: 80, height: 80, margin: '0 auto 1.5rem', borderRadius: '50%',
            background: 'linear-gradient(135deg, #e5e7eb, #d1d5db)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Heart size={36} color="#94a3b8" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.6rem' }}>No saved rooms yet</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            Browse listings and tap the heart icon to save rooms you like.
          </p>
          <Link to="/search" style={{
            display: 'inline-block', background: 'var(--jade, #22c55e)', color: 'white',
            padding: '0.75rem 2rem', borderRadius: 12, fontWeight: 600, textDecoration: 'none',
          }}>
            Browse Rooms
          </Link>
        </div>
      ) : (
        <div className="listing-grid">
          {listings.map((listing) => (
            <div key={listing.id} style={{ position: 'relative' }}>
              {/* Unsave button overlaid top-right */}
              <button
                aria-label="Remove from saved"
                disabled={removing.has(listing.id)}
                onClick={() => handleRemove(listing.id)}
                style={{
                  position: 'absolute', top: 10, right: 10, zIndex: 20,
                  width: 32, height: 32, borderRadius: '50%',
                  background: removing.has(listing.id) ? '#fee2e2' : 'rgba(255,255,255,0.95)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: removing.has(listing.id) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                  transition: 'all 0.15s',
                  fontSize: 16, color: removing.has(listing.id) ? '#ef4444' : '#64748b',
                  fontWeight: 700,
                }}
                title="Remove from saved"
              >
                {removing.has(listing.id) ? '…' : '✕'}
              </button>
              <ListingCard listing={listing} />
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
