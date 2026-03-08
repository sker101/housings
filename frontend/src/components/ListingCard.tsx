import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import VerifiedBadge from './VerifiedBadge';

function formatPrice(value) {
  return `${new Intl.NumberFormat('en-TZ').format(Number(value || 0))} TZS`;
}

function humanize(value) {
  if (!value) {
    return 'Not set';
  }

  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ListingCard({ listing, onToggleSave, isSaved = false }) {
  const { t } = useTranslation();

  return (
    <article className="listing-card">
      <Link to={`/rooms/${listing.id}`} className="listing-card__image-wrap">
        <img
          className="listing-card__image"
          src={listing.imageUrl}
          alt={listing.title}
          loading="lazy"
        />
        <span className="listing-card__chip listing-card__chip--price">
          {formatPrice(listing.priceMonthly)}{t('listingCard.perMonth')}
        </span>
        {listing.verified ? <VerifiedBadge /> : null}
        <span className={`listing-card__chip listing-card__chip--status status-${listing.vacancyStatus || 'available'}`}>
          {humanize(listing.vacancyStatus || 'available')}
        </span>
      </Link>

      <div className="listing-card__content">
        <div>
          <h3>{listing.title}</h3>
          <p className="listing-card__address">{listing.location}</p>
        </div>

        <div className="listing-card__meta">
          <span>{humanize(listing.roomType)}</span>
          <span>{humanize(listing.genderPreference)}</span>
          {listing.avgRating ? (
            <span className="listing-card__rating" title={`${listing.avgRating}/5 stars`}>
              {'★'.repeat(Math.round(Number(listing.avgRating)))}{'☆'.repeat(5 - Math.round(Number(listing.avgRating)))}
              <span className="listing-card__rating-score"> {Number(listing.avgRating).toFixed(1)}</span>
            </span>
          ) : null}
        </div>

        <div className="listing-card__actions">
          <Link
            to={`/rooms/${listing.id}`}
            className="listing-card__action listing-card__action-link"
          >
            {t('listingCard.viewDetails')}
          </Link>

          {onToggleSave ? (
            <button
              type="button"
              className={`listing-card__save ${isSaved ? 'is-saved' : ''}`}
              onClick={() => onToggleSave(listing.id)}
            >
              {isSaved ? t('listingCard.saved') : t('listingCard.save')}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
