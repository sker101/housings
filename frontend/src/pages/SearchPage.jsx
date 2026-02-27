import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import { useAuth } from '../context/AuthContext';
import {
  fetchApprovedListings,
  fetchSavedListingIds,
  toggleSavedListing
} from '../lib/listings';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price low to high' },
  { value: 'price_desc', label: 'Price high to low' }
];

export default function SearchPage() {
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
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function runSearch() {
      setLoading(true);
      setError('');

      try {
        const rows = await fetchApprovedListings(filters, token);

        if (mounted) {
          setListings(rows);
        }
      } catch (err) {
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

    runSearch();

    return () => {
      mounted = false;
    };
  }, [filters, token]);

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

    return `${listings.length} results`;
  }, [loading, listings.length]);

  const mapPoints = useMemo(() => {
    const withCoords = listings
      .filter(
        (listing) =>
          Number.isFinite(Number(listing.lat)) && Number.isFinite(Number(listing.lng))
      )
      .map((listing) => ({
        id: listing.id,
        title: listing.title,
        lat: Number(listing.lat),
        lng: Number(listing.lng)
      }));

    if (withCoords.length === 0) {
      return [];
    }

    const lats = withCoords.map((item) => item.lat);
    const lngs = withCoords.map((item) => item.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latRange = Math.max(maxLat - minLat, 0.01);
    const lngRange = Math.max(maxLng - minLng, 0.01);

    return withCoords.map((item) => ({
      ...item,
      x: ((item.lng - minLng) / lngRange) * 100,
      y: ((maxLat - item.lat) / latRange) * 100
    }));
  }, [listings]);

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
          <option value="single">Single</option>
          <option value="shared">Shared</option>
          <option value="bedsit">Bedsit</option>
          <option value="studio">Studio</option>
          <option value="apartment">Apartment</option>
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
          {mapPoints.length === 0 ? (
            <p className="muted">No listing coordinates available for this result set.</p>
          ) : (
            <>
              <div className="map-canvas" aria-label="Listing map preview">
                {mapPoints.map((point) => (
                  <Link
                    key={point.id}
                    to={`/rooms/${point.id}`}
                    className="map-marker"
                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                    title={point.title}
                  >
                    •
                  </Link>
                ))}
              </div>
              <p className="muted map-note">
                Tap a marker to open listing details. Leaflet integration is planned in the next
                UI pass.
              </p>
            </>
          )}
        </section>
      ) : (
        <div className="listing-grid">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onToggleSave={handleToggleSave}
              isSaved={savedIds.has(listing.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
