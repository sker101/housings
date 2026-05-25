import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ChevronRight, Heart, LayoutGrid, Map as MapIcon, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchSavedListings, toggleSavedListing } from '../lib/listings';
import { listingToMapRoom } from '../lib/mapCoords';
import ListingCard from '../components/ListingCard';
import MapboxListingMap from '../components/MapboxListingMap';

type ViewMode = 'grid' | 'map';

export default function SavedListingsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadSaved() {
      if (!user?.userId || !token) { setItems([]); setLoading(false); return; }
      setLoading(true); setError('');
      try {
        const rows = await fetchSavedListings(user.userId, token);
        if (mounted) setItems(rows);
      } catch (err: any) {
        if (mounted) { 
          // If offline and fetching fails, we might just have empty items or cached items.
          // The error message will be shown, but we can make it friendlier if offline
          setError(isOffline ? 'You are currently offline. Displaying cached rooms if available.' : err.message); 
          setItems([]); 
        }
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
      setItems((prev) => prev.filter((item) => item.listing?.id !== listingId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRemoving((prev) => { const s = new Set(prev); s.delete(listingId); return s; });
    }
  };

  const listings = items.map((item) => item.listing).filter(Boolean);

  // Memoised map rooms — same stable coord system as SearchPage
  const mapRooms = useMemo(() =>
    listings
      .map(listingToMapRoom)
      .filter((r): r is NonNullable<typeof r> => r !== null),
      [listings]
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream, #f8fafc)', padding: '1rem' }}>

      {/* ── Breadcrumb ── */}
      <header style={{
        background: 'white', borderRadius: 12, padding: '0.85rem 1.25rem',
        marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid #e2e8f0',
            background: 'white',
            cursor: 'pointer',
            color: '#64748b',
            marginRight: '0.25rem',
            transition: 'all 0.2s',
            padding: 0
          }}
          title="Go Back"
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--jade, #22c55e)';
            e.currentTarget.style.color = 'var(--jade, #22c55e)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <Link
          to="/tenant/dashboard"
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', textDecoration: 'none' }}
        >
          <LayoutDashboard size={16} /> Dashboard
        </Link>
        <ChevronRight size={14} color="#cbd5e1" />
        <span style={{ fontWeight: 600, color: '#1e293b' }}>Saved Rooms</span>
      </header>

      {/* ── Offline Banner ── */}
      {isOffline && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e',
          padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500
        }}>
          <span style={{ fontSize: '1.2rem' }}>📶</span>
          You are currently offline. Viewing cached saved rooms.
        </div>
      )}

      {/* ── Title + view toggle ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Heart size={20} color="var(--jade, #22c55e)" />
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Saved Rooms</h1>
          {!loading && listings.length > 0 && (
            <span style={{
              background: 'var(--jade-muted, #e8f5ee)', color: 'var(--jade, #22c55e)',
              borderRadius: 999, fontSize: '0.78rem', fontWeight: 700, padding: '2px 10px',
            }}>
              {listings.length}
            </span>
          )}
        </div>

        {/* Grid / Map toggle */}
        {listings.length > 0 && (
          <div style={{
            display: 'flex', background: 'white', borderRadius: 10,
            border: '1px solid var(--border)', overflow: 'hidden',
          }}>
            {(['grid', 'map'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', border: 'none', cursor: 'pointer',
                  background: viewMode === mode ? 'var(--jade, #22c55e)' : 'transparent',
                  color: viewMode === mode ? '#fff' : 'var(--mid, #64748b)',
                  fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.18s',
                }}
              >
                {mode === 'grid' ? <LayoutGrid size={15} /> : <MapIcon size={15} />}
                {mode === 'grid' ? 'Grid' : 'Map'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <p style={{ color: 'var(--red, #e53e3e)', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="listing-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ borderRadius: 16, overflow: 'hidden', background: 'white', border: '1px solid var(--border, #e2e8f0)' }}>
              <div style={{ aspectRatio: '16/10', background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
              <div style={{ padding: '0.75rem' }}>
                <div style={{ height: 16, borderRadius: 6, background: '#f1f5f9', marginBottom: 8, width: '80%' }} />
                <div style={{ height: 12, borderRadius: 6, background: '#f1f5f9', width: '55%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
          <div style={{ width: 80, height: 80, margin: '0 auto 1.5rem', borderRadius: '50%', background: 'linear-gradient(135deg, #e5e7eb, #d1d5db)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={36} color="#94a3b8" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.6rem' }}>No saved rooms yet</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Browse listings and tap the heart icon to save rooms you like.</p>
          <Link to="/search" style={{ display: 'inline-block', background: 'var(--jade, #22c55e)', color: 'white', padding: '0.75rem 2rem', borderRadius: 12, fontWeight: 600, textDecoration: 'none' }}>
            Browse Rooms
          </Link>
        </div>
      ) : viewMode === 'map' ? (
        /* ── Map view ── */
        <div style={{ position: 'relative' }}>
          <MapboxListingMap
            rooms={mapRooms}
            height="calc(100vh - 220px)"
            onRoomClick={(id) => navigate(`/rooms/${id}`)}
          />
          <div style={{
            position: 'absolute', top: 12, right: 56, zIndex: 10,
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
            borderRadius: 20, padding: '6px 14px', fontSize: '0.82rem',
            fontWeight: 700, boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
            color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ color: '#22c55e' }}>●</span>
            {mapRooms.length} nyumba zilizohifadhiwa
          </div>
        </div>
      ) : (
        /* ── Grid view ── */
        <div className="listing-grid">
          {listings.map((listing) => (
            <div key={listing.id} style={{ position: 'relative' }}>
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
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)', transition: 'all 0.15s',
                  fontSize: 16, color: removing.has(listing.id) ? '#ef4444' : '#64748b', fontWeight: 700,
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
