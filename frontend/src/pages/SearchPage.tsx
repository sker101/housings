import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

const PAGE_SIZE = 24;

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();

  const [filters, setFilters] = useState({
    query: searchParams.get('q') || '',
    roomType: 'all',
    genderPreference: 'any',
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
      return 'Searching...';
    }

    return `Showing ${listings.length} result${listings.length === 1 ? '' : 's'}`;
  }, [loading, listings.length]);

  const mapListings = useMemo(() => listings, [listings]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleSave = async (listingId) => {
    if (!user?.userId || !token) {
      setError('Login to save listings.');
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
          <h1>Search Listings</h1>
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
          placeholder="Search title, district, ward"
        />

        <select
          value={filters.roomType}
          onChange={(event) => updateFilter('roomType', event.target.value)}
        >
          <option value="all">Any room type</option>
          {ROOM_TYPES.map(op => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>

        <select
          value={filters.genderPreference}
          onChange={(event) => updateFilter('genderPreference', event.target.value)}
        >
          <option value="any">Any gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

        <input
          type="number"
          value={filters.minPrice}
          onChange={(event) => updateFilter('minPrice', event.target.value)}
          placeholder="Min monthly price"
        />

        <input
          type="number"
          value={filters.maxPrice}
          onChange={(event) => updateFilter('maxPrice', event.target.value)}
          placeholder="Max monthly price"
        />

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
              {loadingMore ? 'Loading...' : 'Load more map results'}
            </button>
          ) : null}
        </section>
      ) : (
        <>
          <div className="listing-grid">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              listings.map((listing) => (
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
                {loadingMore ? 'Loading more...' : 'Load more'}
              </button>
              <div ref={loadMoreRef} aria-hidden="true" />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
