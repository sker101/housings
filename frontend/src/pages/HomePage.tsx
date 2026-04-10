import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import bgImage from '../images/homelanding.jpg';
import {
  fetchApprovedListings,
  fetchSavedListingIds,
  toggleSavedListing
} from '../lib/listings';
import {
  Search,
  MapPin,
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
  Star,
  Heart,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X
} from 'lucide-react';

// University options
const UNIVERSITY_OPTIONS = ['UDSM', 'ARDHI', 'MUHAS', 'IFM'];

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

// Gender preference options - no default, user must explicitly choose
const GENDER_OPTIONS = [
  { value: 'male', label: 'Male only' },
  { value: 'female', label: 'Female only' },
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
  genderPreference: string;
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
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<{min: number, max: number | null} | null>(null);
  const [selectedPropertyType, setSelectedPropertyType] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [furnished, setFurnished] = useState(false);
  const [utilitiesIncluded, setUtilitiesIncluded] = useState(false);

  // Image carousel states
  const [imageIndices, setImageIndices] = useState<Record<string, number>>({});

  // Minimize/Maximize filter container on scroll
  const [isFilterMinimized, setIsFilterMinimized] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

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
        if (selectedGender) {
          filters.genderPreference = selectedGender;
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
  }, [token, selectedRoomType, selectedGender, selectedPriceRange, searchQuery]);

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

      // Property type filter
      if (selectedPropertyType && listing.propertyType !== selectedPropertyType) {
        return false;
      }

      // Furnished filter
      if (furnished && !listing.furnished) {
        return false;
      }

      // Utilities filter
      if (utilitiesIncluded && !listing.utilitiesIncluded) {
        return false;
      }

      // Amenities filter
      if (selectedAmenities.length > 0) {
        const hasAllAmenities = selectedAmenities.every(
          amenity => listing.amenities?.[amenity] === true
        );
        if (!hasAllAmenities) return false;
      }

      return true;
    });
  }, [listings, selectedUniversity, selectedPropertyType, furnished, utilitiesIncluded, selectedAmenities]);

  // Calculate badge counts from actual data
  const badgeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'wifi': 0, 'parking': 0, 'water': 0, 'kitchen': 0,
      'gym': 0, 'laundry': 0, 'security': 0, 'ac': 0,
      'generator': 0, 'pool': 0,
      'single': 0, 'shared': 0, 'bedsit': 0, 'studio': 0,
      'apartment': 0, 'self_contained': 0, '1_bedroom': 0, '2_bedroom': 0,
      'male': 0, 'female': 0, 'any': 0,
    };

    listings.forEach(listing => {
      // Room type counts
      if (listing.roomType && counts[listing.roomType] !== undefined) {
        counts[listing.roomType]++;
      }

      // Gender counts
      if (listing.genderPreference && counts[listing.genderPreference] !== undefined) {
        counts[listing.genderPreference]++;
      }

      // Amenity counts
      Object.entries(listing.amenities || {}).forEach(([key, value]) => {
        if (value && counts[key] !== undefined) {
          counts[key]++;
        }
      });
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
    setSelectedGender('');
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
    (selectedPriceRange ? 1 : 0) +
    (selectedPropertyType ? 1 : 0) +
    (selectedGender ? 1 : 0) +
    (furnished ? 1 : 0) +
    (utilitiesIncluded ? 1 : 0);

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
          <div className="search-bar-main">
            <div className="search-bar-main__input-wrapper" style={{ borderRight: 'none' }}>
              <Search className="search-bar-main__icon" size={20} />
              <input
                type="text"
                className="search-bar-main__input"
                placeholder="search for your perfect home"
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

          {/* Filter Categories */}
          <div className="filter-categories">
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

              {/* Gender Preference - No default, user must explicitly choose */}
              <div className="filter-panel__section">
                <h4 className="filter-panel__title">Gender preference</h4>
                <div className="filter-panel__options">
                  {/* Show clear button if gender is selected */}
                  {selectedGender && (
                    <button
                      className="filter-badge is-active"
                      onClick={() => setSelectedGender('')}
                    >
                      {GENDER_OPTIONS.find(g => g.value === selectedGender)?.label}
                      <span className="filter-badge__clear">×</span>
                    </button>
                  )}
                  {/* Show options if no gender selected */}
                  {!selectedGender && GENDER_OPTIONS.map((gender) => {
                    const count = badgeCounts[gender.value] || 0;
                    return (
                      <button
                        key={gender.value}
                        className="filter-badge"
                        onClick={() => setSelectedGender(gender.value)}
                      >
                        {gender.label}
                        {count > 0 && <span className="filter-badge__count">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Property type */}
              <div className="filter-panel__section">
                <h4 className="filter-panel__title">Property type</h4>
                <div className="filter-panel__options">
                  {PROPERTY_TYPES.map((type) => (
                    <button
                      key={type.value}
                      className={`filter-badge ${selectedPropertyType === type.value ? 'is-active' : ''}`}
                      onClick={() => setSelectedPropertyType(
                        selectedPropertyType === type.value ? '' : type.value
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Filters */}
              <div className="filter-panel__section">
                <h4 className="filter-panel__title">Additional filters</h4>
                <div className="filter-panel__options">
                  <button
                    className={`filter-badge ${furnished ? 'is-active' : ''}`}
                    onClick={() => setFurnished(!furnished)}
                  >
                    Furnished
                  </button>
                  <button
                    className={`filter-badge ${utilitiesIncluded ? 'is-active' : ''}`}
                    onClick={() => setUtilitiesIncluded(!utilitiesIncluded)}
                  >
                    Utilities included
                  </button>
                </div>
              </div>

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

      {/* Room Grid Section */}
      <section className="room-grid-section" ref={resultsRef}>
        <div className="room-grid-section__inner">
          {/* Results Count */}
          <div className="results-count">
            {loading ? 'Loading homes...' : `${filteredListings.length} homes available`}
          </div>

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
              <h3 className="room-grid-empty__title">No homes found</h3>
              <p className="room-grid-empty__text">
                Try adjusting your filters or search for a different location to find more options.
              </p>
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
                  cursor: 'pointer'
                }}
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Room Grid */}
          {!loading && filteredListings.length > 0 && (
            <div className="room-grid">
              {filteredListings.map((listing) => {
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
                    {/* Image Container */}
                    <div className="room-card__image-wrapper">
                      <img
                        src={currentImage}
                        alt={listing.title}
                        className="room-card__image"
                        loading="lazy"
                      />

                      {/* Badges */}
                      {listing.featured && (
                        <span className="room-card__badge room-card__badge--featured">
                          Featured
                        </span>
                      )}

                      {/* Save Button */}
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

                      {/* Image Navigation */}
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

                    {/* Content - Simplified: Location and Price only */}
                    <div className="room-card__content">
                      <div className="room-card__header">
                        <span className="room-card__location">
                          {listing.district || listing.ward}, {listing.region}
                        </span>
                      </div>
                      <div className="room-card__price">
                        <span className="room-card__price-value">TSh {formatPrice(listing.priceMonthly)}</span>
                        <span className="room-card__price-unit">/month</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
