import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MapboxListingMap from '../components/MapboxListingMap';
import { listingToMapRoom } from '../lib/mapCoords';
import { useAuth } from '../context/AuthContext';
import bgImage from '../images/homelanding.jpg';
import {
  fetchApprovedListings,
  fetchSavedListingIds,
  toggleSavedListing
} from '../lib/listings';
import {
  Search,
  Map as MapIcon,
  List,
  Home,
  Building2,
  GraduationCap,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Heart,
  MessageCircle,
  Share2,
  Flag,
  ChevronLeft,
  ChevronRight,
  Filter,
  SearchX,
  Sparkles,
  X,
  Map,
  Users,
  Wifi,
  Car,
  Droplets,
  Utensils,
  Dumbbell,
  Shirt,
  Shield,
  Snowflake,
  Flame,
  Waves,
  SlidersHorizontal,
} from 'lucide-react';

// Room type options
const ROOM_TYPE_OPTIONS = [
  { value: 'single', label: 'Single Room', icon: Users },
  { value: 'double', label: 'Double Room', icon: Users },
  { value: 'self_contained', label: 'Self Contained', icon: Bath },
  { value: 'shared', label: 'Shared Room', icon: Users },
  { value: 'bedsitter', label: 'Bedsitter', icon: Bed }
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

// Property types
const PROPERTY_TYPES = [
  { value: 'hostel', label: 'Hostel' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'guesthouse', label: 'Guesthouse' },
];

interface Listing {
  id: string;
  title: string;
  description: string;
  roomType: string;
  priceMonthly: number;
  location: string;
  district: string;
  ward: string;
  region: string;
  amenities: Record<string, boolean>;
  furnished: boolean;
  utilitiesIncluded: boolean;
  nearUniversities: string[];
  imageUrl: string;
  photos: { public_url: string }[];
  featured: boolean;
  propertyType?: string;
  totalRooms?: number;
  viewCount: number;
}

function getComingSoonDetails(listing: any) {
  const isComingSoonFlag = listing.isComingSoon || listing.is_coming_soon || false;
  const status = listing.vacancyStatus || listing.vacancy_status;
  const isLegacy = status === 'available_soon' || status === 'coming_soon' || status === 'listed_occupied';
  const availableFrom = listing.availableFrom || listing.available_from;

  let isSoon = false;
  if (isComingSoonFlag || isLegacy) {
    isSoon = true;
  }

  let daysUntil = null;
  if (availableFrom) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const availDate = new Date(availableFrom + 'T00:00:00');
    availDate.setHours(0, 0, 0, 0);
    const diffTime = availDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      daysUntil = diffDays;
    } else {
      isSoon = false; // The day has arrived or passed!
    }
  }
  return { isComingSoon: isSoon, daysUntil, availableFrom };
}

