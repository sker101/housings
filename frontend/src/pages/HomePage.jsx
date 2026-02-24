import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, extractErrorMessage } from '../api/client';
import ListingCard from '../components/ListingCard';
import { DUMMY_ROOMS, mapApiListing } from '../data/rooms';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=2200&q=80';

const DEFAULT_FILTERS = {
  location: 'ALL',
  priceBand: 'ALL'
};

const PRICE_BANDS = {
  ALL: {},
  UNDER_200K: { max: 200000 },
  RANGE_200_350: { min: 200000, max: 350000 },
  ABOVE_350: { min: 350000 }
};

export default function HomePage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [liveListings, setLiveListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const searchParams = useMemo(() => {
    const params = {
      universityCode: 'UDSM',
      page: 0,
      size: 48
    };

    if (filters.location !== 'ALL') {
      params.query = filters.location;
    }

    const band = PRICE_BANDS[filters.priceBand] || {};
    if (band.min != null) params.minRent = band.min;
    if (band.max != null) params.maxRent = band.max;

    return params;
  }, [filters]);

  useEffect(() => {
    let isMounted = true;

    async function loadListings() {
      setLoading(true);
      setError('');
      try {
        const { data } = await apiClient.get('/public/listings', { params: searchParams });
        if (isMounted) {
          setLiveListings((data.content || []).map(mapApiListing));
        }
      } catch (err) {
        if (isMounted) {
          setError(extractErrorMessage(err));
          setLiveListings([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadListings();
    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const featuredRooms = useMemo(() => {
    const source = liveListings.length > 0 ? liveListings : DUMMY_ROOMS;
    const band = PRICE_BANDS[filters.priceBand] || {};

    return source.filter((room) => {
      const locationMatch =
        filters.location === 'ALL' || room.location.toLowerCase().includes(filters.location.toLowerCase());

      const minMatch = band.min == null || Number(room.rentAmount) >= band.min;
      const maxMatch = band.max == null || Number(room.rentAmount) <= band.max;

      return locationMatch && minMatch && maxMatch;
    });
  }, [liveListings, filters]);

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <img className="landing-hero__image" src={HERO_IMAGE} alt="Student housing in Dar es Salaam" />
        <div className="landing-hero__overlay" />

        <div className="container landing-hero__inner">
          <p className="landing-hero__eyebrow">Verified rooms near UDSM</p>
          <h1>Find Affordable Student Housing in Dar es Salaam</h1>
          <p className="landing-hero__subtitle">
            Verified rooms so you can live safely, avoid brokers, and move fast.
          </p>

          <form className="hero-search" onSubmit={(event) => event.preventDefault()}>
            <select
              value={filters.location}
              onChange={(event) => setFilters((prev) => ({ ...prev, location: event.target.value }))}
            >
              <option value="ALL">All Locations</option>
              <option value="Ubungo">Ubungo</option>
              <option value="Sinza">Sinza</option>
              <option value="Mlimani">Mlimani</option>
              <option value="Mwenge">Mwenge</option>
              <option value="Makongo">Makongo</option>
            </select>

            <select
              value={filters.priceBand}
              onChange={(event) => setFilters((prev) => ({ ...prev, priceBand: event.target.value }))}
            >
              <option value="ALL">Any Price</option>
              <option value="UNDER_200K">Under 200k TZS</option>
              <option value="RANGE_200_350">200k - 350k TZS</option>
              <option value="ABOVE_350">Above 350k TZS</option>
            </select>

            <button className="btn btn--search" type="submit">
              Search
            </button>
          </form>

          {error ? <p className="landing-hero__note">Showing curated rooms while live listings refresh.</p> : null}
        </div>
      </section>

      <section id="featured-rooms" className="featured-section">
        <div className="container">
          <div className="section-header">
            <div>
              <h2>Featured Rooms</h2>
              <p>Hand-picked verified listings</p>
            </div>
            <a href="#featured-rooms">View All</a>
          </div>

          {loading ? <p className="loading-text">Refreshing listings...</p> : null}

          <div className="listing-grid">
            {featuredRooms.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </section>

      <section id="why-campusstay" className="why-section">
        <div className="container">
          <h2>Why Choose CampusStay?</h2>
          <p>We make finding student housing simple, safe, and affordable.</p>

          <div className="why-grid">
            <article className="why-card">
              <div className="why-card__icon">✓</div>
              <h3>Verified Listings</h3>
              <p>Every room is reviewed before going public to reduce scams.</p>
            </article>

            <article className="why-card">
              <div className="why-card__icon">☎</div>
              <h3>Direct Contact</h3>
              <p>Talk directly to landlords with no hidden broker fees.</p>
            </article>

            <article className="why-card">
              <div className="why-card__icon">$</div>
              <h3>Affordable Prices</h3>
              <p>Rooms across budgets, from budget shared options to private units.</p>
            </article>

            <article className="why-card">
              <div className="why-card__icon">🛡</div>
              <h3>Safe & Trusted</h3>
              <p>Built for students in Dar es Salaam with trust at the center.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="list-property" className="cta-strip">
        <div className="container">
          <div className="cta-strip__inner">
            <h2>Ready to find your perfect room?</h2>
            <p>Whether you are a student or a landlord, CampusStay TZ has you covered.</p>
            <div className="cta-strip__actions">
              <Link to="/" className="btn btn--light">
                Find a Room
              </Link>
              <Link to="/list-property" className="btn btn--ghost-light">
                List Property
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
