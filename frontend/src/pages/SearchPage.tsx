import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ListingMap from '../components/ListingMap';
import ListingCard from '../components/ListingCard';
import { useAuth } from '../context/AuthContext';
import SkeletonCard from '../components/SkeletonCard';
import {
  fetchApprovedListings,
  fetchSavedListingIds,
  toggleSavedListing
} from '../lib/listings';
import { SORT_OPTIONS, ROOM_TYPES } from '../lib/constants';

const UNIVERSITIES = {
  udsm: { label: 'UDSM', lat: -6.7798, lng: 39.2045 },
  ardhi: { label: 'Ardhi', lat: -6.7720, lng: 39.2274 },
  muhimbili: { label: 'Muhimbili', lat: -6.8041, lng: 39.2745 },
  sua: { label: 'SUA', lat: -6.8480, lng: 37.6443 }
};

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
  const { user, token } = useAuth();
  const { t } = useTranslation();

  const [filters, setFilters] = useState({
    query: searchParams.get('q') || '',
    roomType: 'all',
    genderPreference: 'any',
    utilitiesIncluded: 'any',
    university: 'any',
    minPrice: '',
    maxPrice: '',
    sort: 'newest'
  });
  const [viewMode, setViewMode] = useState('list');
  const [listings, setListings] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const loadMoreRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function runSearch() {
      setLoading(true);
      setError('');

      try {
        const rows = await fetchApprovedListings(
          { ...filters, limit: PAGE_SIZE, offset: 0 },
          token
        );

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
  }, [filters, token]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    setError('');

    try {
      const rows = await fetchApprovedListings(
        {
          ...filters,
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
  }, [filters, hasMore, loading, loadingMore, page, token]);

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

    if (filters.utilitiesIncluded === 'yes') {
      result = result.filter(l => l.amenities && (l.amenities.includes('water') || l.amenities.includes('electricity') || l.amenities.includes('wifi')));
    }

    if (filters.university !== 'any' && UNIVERSITIES[filters.university as keyof typeof UNIVERSITIES]) {
      const uni = UNIVERSITIES[filters.university as keyof typeof UNIVERSITIES];
      result = result.map(l => {
        if (!l.lat || !l.lng) return l;
        const dist = getDistanceKm(uni.lat, uni.lng, Number(l.lat), Number(l.lng));
        return { ...l, distanceKm: dist, distanceStr: `${dist.toFixed(1)} km from ${uni.label}` };
      });
      // Sort by distance automatically
      result.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
    }

    return result;
  }, [listings, filters.utilitiesIncluded, filters.university]);

  const mapListings = useMemo(() => processedListings, [processedListings]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleSave = async (listingId) => {
    if (!user?.userId || !token) {
      setError(t('search.loginToSave'));
      return;
    }

    try {
      const nextSaved = await toggleSavedListing({
        tenantId: user.userId,
        listingId,
        accessToken: token
      });

      setSavedIds((prev) => {
        const next = new Set(prev);
        if (nextSaved) {
          next.add(listingId);
        } else {
          next.delete(listingId);
        }
        return next;
      });
    } catch (err) {
      setError(err.message);
    }
  };

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

      <section className="filter-drawer">
        <input
          type="search"
          value={filters.query}
          onChange={(event) => updateFilter('query', event.target.value)}
          placeholder={t('search.placeholder')}
        />

        <select
          value={filters.university}
          onChange={(event) => updateFilter('university', event.target.value)}
        >
          <option value="any">Any University</option>
          <option value="udsm">UDSM</option>
          <option value="ardhi">Ardhi</option>
          <option value="muhimbili">Muhimbili</option>
          <option value="sua">SUA</option>
        </select>

        <select
          value={filters.utilitiesIncluded}
          onChange={(event) => updateFilter('utilitiesIncluded', event.target.value)}
        >
          <option value="any">Utilities (Any)</option>
          <option value="yes">Included</option>
        </select>

        <select
          value={filters.roomType}
          onChange={(event) => updateFilter('roomType', event.target.value)}
        >
          <option value="all">{t('search.anyRoomType')}</option>
          {ROOM_TYPES.map(op => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>

        <select
          value={filters.genderPreference}
          onChange={(event) => updateFilter('genderPreference', event.target.value)}
        >
          <option value="any">{t('search.anyGender')}</option>
          <option value="male">{t('search.male')}</option>
          <option value="female">{t('search.female')}</option>
        </select>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="range"
            min="0"
            max="500000"
            step="10000"
            value={filters.maxPrice || 500000}
            onChange={(event) => { updateFilter('maxPrice', event.target.value); updateFilter('minPrice', '0'); }}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            Max: {filters.maxPrice ? `${Number(filters.maxPrice).toLocaleString()} TZS` : '500k+'}
          </span>
        </div>

        <select
          value={filters.sort}
          onChange={(event) => updateFilter('sort', event.target.value)}
        >
          {SORT_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </section>

      {error ? <p className="error-text">{error}</p> : null}

      {viewMode === 'map' ? (
        <section className="card map-view">
          <h2>Map View</h2>
          <ListingMap
            listings={mapListings}
            onMarkerSelect={(listing) => navigate(`/rooms/${listing.id}`)}
          />
          {hasMore ? (
            <button type="button" className="btn btn--ghost btn--small" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? t('search.loadingMore') : t('search.loadMoreMap')}
            </button>
          ) : null}
        </section>
      ) : (
        <>
          <div className="listing-grid">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            ) : processedListings.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 1rem' }}>
                <p style={{ color: 'var(--mid)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  {t('search.noResults')}
                </p>
                <p style={{ color: 'var(--mid)', fontSize: '0.95rem' }}>
                  No available rooms match your filters. Rooms that have already been rented are hidden automatically.
                </p>
              </div>
            ) : (
              processedListings.map((listing: any) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onToggleSave={handleToggleSave}
                  isSaved={savedIds.has(listing.id)}
                />
              ))
            )}
          </div>

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