function formatAvailableFrom(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('sw-TZ', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();

  // Data states
  const [listings, setListings] = useState<Listing[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refreshCallbackRef = useRef<(() => void) | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState('all');
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<{min: number, max: number | null} | null>(null);
  const [selectedPropertyType, setSelectedPropertyType] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [furnished, setFurnished] = useState(false);
  const [utilitiesIncluded, setUtilitiesIncluded] = useState(false);

  const [viewMode, setViewMode] = useState('grid');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const handleToggleView = (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('HomePage received toggle event:', customEvent.detail);
      setIsTransitioning(true);
      setTimeout(() => {
        setViewMode(customEvent.detail);
        setIsTransitioning(false);
      }, 400);
    };
    window.addEventListener('toggleHomePageView', handleToggleView);
    console.log('HomePage registered toggle listener');
    return () => window.removeEventListener('toggleHomePageView', handleToggleView);
  }, []);

  // Image carousel states
  const [imageIndices, setImageIndices] = useState<Record<string, number>>({});

  // Minimize/Maximize filter container on scroll
  const [isFilterMinimized, setIsFilterMinimized] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load filters from sessionStorage and apply them
  useEffect(() => {
    const loadFilters = () => {
      const appliedFiltersStr = sessionStorage.getItem('appliedFilters');
      if (appliedFiltersStr) {
        try {
          const appliedFilters = JSON.parse(appliedFiltersStr);
          
          if (appliedFilters.priceMin !== undefined && appliedFilters.priceMax !== undefined) {
            setSelectedPriceRange({
              min: appliedFilters.priceMin,
              max: appliedFilters.priceMax
            });
          }

          if (appliedFilters.searchQuery) {
            setSearchQuery(appliedFilters.searchQuery);
          }

          if (appliedFilters.amenities && appliedFilters.amenities.length > 0) {
            setSelectedAmenities(appliedFilters.amenities);
          }
          
          if (appliedFilters.roomType) {
            const roomTypeMap: Record<string, string> = {
              'Single Room': 'single',
              'Double Room': 'double',
              'Shared Room': 'shared',
              'Self Contained': 'self_contained',
              'Bedsitter': 'bedsitter'
            };
            const mappedType = roomTypeMap[appliedFilters.roomType];
            if (mappedType) {
              setSelectedRoomType(mappedType);
            }
          }
          
          sessionStorage.removeItem('appliedFilters');
        } catch (err) {
          console.error('Error parsing applied filters:', err);
        }
      }
    };

    loadFilters();
    window.addEventListener('filtersApplied', loadFilters);
    return () => window.removeEventListener('filtersApplied', loadFilters);
  }, []);

  // Fetch listings
  useEffect(() => {
    let mounted = true;

    async function loadListings() {
      setLoading(true);
      setError('');

      try {
        const filters: Record<string, any> = {
          limit: 60,
          sort: 'featured'
        };

        if (selectedRoomType && selectedRoomType !== 'all') {
          filters.roomType = selectedRoomType;
        }
        if (selectedAmenities && selectedAmenities.length > 0) {
          filters.amenities = selectedAmenities;
        }
        if (selectedPriceRange) {
          filters.minPrice = selectedPriceRange.min;
          if (selectedPriceRange.max) filters.maxPrice = selectedPriceRange.max;
        }
        if (searchQuery.trim()) {
          filters.query = searchQuery.trim();
        }

        const rows = await fetchApprovedListings(filters, token);

        if (mounted) {
          setListings(rows);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
          setListings([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
        // Signal completion of pull-to-refresh
        if (refreshCallbackRef.current) {
          refreshCallbackRef.current();
          refreshCallbackRef.current = null;
        }
      }
    }

    loadListings();

    return () => {
      mounted = false;
    };
  }, [token, selectedRoomType, selectedPriceRange, searchQuery, refreshTrigger]);

  // Fetch saved listings
  useEffect(() => {
    let mounted = true;

    async function loadSaved() {
      if (!user?.userId || !token) {
        setSavedIds(new Set());
        return;
      }

      try {
        const ids = await fetchSavedListingIds(user.userId, token);
        if (mounted) {
          setSavedIds(new Set(ids));
        }
      } catch {
        if (mounted) {
          setSavedIds(new Set());
        }
      }
    }

    loadSaved();

    return () => {
      mounted = false;
    };
  }, [user?.userId, token, refreshTrigger]);

  // Listen for the custom app-refresh event from PullToRefresh component
  useEffect(() => {
    const handleRefresh = (e: Event) => {
      const customEvent = e as CustomEvent;
      // Prevent full page reload fallback
      customEvent.preventDefault();

      if (customEvent.detail && typeof customEvent.detail.complete === 'function') {
        refreshCallbackRef.current = customEvent.detail.complete;
      }

      // Trigger re-fetches
      setRefreshTrigger((prev) => prev + 1);
    };

    window.addEventListener('app-refresh', handleRefresh);
    return () => {
      window.removeEventListener('app-refresh', handleRefresh);
    };
  }, []);

  // Filter listings client-side
  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      if (selectedUniversity && !listing.nearUniversities?.includes(selectedUniversity)) {
        return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = listing.title?.toLowerCase().includes(query) || false;
        const locationMatch = listing.location?.toLowerCase().includes(query) || false;
        const descriptionMatch = listing.description?.toLowerCase().includes(query) || false;
        if (!titleMatch && !locationMatch && !descriptionMatch) {
          return false;
        }
      }

      if (selectedPriceRange) {
        const price = Number(listing.priceMonthly);
        if (price < selectedPriceRange.min || (selectedPriceRange.max && price > selectedPriceRange.max)) {
          return false;
        }
      }

      if (selectedRoomType && selectedRoomType !== 'all') {
        if (listing.roomType !== selectedRoomType) {
          return false;
        }
      }

      if (selectedAmenities.length > 0) {
        const hasAllAmenities = selectedAmenities.every(amenity => {
          const ams = listing.amenities;
          if (!ams) return false;
          const searchAm = amenity.toLowerCase();
          
          if (Array.isArray(ams)) {
            return ams.some(a => typeof a === 'string' && a.toLowerCase() === searchAm);
          }
          
          for (const [key, val] of Object.entries(ams)) {
            if (key.toLowerCase() === searchAm && val === true) {
              return true;
            }
          }
          return false;
        });
        if (!hasAllAmenities) return false;
      }

      return true;
    });
  }, [listings, selectedUniversity, selectedAmenities, searchQuery, selectedPriceRange, selectedRoomType]);

  // Calculate badge counts
  const badgeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    listings.forEach(listing => {
      if (listing.roomType) counts[listing.roomType] = (counts[listing.roomType] || 0) + 1;
      const ams = listing.amenities;
      if (ams) {
        if (Array.isArray(ams)) {
          ams.forEach(a => { if (typeof a === 'string') counts[a.toLowerCase()] = (counts[a.toLowerCase()] || 0) + 1; });
        } else {
          Object.entries(ams).forEach(([key, value]) => { if (value === true) counts[key.toLowerCase()] = (counts[key.toLowerCase()] || 0) + 1; });
        }
      }
    });
    return counts;
  }, [listings]);

  const handleToggleSave = useCallback(async (listingId: string) => {
    if (!isAuthenticated || !user?.userId) {
      navigate('/auth/login');
      return;
    }
    try {
      const nextSaved = await toggleSavedListing({
        tenantId: user.userId,
        listingId,
        accessToken: token
      });
      setSavedIds((prev) => {
        const updated = new Set(prev);
        if (nextSaved) updated.add(listingId);
        else updated.delete(listingId);
        return updated;
      });
    } catch (err: any) {
      setError(err.message);
    }
  }, [isAuthenticated, user?.userId, token, navigate]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/listings?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

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
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const nextImage = (listingId: string, totalImages: number) => {
    setImageIndices(prev => ({ ...prev, [listingId]: ((prev[listingId] || 0) + 1) % totalImages }));
  };

  const prevImage = (listingId: string, totalImages: number) => {
    setImageIndices(prev => ({ ...prev, [listingId]: ((prev[listingId] || 0) - 1 + totalImages) % totalImages }));
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}K`;
    return price.toString();
  };

  // Scroll detection
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    if (currentScrollY > 100 && !isFilterMinimized) setIsFilterMinimized(true);
    else if (currentScrollY <= 100 && isFilterMinimized) setIsFilterMinimized(false);
    setLastScrollY(currentScrollY);
  }, [isFilterMinimized]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const activeFiltersCount = selectedAmenities.length + (selectedUniversity ? 1 : 0) + (selectedPriceRange ? 1 : 0);

  const renderListingCard = (listing: Listing) => {
    const currentImageIndex = imageIndices[listing.id] || 0;
    const photos = listing.photos?.length > 0 ? listing.photos.map(p => p.public_url) : [listing.imageUrl];
    const currentImage = photos[currentImageIndex];
    const soonDetails = getComingSoonDetails(listing);

    return (
      <div key={listing.id} className="room-card" onClick={() => navigate(`/listings/${listing.id}`)}>
        <div className="room-card__image-wrapper">
          <img src={currentImage} alt={listing.title} className="room-card__image" loading="lazy" />
          {listing.featured && <span className="room-card__badge room-card__badge--featured">Featured</span>}
          {soonDetails.isComingSoon && (
            <span
              className="room-card__badge"
              style={{
                background: 'var(--jade, #22c55e)',
                color: '#fff',
                left: listing.featured ? '5.5rem' : '0.75rem',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(34,197,94,0.35)',
              }}
            >
              {soonDetails.daysUntil !== null ? `Inakuja: Siku ${soonDetails.daysUntil}` : 'Inakuja'}
            </span>
          )}
          <button
            className={`room-card__save-btn ${savedIds.has(listing.id) ? 'is-saved' : ''}`}
            onClick={(e) => { e.stopPropagation(); handleToggleSave(listing.id); }}
          >
            <Heart size={24} fill={savedIds.has(listing.id) ? '#ef4444' : 'none'} strokeWidth={savedIds.has(listing.id) ? 0 : 2} />
          </button>
          {photos.length > 1 && (
            <>
              <button className="room-card__nav-btn room-card__nav-btn--prev" onClick={(e) => { e.stopPropagation(); prevImage(listing.id, photos.length); }}>
                <ChevronLeft size={18} />
              </button>
              <button className="room-card__nav-btn room-card__nav-btn--next" onClick={(e) => { e.stopPropagation(); nextImage(listing.id, photos.length); }}>
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>
        <div className="room-card__content" style={{ padding: '0.15rem 0.25rem 0.4rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 }}>
          <h3 style={{ margin: '0', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {listing.title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#64748b' }}>
            <MapPin size={12} />
            <span style={{ fontSize: '0.75rem' }}>{listing.district || listing.ward || 'Tanzania'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem', marginTop: '0.1rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>TSh {formatPrice(listing.priceMonthly)}</span>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>/ month</span>
          </div>
          {soonDetails.isComingSoon && soonDetails.availableFrom && (
            <div style={{
              fontSize: '0.7rem',
              color: 'var(--mid, #64748b)',
              background: 'var(--cream, #f8fafc)',
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              border: '1px solid var(--border, #e2e8f0)',
              display: 'inline-flex',
              alignItems: 'center',
              width: 'max-content',
              maxWidth: '100%',
              gap: '0.25rem'
            }}>
              📅 Inapatikana {formatAvailableFrom(soonDetails.availableFrom)} {soonDetails.daysUntil !== null ? `(baada ya siku ${soonDetails.daysUntil})` : ''}
            </div>
          )}
        </div>
      </div>
    );
  };

  const listingStatuses = useMemo(() => {
    return filteredListings.map(l => {
      const details = getComingSoonDetails(l);
      return { listing: l, details };
    });
  }, [filteredListings]);

  const availableListings = useMemo(() => {
    return listingStatuses.filter(x => !x.details.isComingSoon).map(x => x.listing);
  }, [listingStatuses]);

  const comingSoonListings = useMemo(() => {
    return listingStatuses.filter(x => x.details.isComingSoon).map(x => x.listing);
  }, [listingStatuses]);

  return (
    <div style={{ minHeight: '100dvh', position: 'relative' }}>
      <div className="homepage-wrapper">
        <div className="homepage-bg" style={{ backgroundImage: `url(${bgImage})` }} />
        <div className="homepage-overlay" />
      </div>

      <div className={`filter-container ${isFilterMinimized ? 'is-minimized' : ''}`}>
        <div className="filter-container__inner">
          <div className="search-bar-main-wrapper" style={{ width: '100%', maxWidth: '850px', margin: '0 auto 1.5rem' }}>
            <div className="search-bar-main">
              <div className="search-bar-main__input-wrapper">
                <Search size={20} />
                <input
                  type="text"
                  className="search-bar-main__input"
                  placeholder="find your perfect home"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button className="search-bar-main__btn" onClick={handleSearch}><Search size={20} /></button>
            </div>
          </div>

          <div className="filter-categories">
            {ROOM_TYPE_OPTIONS.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  className={`filter-category ${selectedRoomType === type.value ? 'is-active' : ''}`}
                  onClick={() => setSelectedRoomType(type.value)}
                >
                  <Icon size={24} />
                  <span className="filter-category__label">{type.label}</span>
                </button>
              );
            })}
            <button className="filter-more-btn" onClick={() => setShowMoreFilters(!showMoreFilters)}>
              <SlidersHorizontal size={16} />
              <span>Filters</span>
              {activeFiltersCount > 0 && <span className="filter-badge__count">{activeFiltersCount}</span>}
            </button>
          </div>

          {showMoreFilters && (
            <div className="filter-panel">
              <div className="filter-panel__section">
                <h4 className="filter-panel__title">Price range</h4>
                <div className="filter-panel__options">
                  {PRICE_RANGES.map((range, idx) => (
                    <button
                      key={idx}
                      className={`filter-badge ${selectedPriceRange?.min === range.min && selectedPriceRange?.max === range.max ? 'is-active' : ''}`}
                      onClick={() => setSelectedPriceRange(selectedPriceRange?.min === range.min ? null : range)}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="filter-panel__section">
                <h4 className="filter-panel__title">Amenities</h4>
                <div className="filter-panel__options">
                  {AMENITY_OPTIONS.map((amenity) => {
                    const Icon = amenity.icon;
                    return (
                      <button
                        key={amenity.value}
                        className={`filter-badge ${selectedAmenities.includes(amenity.value) ? 'is-active' : ''}`}
                        onClick={() => toggleAmenity(amenity.value)}
                      >
                        <Icon size={14} />
                        {amenity.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="filter-actions">
                <button className="filter-actions__clear" onClick={clearFilters}>Clear all</button>
                <button className="filter-actions__show" onClick={() => setShowMoreFilters(false)}>Show {filteredListings.length} homes</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="room-grid-section" ref={resultsRef} style={{ marginTop: '1.5rem' }}>
        <div className="room-grid-section__inner">
          {/* For You Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', marginTop: '1rem', padding: '0 1rem' }}>
            <Sparkles size={24} style={{ color: '#000' }} />
            <h2 style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)', fontWeight: 700, color: '#000', margin: 0 }}>For You</h2>
          </div>
          {error && filteredListings.length > 0 && <div className="error-box">{error}</div>}
          
          {loading ? (
            <div className="room-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="room-skeleton"><div className="room-skeleton__image" /></div>
              ))}
            </div>
          ) : (
            <>
              {viewMode === 'map' ? (
                <div className={`map-view-container ${isTransitioning ? 'is-transitioning' : ''}`} style={{ 
                  height: 'calc(100dvh - 240px)', 
                  width: '100%', 
                  borderRadius: '20px', 
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-hard)',
                  border: '1px solid var(--border)',
                  position: 'relative',
                  marginTop: '1rem',
                  zIndex: 1
                }}>
                  <MapboxListingMap 
                    rooms={availableListings
                      .map(listingToMapRoom)
                      .filter((r): r is NonNullable<typeof r> => r !== null)}
                    height="100%"
                    onRoomClick={(id) => navigate(`/listings/${id}`)}
                  />
                </div>
              ) : (
                <>
                  {availableListings.length > 0 && (
                    <div className={`room-grid ${isTransitioning ? 'is-transitioning' : ''}`}>
                      {availableListings.map(renderListingCard)}
                    </div>
                  )}
                  {comingSoonListings.length > 0 && (
                    <div className="coming-soon-section">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', marginTop: '2rem', padding: '0 0.25rem' }}>
                        <h3 className="coming-soon-section__title" style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)', fontWeight: 700, color: '#000', margin: 0 }}>Coming Soon</h3>
                        <span style={{ fontSize: '0.75rem', background: 'var(--jade, #22c55e)', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 600 }}>
                          {comingSoonListings.length}
                        </span>
                      </div>
                      <div className="room-grid">{comingSoonListings.map(renderListingCard)}</div>
                    </div>
                  )}
                  {filteredListings.length === 0 && !loading && (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                      <SearchX size={48} style={{ color: 'var(--mid)', marginBottom: '1rem' }} />
                      <h3 style={{ fontSize: '1.25rem', color: 'var(--ink)' }}>No results found</h3>
                      <p style={{ color: 'var(--mid)' }}>Try adjusting your filters or search query</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
