import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MapboxListingMap from '../components/MapboxListingMap';
import { useAuth } from '../context/AuthContext';
import bgImage from '../images/homelanding.jpg';
import {
  fetchApprovedListings,
  fetchSavedListingIds,
  toggleSavedListing
} from '../lib/listings';
import {
  Search,
  Users,
  Bed,
  Bath,
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
  Heart,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Home,
  Sparkles,
  Clock,
  MapPin,
  SearchX,
  Ban,
} from 'lucide-react';

// Room type options
const ROOM_TYPES = [
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

export default function HomePage() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();

  // Data states
  const [listings, setListings] = useState<Listing[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    const handleToggleView = (e: any) => {
      setIsTransitioning(true);
      setTimeout(() => {
        setViewMode(e.detail);
        setIsTransitioning(false);
      }, 400);
    };
    window.addEventListener('toggleHomePageView', handleToggleView);
    return () => window.removeEventListener('toggleHomePageView', handleToggleView);
  }, []);

  // Image carousel states
  const [imageIndices, setImageIndices] = useState<Record<string, number>>({});

  // Minimize/Maximize filter container on scroll
  const [isFilterMinimized, setIsFilterMinimized] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [gridHeight, setGridHeight] = useState<number>(0);

  // Measure the grid section height so the map can match it
  useEffect(() => {
    const updateHeight = () => {
      if (resultsRef.current) {
        setGridHeight(resultsRef.current.offsetHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [viewMode]);

  // Also update gridHeight after listings load
  useEffect(() => {
    if (resultsRef.current) {
      // Manual height tracking removed in favor of flexbox
    }
  });

  // Load filters from sessionStorage and apply them
  useEffect(() => {
    const loadFilters = () => {
      const appliedFiltersStr = sessionStorage.getItem('appliedFilters');
      if (appliedFiltersStr) {
        try {
          const appliedFilters = JSON.parse(appliedFiltersStr);
          
          // Apply price range
          if (appliedFilters.priceMin !== undefined && appliedFilters.priceMax !== undefined) {
            setSelectedPriceRange({
              min: appliedFilters.priceMin,
              max: appliedFilters.priceMax
            });
          }

          // Apply search query
          if (appliedFilters.searchQuery) {
            setSearchQuery(appliedFilters.searchQuery);
          }

          // Apply amenities
          if (appliedFilters.amenities && appliedFilters.amenities.length > 0) {
            setSelectedAmenities(appliedFilters.amenities);
          }
          
          // Apply room type directly since it's now a single string
          if (appliedFilters.roomType) {
            const roomTypeMap: Record<string, string> = {
              'all': 'all',
              'Single Room': 'single',
              'Shared Room': 'shared',
              'Self Contained': 'self_contained',
              'Studio': 'studio',
              'Apartment': 'apartment',
              '1 Bedroom': '1_bedroom',
              '2 Bedroom': '2_bedroom'
            };
            const mappedType = roomTypeMap[appliedFilters.roomType];
            if (mappedType) {
              setSelectedRoomType(mappedType);
            }
          }
          
          // Clear the sessionStorage after applying filters
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
        // Note: Gender filter removed - database view hardcodes gender as 'mixed'
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
      }
    }

    loadListings();

    return () => {
      mounted = false;
    };
  }, [token, selectedRoomType, selectedPriceRange, searchQuery]);

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
  }, [user?.userId, token]);

  // Filter listings client-side
  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      // University filter
      if (selectedUniversity && !listing.nearUniversities?.includes(selectedUniversity)) {
        return false;
      }



      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = listing.title?.toLowerCase().includes(query) || false;
        const locationMatch = listing.location?.toLowerCase().includes(query) || false;
        const descriptionMatch = listing.description?.toLowerCase().includes(query) || false;
        if (!titleMatch && !locationMatch && !descriptionMatch) {
          return false;
        }
      }

      // Price range filter
      if (selectedPriceRange) {
        const price = Number(listing.price);
        if (price < selectedPriceRange.min || price > selectedPriceRange.max) {
          return false;
        }
      }

      // Room type filter
      if (selectedRoomType && selectedRoomType !== 'all') {
        if (listing.roomType !== selectedRoomType) {
          return false;
        }
      }

      // Amenities filter
      if (selectedAmenities.length > 0) {
        const hasAllAmenities = selectedAmenities.every(amenity => {
          const ams = listing.amenities;
          if (!ams) return false;
          
          const searchAm = amenity.toLowerCase();
          
          if (Array.isArray(ams)) {
            return ams.some(a => typeof a === 'string' && a.toLowerCase() === searchAm);
          }
          
          // Object format: { "water": true } or { "Water": true }
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

  // Calculate badge counts from actual data
  const badgeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'wifi': 0, 'parking': 0, 'water': 0, 'kitchen': 0,
      'gym': 0, 'laundry': 0, 'security': 0, 'ac': 0,
      'generator': 0, 'pool': 0,
      'single': 0, 'shared': 0, 'bedsit': 0, 'studio': 0,
      'apartment': 0, 'self_contained': 0, '1_bedroom': 0, '2_bedroom': 0,
    };

    listings.forEach(listing => {
      // Room type counts
      if (listing.roomType && counts[listing.roomType] !== undefined) {
        counts[listing.roomType]++;
      }

      // Note: Gender counts removed - database view hardcodes gender as 'mixed'

      // Amenity counts
      const ams = listing.amenities;
      if (ams) {
        if (Array.isArray(ams)) {
          ams.forEach(a => {
            if (typeof a === 'string') {
              const key = a.toLowerCase();
              if (counts[key] !== undefined) counts[key]++;
            }
          });
        } else {
          Object.entries(ams).forEach(([key, value]) => {
            if (value === true) {
              const lowerKey = key.toLowerCase();
              if (counts[lowerKey] !== undefined) counts[lowerKey]++;
            }
          });
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
        if (nextSaved) {
          updated.add(listingId);
        } else {
          updated.delete(listingId);
        }
        return updated;
      });
    } catch (err: any) {
      setError(err.message);
    }
  }, [isAuthenticated, user?.userId, token, navigate]);

  const handleSearch = () => {
    // Triggered by useEffect when filters change
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
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const nextImage = (listingId: string, totalImages: number) => {
    setImageIndices(prev => ({
      ...prev,
      [listingId]: ((prev[listingId] || 0) + 1) % totalImages
    }));
  };

  const prevImage = (listingId: string, totalImages: number) => {
    setImageIndices(prev => ({
      ...prev,
      [listingId]: ((prev[listingId] || 0) - 1 + totalImages) % totalImages
    }));
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M`;
    }
    if (price >= 1000) {
      return `${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}K`;
    }
    return price.toString();
  };

  // Scroll detection for minimize/maximize
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const resultsElement = resultsRef.current;
      
      // Get the position of "X homes available" text
      let resultsTop = 0;
      if (resultsElement) {
        const rect = resultsElement.getBoundingClientRect();
        resultsTop = rect.top + window.scrollY;
      }
      
      // Threshold: when we're 100px above the results section
      const threshold = resultsTop - 100;
      
      if (currentScrollY > lastScrollY) {
        // Scrolling down - minimize when past a small buffer
        if (currentScrollY > 150 && !isFilterMinimized) {
          setIsFilterMinimized(true);
        }
      } else {
        // Scrolling up - maximize when near results section
        if (currentScrollY <= threshold && isFilterMinimized) {
          setIsFilterMinimized(false);
        }
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isFilterMinimized]);

  const activeFiltersCount = selectedAmenities.length +
    (selectedUniversity ? 1 : 0) +
    (selectedPriceRange ? 1 : 0);

  const renderListingCard = (listing: Listing) => {
    const currentImageIndex = imageIndices[listing.id] || 0;
    const photos = listing.photos?.length > 0
      ? listing.photos.map(p => p.public_url)
      : [listing.imageUrl];
    const currentImage = photos[currentImageIndex];

    return (
      <div
        key={listing.id}
        className="room-card"
        onClick={() => navigate(`/listings/${listing.id}`)}
      >
        <div className="room-card__image-wrapper">
          <img
            src={currentImage}
            alt={listing.title}
            className="room-card__image"
            loading="lazy"
          />

          {listing.featured && (
            <span className="room-card__badge room-card__badge--featured">
              Featured
            </span>
          )}

          <button
            className={`room-card__save-btn ${savedIds.has(listing.id) ? 'is-saved' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleSave(listing.id);
            }}
          >
            <Heart
              size={24}
              fill={savedIds.has(listing.id) ? '#ef4444' : 'none'}
              strokeWidth={savedIds.has(listing.id) ? 0 : 2}
            />
          </button>

          {photos.length > 1 && (
            <>
              <button
                className="room-card__nav-btn room-card__nav-btn--prev"
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage(listing.id, photos.length);
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="room-card__nav-btn room-card__nav-btn--next"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage(listing.id, photos.length);
                }}
              >
                <ChevronRight size={18} />
              </button>
              <div className="room-card__dots">
                {photos.map((_, idx) => (
                  <span
                    key={idx}
                    className={`room-card__dot ${idx === currentImageIndex ? 'is-active' : ''}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="room-card__content" style={{ padding: '0.15rem 0.25rem 0.4rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
          <h3 style={{ margin: '0', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {listing.title}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#64748b' }}>
              <MapPin size={12} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {listing.district || listing.ward || listing.street || 'Tanzania'}
              </span>
            </div>
            {listing.region && (
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', paddingLeft: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {listing.region}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem', marginTop: '0.1rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>TSh {formatPrice(listing.priceMonthly)}</span>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>/ month</span>
          </div>
        </div>
      </div>
    );
  };

  function isComingSoon(status: string | undefined): boolean {
    return status === 'available_soon' || status === 'coming_soon' || status === 'listed_occupied';
  }

  const availableListings = filteredListings.filter(l => !isComingSoon((l as any).vacancyStatus));
  const comingSoonListings = filteredListings.filter(l => isComingSoon((l as any).vacancyStatus));

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Background Image - Fixed behind everything */}
      <div className="homepage-wrapper">
        <div
          className="homepage-bg"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="homepage-overlay" />
      </div>

      {/* Filter Container - minimizes on scroll down, maximizes on scroll up */}
      <div className={`filter-container ${isFilterMinimized ? 'is-minimized' : ''}`}>
        <div className="filter-container__inner">
          {/* Main Search Bar */}
          <div className="search-bar-main-wrapper" style={{ width: '100%', maxWidth: '850px', margin: '0 auto 1.5rem' }}>
            <div className="search-bar-main">
              <div className="search-bar-main__input-wrapper" style={{ borderRight: 'none' }}>
                <Search className="search-bar-main__icon" size={20} />
                <input
                  type="text"
                  className="search-bar-main__input"
                  placeholder="find your perfect home"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button
                className="search-bar-main__btn"
                onClick={handleSearch}
                aria-label="Search"
              >
                <Search size={20} />
              </button>
            </div>
          </div>

          {/* Filter Categories */}
          <div className="filter-categories" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {ROOM_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  className={`filter-category ${selectedRoomType === type.value ? 'is-active' : ''}`}
                  onClick={() => setSelectedRoomType(type.value)}
                >
                  <Icon className="filter-category__icon" size={24} />
                  <span className="filter-category__label">{type.label}</span>
                </button>
              );
            })}

            {/* More Filters Button */}
            <button
              className="filter-more-btn"
              onClick={() => setShowMoreFilters(!showMoreFilters)}
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span style={{
                  background: '#22c55e',
                  color: 'white',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Extended Filter Panel */}
          {showMoreFilters && (
            <div className="filter-panel">
              {/* Price Range */}
              <div className="filter-panel__section">
                <h4 className="filter-panel__title">Price range</h4>
                <div className="filter-panel__options">
                  {PRICE_RANGES.map((range, idx) => (
                    <button
                      key={idx}
                      className={`filter-badge ${
                        selectedPriceRange?.min === range.min && selectedPriceRange?.max === range.max
                          ? 'is-active' : ''
                      }`}
                      onClick={() => setSelectedPriceRange(
                        selectedPriceRange?.min === range.min ? null : range
                      )}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amenities with counts from database */}
              <div className="filter-panel__section">
                <h4 className="filter-panel__title">Amenities</h4>
                <div className="filter-panel__options">
                  {AMENITY_OPTIONS.map((amenity) => {
                    const Icon = amenity.icon;
                    const count = badgeCounts[amenity.value] || 0;
                    return (
                      <button
                        key={amenity.value}
                        className={`filter-badge ${selectedAmenities.includes(amenity.value) ? 'is-active' : ''}`}
                        onClick={() => toggleAmenity(amenity.value)}
                      >
                        <Icon size={14} />
                        {amenity.label}
                        {count > 0 && <span className="filter-badge__count">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note: Gender preference filter removed - database view hardcodes gender as 'mixed' */}



              {/* Filter Actions */}
              <div className="filter-actions">
                <button className="filter-actions__clear" onClick={clearFilters}>
                  Clear all
                </button>
                <button
                  className="filter-actions__show"
                  onClick={() => setShowMoreFilters(false)}
                >
                  Show {filteredListings.length} homes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile badge removed (replaced by centered top badge in Layout) */}

      {/* Room Grid Section */}
      <section
        className="room-grid-section"
        ref={resultsRef}
        style={viewMode === 'map' ? { padding: 0 } : undefined}
      >
        <div
          className="room-grid-section__inner"
          style={viewMode === 'map' ? { padding: 0 } : undefined}
        >
          {/* Results Count - Mobile Only "For You" Header */}
          {viewMode === 'grid' && !loading && filteredListings.length > 0 && (
            <div className="mobile-for-you-header">
              <Sparkles size={18} className="mobile-for-you-icon" />
              <span className="mobile-for-you-text">For You</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '1rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="room-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="room-skeleton">
                  <div className="room-skeleton__image" />
                  <div className="room-skeleton__text room-skeleton__text--short" />
                  <div className="room-skeleton__text room-skeleton__text--shorter" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredListings.length === 0 && (
            <div className="room-grid-empty">
              <div style={{ marginBottom: '1rem' }}>
                {activeFiltersCount > 0 ? (
                  <SearchX size={48} style={{ color: '#94a3b8' }} />
                ) : (
                  <Ban size={48} style={{ color: '#94a3b8' }} />
                )}
              </div>
              <h3 className="room-grid-empty__title">
                {activeFiltersCount > 0 ? 'No rooms match your filters' : 'No rooms available right now'}
              </h3>
              <p className="room-grid-empty__text">
                {activeFiltersCount > 0
                  ? 'Try adjusting your filters to see more options. Rooms may not be available for your current selections.'
                  : 'Rooms may not be available at the moment. Please check back later or try adjusting search filters when more listings are added.'}
              </p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 1.5rem',
                    background: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <SlidersHorizontal size={16} />
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Main Content Area (Map or Grid) */}
          {isTransitioning ? (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '6rem 0' }}>
               <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(34,197,94,0.2)', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
               <span style={{ marginTop: '1rem', fontWeight: 600, color: 'var(--ink)' }}>
                 {viewMode === 'grid' ? 'Switching to Map View...' : 'Switching to Grid View...'}
               </span>
            </div>
          ) : viewMode === 'map' ? (
            <section style={{ position: 'relative', width: '100vw', height: '450px', marginLeft: 'calc(50% - 50vw)', overflow: 'hidden' }}>
               <MapboxListingMap
                  rooms={filteredListings.map((l: any) => ({
                     id: l.id,
                     latitude: Number(l.lat),
                     longitude: Number(l.lng),
                     title: l.title,
                     price_tzs: Number(l.priceMonthly),
                     room_type: l.roomType,
                     primary_image: l.images?.[0] || '',
                     availability_status: l.vacancyStatus || 'available',
                     ward: l.ward
                  }))}
                  center={[-6.7924, 39.2083]}
                  zoom={11}
                  onRoomClick={(roomId) => navigate(`/rooms/${roomId}`)}
               />
               <div style={{
                  position: 'absolute', top: 16, left: 16, zIndex: 10,
                  background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
                  borderRadius: 20, padding: '6px 14px', fontSize: '0.82rem',
                  fontWeight: 700, boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                  color: '#1e293b',
                }}>
                  {filteredListings.length} rooms shown on map
                </div>
            </section>
          ) : (
            <>
              {/* Room Grid - Available */}
              {!loading && availableListings.length > 0 && (
                <div className="room-grid">
                  {availableListings.map(renderListingCard)}
                </div>
              )}

              {/* Room Grid - Coming Soon */}
              {!loading && comingSoonListings.length > 0 && (
                <>
                  {availableListings.length > 0 && (
                    <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />
                  )}
                  <div className="mobile-coming-soon-header">
                    <Clock size={16} className="mobile-coming-soon-icon" />
                    <span className="mobile-coming-soon-text">Coming Soon</span>
                  </div>
                  <div className="room-grid">
                    {comingSoonListings.map(renderListingCard)}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
