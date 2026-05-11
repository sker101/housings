import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MapboxListingMap from '../components/MapboxListingMap';
import { useAuth } from '../context/AuthContext';

import {
  fetchApprovedListings,
  fetchSavedListingIds,
  toggleSavedListing
} from '../lib/listings';
import { TZSFormat } from '../utils/format';
import {
  Search, Users, Bed, Bath, Wifi, Car, Droplets, Utensils,
  Dumbbell, Shirt, Shield, Snowflake, Flame, Waves, SlidersHorizontal,
  X, Heart, ChevronLeft, ChevronRight, Map as MapIcon, Grid3X3,
  LayoutDashboard, MapPin, Star
} from 'lucide-react';

// University options
const UNIVERSITY_OPTIONS = [
  { value: 'UDSM', label: 'UDSM', lat: -6.7798, lng: 39.2045 },
  { value: 'Ardhi', label: 'Ardhi', lat: -6.7720, lng: 39.2274 },
  { value: 'Muhimbili', label: 'Muhimbili', lat: -6.8041, lng: 39.2745 },
  { value: 'SUA', label: 'SUA', lat: -6.8480, lng: 37.6443 }
];

// Room type options with icons
const ROOM_TYPE_OPTIONS = [
  { value: 'all', label: 'All types', icon: Bed },
  { value: 'single', label: 'Single room', icon: Bed },
  { value: 'shared', label: 'Shared room', icon: Users },
  { value: 'bedsit', label: 'Bedsit', icon: Bed },
  { value: 'studio', label: 'Studio', icon: Bed },
  { value: 'apartment', label: 'Apartment', icon: Bath },
  { value: 'self_contained', label: 'Self contained', icon: Bath },
  { value: '1_bedroom', label: '1 Bedroom', icon: Bed },
  { value: '2_bedroom', label: '2 Bedroom', icon: Bed },
];

// Amenity options with icons
const AMENITY_OPTIONS = [
  { value: 'wifi', label: 'WiFi', icon: Wifi },
  { value: 'parking', label: 'Parking', icon: Car },
  { value: 'water', label: 'Water tank', icon: Droplets },
  { value: 'kitchen', label: 'Kitchen', icon: Utensils },
  { value: 'gym', label: 'Gym', icon: Dumbbell },
  { value: 'laundry', label: 'Laundry', icon: Shirt },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'ac', label: 'AC', icon: Snowflake },
  { value: 'generator', label: 'Generator', icon: Flame },
  { value: 'pool', label: 'Pool', icon: Waves },
];

// Price ranges
const PRICE_RANGES = [
  { min: 0, max: 100000, label: 'Under 100K' },
  { min: 100000, max: 200000, label: '100K - 200K' },
  { min: 200000, max: 350000, label: '200K - 350K' },
  { min: 350000, max: 500000, label: '350K - 500K' },
  { min: 500000, max: null, label: '500K+' },
];

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const PAGE_SIZE = 24;

// Search Page Styles - defined here to be available in component
const searchPageStyles = `
  .search-header {
    background: white;
    border-radius: 12px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.25rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .search-breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .search-breadcrumb-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    color: #64748b;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .search-breadcrumb-item:active {
    color: #22c55e;
  }

  .search-breadcrumb-separator {
    color: #cbd5e1;
  }

  .search-breadcrumb-current {
    color: #1e293b;
    font-weight: 600;
  }

  .view-toggle {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: #f1f5f9;
    padding: 0.25rem;
    border-radius: 10px;
  }

  .view-toggle-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .view-toggle-btn.is-active {
    background: white;
    color: #22c55e;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .view-toggle-btn:active {
    transform: scale(0.96);
  }

  /* Responsive */
  @media (max-width: 640px) {
    .search-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .view-toggle {
      align-self: stretch;
      justify-content: center;
    }

    .view-toggle-btn {
      flex: 1;
      justify-content: center;
    }
  }
`;

// Room Card Component - matches homepage style
interface RoomCardProps {
  listing: any;
  savedIds: Set<string>;
  imageIndexes: Record<string, number>;
  onToggleSave: (id: string, e: React.MouseEvent) => void;
  onNextImage: (id: string, total: number) => void;
  onPrevImage: (id: string, total: number) => void;
  onClick: () => void;
}

