import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import { useAuth } from '../context/AuthContext';
import {
  fetchApprovedListings,
  fetchSavedListingIds,
  toggleSavedListing
} from '../lib/listings';

const UNIVERSITY_OPTIONS = ['UDSM', 'ARDHI', 'MUHAS', 'IFM'];

export default function HomePage() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();

  const [query, setQuery] = useState('');
  const [university, setUniversity] = useState('UDSM');
  const [featuredListings, setFeaturedListings] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadListings() {
      setLoading(true);
      setError('');

      try {
        const rows = await fetchApprovedListings(
          {
            query: '',
            sort: 'featured',
            limit: 12
          },
          token
        );

        if (mounted) {
          setFeaturedListings(rows);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setFeaturedListings([]);
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
  }, [token]);

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

  const shownListings = useMemo(() => {
    return featuredListings.filter((listing) => {
      if (university === 'ALL') {
        return true;
      }

      if (!Array.isArray(listing.nearUniversities)) {
        return false;
      }

      return listing.nearUniversities.includes(university);
    });
  }, [featuredListings, university]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const params = new URLSearchParams();
    if (query.trim()) {
      params.set('q', query.trim());
    }
    if (university && university !== 'ALL') {
      params.set('university', university);
    }

    navigate(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handleToggleSave = async (listingId) => {
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

      setSavedIds((prev) => {
        const updated = new Set(prev);
        if (nextSaved) {
          updated.add(listingId);
        } else {
          updated.delete(listingId);
        }
        return updated;
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <section className="hero">
        <div className="hero__content container">
          <p className="hero__eyebrow">Verified Student Housing</p>
          <h1>Find trusted rooms near campus in minutes.</h1>
          <p className="hero__subtitle">
            Search, compare, and message verified listers around Dar es Salaam.
          </p>

          <form className="search-panel" onSubmit={handleSearchSubmit}>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, ward, district"
            />

            <select
              value={university}
              onChange={(event) => setUniversity(event.target.value)}
            >
              <option value="ALL">All universities</option>
              {UNIVERSITY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button type="submit" className="btn">
              Search
            </button>
          </form>

          <div className="hero__chips">
            {UNIVERSITY_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                className={`hero__chip ${university === item ? 'is-active' : ''}`}
                onClick={() => setUniversity(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section__header">
          <div>
            <h2>Featured Listings</h2>
            <p>Approved and verified homes from trusted listers.</p>
          </div>
          <Link to="/search">View all</Link>
        </div>

        {loading ? <p className="muted">Loading listings...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        <div className="listing-grid">
          {shownListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onToggleSave={handleToggleSave}
              isSaved={savedIds.has(listing.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
