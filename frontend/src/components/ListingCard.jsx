import { Link } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';

export default function ListingCard({ listing }) {
  const rentAmount = Number(listing.rentAmount || 0);
  const occupancy = (listing.roomType || listing.occupancyType || 'Single').replace('_', ' ');
  const distance = listing.distanceLabel || 'Near campus';
  const imageUrl =
    listing.imageUrl ||
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80';

  return (
    <article className="listing-card">
      <div className="listing-card__image-wrap">
        <img className="listing-card__image" src={imageUrl} alt={listing.title} loading="lazy" />
        <span className="listing-card__chip listing-card__chip--price">
          {new Intl.NumberFormat('en-TZ').format(rentAmount)} TZS/mo
        </span>
        {listing.verified ? <VerifiedBadge /> : null}
      </div>

      <div className="listing-card__content">
        <div className="listing-card__top">
          <h3>{listing.title}</h3>
        </div>

        <p className="listing-card__address">{listing.location || listing.address}</p>

        <div className="listing-card__meta">
          <span>{distance}</span>
          <span>{occupancy}</span>
        </div>

        <Link to={`/rooms/${listing.id}`} state={{ listing }} className="listing-card__action listing-card__action-link">
          View Details
        </Link>
      </div>
    </article>
  );
}
