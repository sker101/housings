import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MapboxListingMap from '../components/MapboxListingMap';
import ListingCard from '../components/ListingCard';
import { useAuth } from '../context/AuthContext';

import {
  fetchApprovedListings
} from '../lib/listings';
import {
  Search, Users, Bed, Bath, Wifi, Car, Droplets, Utensils,
  Dumbbell, Shirt, Shield, Snowflake, Flame, Waves, SlidersHorizontal,
  X,
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

// Gender preference options
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

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const { t } = useTranslation();

  // Filter states - matching homepage style
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedRoomType, setSelectedRoomType] = useState('all');
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
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

  // Build filters object for API call
  const buildFilters = useCallback(() => {
    const filters: Record<string, any> = {
      limit: PAGE_SIZE,
      offset: 0,
      sort: 'newest'
    };

    if (searchQuery.trim()) filters.query = searchQuery.trim();
    if (selectedRoomType && selectedRoomType !== 'all') filters.roomType = selectedRoomType;
    if (selectedGender) filters.genderPreference = selectedGender;
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
  }, [searchQuery, selectedRoomType, selectedGender, selectedPriceRange, selectedUniversity, selectedPropertyType, furnished, utilitiesIncluded, selectedAmenities]);

  useEffect(() => {
    let mounted = true;

    async function runSearch() {
      setLoading(true);
      setError('');

      try {
        const filters = buildFilters();
        const rows = await fetchApprovedListings(filters, token);

        if (mounted) {
          setListings(rows);
          setPage(1);
          setHasMore(rows.length === PAGE_SIZE);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setListings([]);
          setHasMore(false);
          setPage(1);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    runSearch();

    return () => {
      mounted = false;
    };
  }, [buildFilters, token]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    setError('');

    try {
      const baseFilters = buildFilters();
      const rows = await fetchApprovedListings(
        {
          ...baseFilters,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE
        },
        token
      );

      setListings((prev) => [...prev, ...rows]);
      setPage((prev) => prev + 1);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [buildFilters, hasMore, loading, loadingMore, page, token]);

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

    observer.observe(node);

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

  const mapListings = useMemo(() => processedListings.filter((l: any) => l.lat && l.lng), [processedListings]);

  // Viewport-synced subset — only rooms visible in current map bounds
  const viewportListings = useMemo(() => {
    if (!mapBounds) return mapListings;
    return mapListings.filter((l: any) => {
      const lat = Number(l.lat);
      const lng = Number(l.lng);
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

  const activeFiltersCount = selectedAmenities.length +
    (selectedUniversity ? 1 : 0) +
    (selectedPriceRange ? 1 : 0) +
    (selectedPropertyType ? 1 : 0) +
    (selectedGender ? 1 : 0) +
    (furnished ? 1 : 0) +
    (utilitiesIncluded ? 1 : 0);



  return (
    <div className="container section">
      <div className="section__header">
        <div>
          <h1>{t('search.title')}</h1>
          <p>{resultCountLabel}</p>
        </div>

        <div className="segmented-control">
          <button
            type="button"
            className={viewMode === 'list' ? 'is-active' : ''}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
          <button
            type="button"
            className={viewMode === 'map' ? 'is-active' : ''}
            onClick={() => setViewMode('map')}
          >
            Map
          </button>
        </div>
      </div>

      {/* Modern Filter Container - Homepage Style */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb'
      }}>
        {/* Main Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          background: '#f9fafb',
          borderRadius: 12,
          border: '2px solid #e5e7eb',
          marginBottom: '1rem'
        }}>
          <Search size={20} style={{ color: '#6b7280', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search.placeholder') || 'Search for your perfect home...'}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: '1rem',
              outline: 'none',
              color: '#111827'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
            >
              <X size={18} style={{ color: '#6b7280' }} />
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
                  gap: '0.35rem',
                  padding: '0.6rem 1rem',
                  minWidth: '80px',
                  border: isActive ? '2px solid #22c55e' : '2px solid #e5e7eb',
                  borderRadius: 12,
                  background: isActive ? '#f0fdf4' : 'white',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <Icon size={22} style={{ color: isActive ? '#22c55e' : '#6b7280' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 600 : 500, color: isActive ? '#166534' : '#6b7280' }}>
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
              gap: '0.35rem',
              padding: '0.6rem 1rem',
              minWidth: '80px',
              border: showMoreFilters ? '2px solid #22c55e' : '2px solid #e5e7eb',
              borderRadius: 12,
              background: showMoreFilters ? '#f0fdf4' : 'white',
              cursor: 'pointer',
              flexShrink: 0,
              position: 'relative'
            }}
          >
            <SlidersHorizontal size={22} style={{ color: showMoreFilters ? '#22c55e' : '#6b7280' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: showMoreFilters ? 600 : 500, color: showMoreFilters ? '#166534' : '#6b7280' }}>
              Filters
            </span>
            {activeFiltersCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -6, right: -6,
                background: '#22c55e',
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
                        border: isActive ? '2px solid #22c55e' : '1px solid #d1d5db',
                        background: isActive ? '#f0fdf4' : 'white',
                        color: isActive ? '#166534' : '#4b5563',
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
                        border: isActive ? '2px solid #22c55e' : '1px solid #d1d5db',
                        background: isActive ? '#f0fdf4' : 'white',
                        color: isActive ? '#166534' : '#4b5563',
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
                        border: isActive ? '2px solid #22c55e' : '1px solid #d1d5db',
                        background: isActive ? '#f0fdf4' : 'white',
                        color: isActive ? '#166534' : '#4b5563',
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

            {/* Gender */}
            <div>
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Gender preference</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {selectedGender && (
                  <button
                    onClick={() => setSelectedGender('')}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: 999,
                      border: '2px solid #22c55e',
                      background: '#f0fdf4',
                      color: '#166534',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {GENDER_OPTIONS.find(g => g.value === selectedGender)?.label} ×
                  </button>
                )}
                {!selectedGender && GENDER_OPTIONS.map((gender) => (
                  <button
                    key={gender.value}
                    onClick={() => setSelectedGender(gender.value)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: 999,
                      border: '1px solid #d1d5db',
                      background: 'white',
                      color: '#4b5563',
                      fontSize: '0.875rem',
                      cursor: 'pointer'
                    }}
                  >
                    {gender.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
              <button
                onClick={clearFilters}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: 'white',
                  color: '#4b5563',
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
          <MapboxListingMap
            rooms={viewportListings.map((l: any) => ({
              id: l.id,
              latitude: Number(l.lat),
              longitude: Number(l.lng),
              title: l.title,
              price_tzs: Number(l.priceMonthly),
              availability_status: l.vacancyStatus || 'available',
              ward: l.ward
            }))}
            searchWard={searchQuery}
            height="calc(100vh - 200px)"
            onRoomClick={(roomId) => navigate(`/rooms/${roomId}`)}
            onBoundsChange={handleBoundsChange}
          />
          {/* Viewport count badge */}
          <div style={{
            position: 'absolute', top: 12, left: 12, zIndex: 10,
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
            borderRadius: 20, padding: '6px 14px', fontSize: '0.82rem',
            fontWeight: 700, boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
            color: '#1e293b',
          }}>
            {viewportListings.length} of {mapListings.length} listings in view
          </div>
          {hasMore ? (
            <button type="button" className="btn btn--ghost btn--small"
              style={{ position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
              onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? t('search.loadingMore') : t('search.loadMoreMap')}
            </button>
          ) : null}
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
                          <ListingCard key={listing.id} listing={listing} />
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
                            <ListingCard key={listing.id} listing={listing} />
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