function RoomCard({ listing, savedIds, imageIndexes, onToggleSave, onNextImage, onPrevImage, onClick }: RoomCardProps) {
  const photos = listing.photos || listing.photo_urls || [];
  const currentImageIndex = imageIndexes[listing.id] || 0;

  // Get image URL from various possible sources
  const getImageUrl = () => {
    // First try photos array
    if (photos.length > 0) {
      const photo = photos[currentImageIndex];
      if (typeof photo === 'string') return photo;
      if (photo?.public_url) return photo.public_url;
      if (photo?.url) return photo.url;
      if (photo?.image_url) return photo.image_url;
    }
    // Then try primary image fields
    if (listing.primaryImage) return listing.primaryImage;
    if (listing.primary_image) return listing.primary_image;
    if (listing.imageUrl) return listing.imageUrl;
    if (listing.image_url) return listing.image_url;
    if (listing.thumbnail) return listing.thumbnail;
    // Fallback to placeholder
    return '/placeholder-room.jpg';
  };

  const currentImage = getImageUrl();
  const isSaved = savedIds.has(listing.id);

  return (
    <div className="room-card" onClick={onClick}>
      <div className="room-card__image-wrapper">
        <img
          src={currentImage}
          alt={listing.title}
          className="room-card__image"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-room.jpg';
          }}
        />

        {listing.featured && (
          <span className="room-card__badge room-card__badge--featured">Featured</span>
        )}

        <button
          className={`room-card__save-btn ${isSaved ? 'is-saved' : ''}`}
          onClick={(e) => onToggleSave(listing.id, e)}
        >
          <Heart size={22} fill={isSaved ? '#ef4444' : 'none'} color={isSaved ? '#ef4444' : 'white'} />
        </button>

        {photos.length > 1 && (
          <>
            <button
              className="room-card__nav-btn room-card__nav-btn--prev"
              onClick={(e) => { e.stopPropagation(); onPrevImage(listing.id, photos.length); }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="room-card__nav-btn room-card__nav-btn--next"
              onClick={(e) => { e.stopPropagation(); onNextImage(listing.id, photos.length); }}
            >
              <ChevronRight size={18} />
            </button>
            <div className="room-card__dots">
              {photos.map((_, idx) => (
                <span key={idx} className={`room-card__dot ${idx === currentImageIndex ? 'is-active' : ''}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="room-card__content" style={{ padding: '0.15rem 0.25rem 0.4rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <h3 style={{ margin: '0', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
            {listing.title}
          </h3>
          {listing.rating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
              <Star size={14} fill="#f59e0b" color="#f59e0b" />
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{listing.rating}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.8rem' }}>
          <MapPin size={14} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{listing.location}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.75rem' }}>
          <Bed size={14} />
          <span>{listing.roomType || 'Room'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginTop: '0.15rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#22c55e' }}>
            {TZSFormat(listing.priceMonthly)}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/month</span>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const { t } = useTranslation();

  // Filter states - matching homepage style
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedRoomType, setSelectedRoomType] = useState('all');
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<{min: number, max: number | null} | null>(null);
  const [selectedPropertyType, setSelectedPropertyType] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [furnished, setFurnished] = useState(false);
  const [utilitiesIncluded, setUtilitiesIncluded] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [listings, setListings] = useState([]);
  // Mapbox viewport bounds for viewport-sync filtering
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const loadMoreRef = useRef(null);

  // Saved listings state
  const { user, isAuthenticated } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});

  // Load saved listing IDs
  useEffect(() => {
    let mounted = true;
    async function loadSavedIds() {
      if (!user?.userId || !token) {
        setSavedIds(new Set());
        return;
      }
      try {
        const ids = await fetchSavedListingIds(user.userId, token);
        if (mounted) setSavedIds(new Set(ids));
      } catch {
        if (mounted) setSavedIds(new Set());
      }
    }
    loadSavedIds();
    return () => { mounted = false; };
  }, [user?.userId, token]);

  // Handle toggle save
  const handleToggleSave = useCallback(async (listingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated || !user?.userId) {
      navigate('/login');
      return;
    }
    try {
      const nextSaved = await toggleSavedListing({
        tenantId: user.userId,
        listingId,
        accessToken: token
      });
      setSavedIds(prev => {
        const next = new Set(prev);
        if (nextSaved) next.add(listingId);
        else next.delete(listingId);
        return next;
      });
    } catch (err: any) {
      setError(err.message);
    }
  }, [isAuthenticated, user?.userId, token, navigate]);

  // Image navigation
  const nextImage = useCallback((listingId: string, totalPhotos: number) => {
    setImageIndexes(prev => ({
      ...prev,
      [listingId]: ((prev[listingId] || 0) + 1) % totalPhotos
    }));
  }, []);

  const prevImage = useCallback((listingId: string, totalPhotos: number) => {
    setImageIndexes(prev => ({
      ...prev,
      [listingId]: ((prev[listingId] || 0) - 1 + totalPhotos) % totalPhotos
    }));
  }, []);

  // Build filters object for API call
  const buildFilters = useCallback(() => {
    const filters: Record<string, any> = {
      limit: PAGE_SIZE,
      offset: 0,
      sort: 'newest'
    };

    if (searchQuery.trim()) filters.query = searchQuery.trim();
    if (selectedRoomType && selectedRoomType !== 'all') filters.roomType = selectedRoomType;
    // Note: Gender filter removed - database view hardcodes gender as 'mixed'
    if (selectedPriceRange) {
      filters.minPrice = selectedPriceRange.min;
      if (selectedPriceRange.max) filters.maxPrice = selectedPriceRange.max;
    }
    if (selectedUniversity) filters.university = selectedUniversity;
    if (selectedPropertyType) filters.propertyType = selectedPropertyType;
    if (furnished) filters.furnished = true;
    if (utilitiesIncluded) filters.utilitiesIncluded = true;
    if (selectedAmenities.length > 0) filters.amenities = selectedAmenities;

    return filters;
  }, [searchQuery, selectedRoomType, selectedPriceRange, selectedUniversity, selectedPropertyType, furnished, utilitiesIncluded, selectedAmenities]);

  const runSearch = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else {
        setLoading(true);
        setPage(1);
      }
      setError('');

      const filters = buildFilters();
      if (isLoadMore) {
        filters.offset = page * PAGE_SIZE;
      }

      const results = await fetchApprovedListings(filters, token);

      if (isLoadMore) {
        setListings(prev => [...prev, ...results]);
        setPage(prev => prev + 1);
      } else {
        setListings(results);
      }

      setHasMore(results.length === PAGE_SIZE);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to fetch listings');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildFilters, token, page]);

  // Initial search and filter changes
  useEffect(() => {
    runSearch();
  }, [searchQuery, selectedRoomType, selectedUniversity, selectedAmenities, selectedPriceRange, selectedPropertyType, furnished, utilitiesIncluded]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading && !loadingMore) {
      runSearch(true);
    }
  }, [hasMore, loading, loadingMore, runSearch]);

  useEffect(() => {
    if (viewMode !== 'list' || loading || loadingMore || !hasMore) {
      return undefined;
    }

    const node = loadMoreRef.current;
    if (!node) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '220px' }
    );

    const target = node;
    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore, loading, loadingMore, viewMode]);

  const resultCountLabel = useMemo(() => {
    if (loading) {
      return t('search.searching');
    }

    return listings.length === 1
      ? t('search.showingResults', { count: listings.length })
      : t('search.showingResultsPlural', { count: listings.length });
  }, [loading, listings.length, t]);

  const processedListings = useMemo(() => {
    let result = [...listings];

    // University proximity calculation
    if (selectedUniversity) {
      const uni = UNIVERSITY_OPTIONS.find(u => u.value === selectedUniversity);
      if (uni) {
        result = result.map(l => {
          if (!l.lat || !l.lng) return l;
          const dist = getDistanceKm(uni.lat, uni.lng, Number(l.lat), Number(l.lng));
          return { ...l, distanceKm: dist, distanceStr: `${dist.toFixed(1)} km from ${uni.label}` };
        });
        // Sort by distance automatically
        result.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
      }
    }

    return result;
  }, [listings, selectedUniversity]);

  // Ward → approx coordinates for listings that have no lat/lng
  const WARD_COORDS: Record<string, [number, number]> = {
    msasani: [39.2713, -6.7575], masaki: [39.2698, -6.7608], upanga: [39.2850, -6.8097],
    kariakoo: [39.2726, -6.8162], ilala: [39.2710, -6.8235], kinondoni: [39.2570, -6.7808],
    temeke: [39.3140, -6.8727], mikocheni: [39.2680, -6.7720], mbezi: [39.1950, -6.7300],
    kijitonyama: [39.2530, -6.7890], sinza: [39.2290, -6.8050], mwananyamala: [39.2390, -6.8030],
    manzese: [39.2150, -6.8200], tandale: [39.2440, -6.7900], magomeni: [39.2610, -6.8000],
    jangwani: [39.2780, -6.8100], kivukoni: [39.2922, -6.8183], gerezani: [39.2905, -6.8172],
    kisutu: [39.2873, -6.8206], posta: [39.2891, -6.8193], buguruni: [39.2430, -6.8410],
    vingunguti: [39.2330, -6.8580], changombe: [39.2720, -6.8650], mtoni: [39.2990, -6.8850],
    mbagala: [39.3060, -6.9060], changanyikeni: [39.2520, -6.8450], mwenge: [39.2600, -6.7830],
    moroco: [39.2580, -6.7950], barabara_ya_mzinga: [39.2800, -6.8300], tabata: [39.2450, -6.8500],
    dar_es_salaam: [39.2766, -6.8235],
  };

  function getApproxCoords(listing: any): { lat: number; lng: number } | null {
    if (listing.lat && listing.lng) return { lat: Number(listing.lat), lng: Number(listing.lng) };
    const ward = (listing.ward || listing.district || '').toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
    const coords = WARD_COORDS[ward];
    if (coords) return { lat: coords[1], lng: coords[0] };
    // Try partial match
    const match = Object.keys(WARD_COORDS).find(k => ward.includes(k) || k.includes(ward));
    if (match) return { lat: WARD_COORDS[match][1], lng: WARD_COORDS[match][0] };
    return null;
  }

  // All listings with coordinates (real or ward-approximated)
  const mapListings = useMemo(() => {
    return processedListings
      .map((l: any) => ({ ...l, _coords: getApproxCoords(l) }))
      .filter((l: any) => l._coords !== null);
  }, [processedListings]);

  // Stable memoized array for Mapbox markers to prevent flicker
  const mapRooms = useMemo(() => {
    return mapListings.map((l: any) => ({
      id: l.id,
      latitude: l._coords.lat,
      longitude: l._coords.lng,
      title: l.title,
      price_tzs: Number(l.priceMonthly),
      availability_status: l.vacancyStatus || 'available',
      ward: l.ward || l.district || l.location || '',
    }));
  }, [mapListings]);

  // Viewport-synced subset — only rooms visible in current map bounds
  const viewportListings = useMemo(() => {
    if (!mapBounds) return mapListings;
    return mapListings.filter((l: any) => {
      const lat = l._coords?.lat ?? Number(l.lat);
      const lng = l._coords?.lng ?? Number(l.lng);
      return (
        lat >= mapBounds.south && lat <= mapBounds.north &&
        lng >= mapBounds.west  && lng <= mapBounds.east
      );
    });
  }, [mapListings, mapBounds]);


  const handleBoundsChange = useCallback(
    (bounds: { north: number; south: number; east: number; west: number }) => {
      setMapBounds(bounds);
    },
    []
  );

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedRoomType('all');
    setSelectedUniversity('');
    setSelectedAmenities([]);
    setSelectedPriceRange(null);
    setSelectedPropertyType('');
    setFurnished(false);
    setUtilitiesIncluded(false);
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const activeFiltersCount = selectedAmenities.length +
    (selectedUniversity ? 1 : 0) +
    (selectedPriceRange ? 1 : 0) +
    (selectedPropertyType ? 1 : 0) +
    (furnished ? 1 : 0) +
    (utilitiesIncluded ? 1 : 0);

  return (
    <div className="container section" style={{ padding: '1rem' }}>
      <style>{searchPageStyles}</style>

      {/* Breadcrumb Header - Matches Saved Page Style */}
      <header className="search-header">
        <nav className="search-breadcrumb">
          <Link to="/tenant/dashboard" className="search-breadcrumb-item">
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
          <ChevronRight size={16} className="search-breadcrumb-separator" />
          <span className="search-breadcrumb-current">Listings</span>
        </nav>

        {/* View Toggle */}
        <div className="view-toggle">
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'list' ? 'is-active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <Grid3X3 size={18} />
            <span>Grid</span>
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'map' ? 'is-active' : ''}`}
            onClick={() => setViewMode('map')}
          >
            <MapIcon size={18} />
            <span>Map</span>
          </button>
        </div>
      </header>

{/* Modern Filter Container - Compact Mobile Style */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #e5e7eb'
      }}>
        {/* Main Search Bar - Compact */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.2rem 0.75rem 0.2rem 1.25rem',
          background: '#f9fafb',
          borderRadius: 40,
          border: '1px solid #e5e7eb',
          marginBottom: '0.75rem'
        }}>
          <Search size={18} style={{ color: '#6b7280', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search.placeholder') || 'Search...'}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: '0.9rem',
              outline: 'none',
              color: '#111827',
              boxShadow: 'none'
            }}
            onFocus={(e) => { e.target.style.outline = 'none'; e.target.style.boxShadow = 'none'; }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
            >
              <X size={16} style={{ color: '#6b7280' }} />
            </button>
          )}
        </div>

        {/* Room Type Categories */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          scrollbarWidth: 'none'
        }}>
          {ROOM_TYPE_OPTIONS.map((type) => {
            const Icon = type.icon;
            const isActive = selectedRoomType === type.value;
            return (
              <button
                key={type.value}
                onClick={() => setSelectedRoomType(type.value)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.4rem 0.6rem',
                  minWidth: '65px',
                  border: isActive ? '1.5px solid #22c55e' : '1.5px solid #e5e7eb',
                  borderRadius: 10,
                  background: isActive ? '#f0fdf4' : 'white',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={18} style={{ color: isActive ? '#22c55e' : '#6b7280' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: isActive ? 600 : 500, color: isActive ? '#166534' : '#6b7280' }}>
                  {type.label}
                </span>
              </button>
            );
          })}

          {/* More Filters Button */}
          <button
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.4rem 0.6rem',
              minWidth: '65px',
              border: showMoreFilters ? '1.5px solid #22c55e' : '1.5px solid #e5e7eb',
              borderRadius: 10,
              background: showMoreFilters ? '#f0fdf4' : 'white',
              cursor: 'pointer',
              flexShrink: 0,
              position: 'relative'
            }}
          >
            <SlidersHorizontal size={18} style={{ color: showMoreFilters ? '#22c55e' : '#6b7280' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: showMoreFilters ? 600 : 500, color: showMoreFilters ? '#166534' : '#6b7280' }}>
              Filters
            </span>
            {activeFiltersCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -6, right: -6,
                background: 'var(--jade)',
                color: 'white',
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                fontSize: '0.7rem',
                fontWeight: 600
              }}>
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Extended Filter Panel */}
        {showMoreFilters && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Price Range */}
            <div>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Price range</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {PRICE_RANGES.map((range, idx) => {
                  const isActive = selectedPriceRange?.min === range.min && selectedPriceRange?.max === range.max;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedPriceRange(isActive ? null : range)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: 999,
                        border: isActive ? '2px solid var(--jade)' : '1px solid var(--border)',
                        background: isActive ? 'var(--jade-muted)' : 'var(--surface)',
                        color: isActive ? 'var(--jade-dark)' : 'var(--mid)',
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 600 : 400,
                        cursor: 'pointer'
                      }}
                    >
                      {range.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amenities */}
            <div>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Amenities</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {AMENITY_OPTIONS.map((amenity) => {
                  const Icon = amenity.icon;
                  const isActive = selectedAmenities.includes(amenity.value);
                  return (
                    <button
                      key={amenity.value}
                      onClick={() => toggleAmenity(amenity.value)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.5rem 0.875rem',
                        borderRadius: 999,
                        border: isActive ? '2px solid var(--jade)' : '1px solid var(--border)',
                        background: isActive ? 'var(--jade-muted)' : 'var(--surface)',
                        color: isActive ? 'var(--jade-dark)' : 'var(--mid)',
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 600 : 400,
                        cursor: 'pointer'
                      }}
                    >
                      <Icon size={14} />
                      {amenity.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* University */}
            <div>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Near University</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {UNIVERSITY_OPTIONS.map((uni) => {
                  const isActive = selectedUniversity === uni.value;
                  return (
                    <button
                      key={uni.value}
                      onClick={() => setSelectedUniversity(isActive ? '' : uni.value)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: 999,
                        border: isActive ? '2px solid var(--jade)' : '1px solid var(--border)',
                        background: isActive ? 'var(--jade-muted)' : 'var(--surface)',
                        color: isActive ? 'var(--jade-dark)' : 'var(--mid)',
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 600 : 400,
                        cursor: 'pointer'
                      }}
                    >
                      {uni.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
              <button
                onClick={clearFilters}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--mid)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Clear all
              </button>
              <button
                onClick={() => setShowMoreFilters(false)}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: 8,
                  border: 'none',
                  background: '#22c55e',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Show {processedListings.length} results
              </button>
            </div>
          </div>
        )}
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {viewMode === 'map' ? (
        <section style={{ position: 'relative' }}>
          {mapRooms.length === 0 && !loading ? (
            <div style={{
              height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
              background: '#f1f5f9', borderRadius: 16,
            }}>
              <MapIcon size={40} color="#94a3b8" />
              <p style={{ color: '#64748b', fontWeight: 500 }}>No listings with known locations yet.</p>
              <button onClick={() => setViewMode('list')} style={{
                padding: '8px 20px', background: '#22c55e', color: '#fff',
                border: 'none', borderRadius: 999, fontWeight: 600, cursor: 'pointer'
              }}>View as Grid</button>
            </div>
          ) : (
            <>
              <MapboxListingMap
                rooms={mapRooms}
                searchWard={searchQuery}
                height="calc(100vh - 200px)"
                onRoomClick={(roomId) => navigate(`/rooms/${roomId}`)}
                onBoundsChange={handleBoundsChange}
              />
              {/* Stats badge — top-right of map (left is taken by style toggle) */}
              <div style={{
                position: 'absolute', top: 12, right: 56, zIndex: 10,
                background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
                borderRadius: 20, padding: '6px 14px', fontSize: '0.82rem',
                fontWeight: 700, boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ color: '#22c55e' }}>●</span>
                {viewportListings.length} nyumba kwenye eneo hili
              </div>
              {hasMore ? (
                <button type="button" className="btn btn--ghost btn--small"
                  style={{ position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'white', borderRadius: 999, padding: '8px 20px', fontWeight: 600, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', border: 'none', cursor: 'pointer' }}
                  onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Inapakia...' : 'Pakia nyumba zaidi'}
                </button>
              ) : null}
            </>
          )}
        </section>
      ) : (
        <>
          {(() => {
            const availableListings = processedListings.filter((l: any) => l.vacancyStatus !== 'available_soon' && l.vacancyStatus !== 'listed_occupied');
            const comingSoonListings = processedListings.filter((l: any) => l.vacancyStatus === 'available_soon' || l.vacancyStatus === 'listed_occupied');

            return (
              <div className="room-grid-section__inner" style={{ padding: '0 1rem' }}>
                {loading ? (
                  <div className="room-grid">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="room-skeleton">
                        <div className="room-skeleton__image" />
                        <div className="room-skeleton__text room-skeleton__text--short" />
                        <div className="room-skeleton__text room-skeleton__text--shorter" />
                      </div>
                    ))}
                  </div>
                ) : processedListings.length === 0 ? (
                  <div className="room-grid-empty">
                    <h3 className="room-grid-empty__title">{t('search.noResults', 'No homes found')}</h3>
                    <p className="room-grid-empty__text">
                      No available rooms match your filters. Rooms that have already been rented are hidden automatically.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Available Listings */}
                    {availableListings.length > 0 && (
                      <div className="room-grid">
                        {availableListings.map((listing: any) => (
                          <RoomCard
                            key={listing.id}
                            listing={listing}
                            savedIds={savedIds}
                            imageIndexes={imageIndexes}
                            onToggleSave={handleToggleSave}
                            onNextImage={nextImage}
                            onPrevImage={prevImage}
                            onClick={() => navigate(`/rooms/${listing.id}`)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Coming Soon Listings */}
                    {comingSoonListings.length > 0 && (
                      <>
                        {availableListings.length > 0 && (
                          <hr style={{ margin: '2rem 0 1.5rem', border: 'none', borderTop: '1px solid var(--border)' }} />
                        )}
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--ink)' }}>Coming Soon</h3>
                        <div className="room-grid">
                          {comingSoonListings.map((listing: any) => (
                            <RoomCard
                              key={listing.id}
                              listing={listing}
                              savedIds={savedIds}
                              imageIndexes={imageIndexes}
                              onToggleSave={handleToggleSave}
                              onNextImage={nextImage}
                              onPrevImage={prevImage}
                              onClick={() => navigate(`/rooms/${listing.id}`)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {hasMore && !loading ? (
            <div className="search-load-more">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? t('search.loadingMore') : t('search.loadMore')}
              </button>
              <div ref={loadMoreRef} aria-hidden="true" />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
