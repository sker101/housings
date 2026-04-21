import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import VerifiedBadge from './VerifiedBadge';

function formatTZS(value: number | string | undefined) {
  return new Intl.NumberFormat('sw-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function humanize(value: string | undefined) {
  if (!value) return 'Not set';
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isComingSoon(status: string | undefined): boolean {
  return status === 'available_soon' || status === 'listed_occupied';
}

export default function ListingCard({ listing, onToggleSave, isSaved = false }: {
  listing: any;
  onToggleSave?: (_id: string) => void;
  isSaved?: boolean;
}) {
  const { t } = useTranslation();
  const serviceCharge = Number(listing.service_charge_tzs || listing.serviceChargeTzs || 0);
  const baseRent = Number(listing.priceMonthly || 0);
  const monthlyTotal = baseRent + serviceCharge;
  const hasServiceCharge = serviceCharge > 0;

  return (
    <article className="listing-card">
      <Link to={`/rooms/${listing.id}`} className="listing-card__image-wrap">
        <img
          className="listing-card__image"
          src={listing.imageUrl}
          alt={listing.title}
          loading="lazy"
        />

        {/* Base rent chip */}
        <span className="listing-card__chip listing-card__chip--price">
          {formatTZS(baseRent)}{t('listingCard.perMonth')}
        </span>

        {/* Monthly total badge — shows when service charges apply */}
        {hasServiceCharge && (
          <span style={{
            position: 'absolute', bottom: 40, left: 8,
            background: 'rgba(22,101,52,0.92)', color: '#fff',
            borderRadius: 8, padding: '3px 10px', fontSize: '0.72rem',
            fontWeight: 700, backdropFilter: 'blur(4px)',
          }}>
            Total: {formatTZS(monthlyTotal)}/mo
          </span>
        )}

        {listing.verified ? <VerifiedBadge /> : null}

        {/* Vacancy / Coming Soon status chip */}
        {isComingSoon(listing.vacancyStatus) ? (
          <span style={{
            position: 'absolute', top: 8, left: 8,
            background: '#f59e0b', color: '#fff',
            borderRadius: 8, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700,
          }}>
            Coming Soon
          </span>
        ) : (
          <span className={`listing-card__chip listing-card__chip--status status-${listing.vacancyStatus || 'available'}`}>
            {humanize(listing.vacancyStatus || 'available')}
          </span>
        )}
      </Link>

      <div className="listing-card__content">
        <div>
          <h3>{listing.title}</h3>
          <p className="listing-card__address">{listing.location}</p>
        </div>

        <div className="listing-card__meta">
          <span>{humanize(listing.roomType)}</span>
          <span>{humanize(listing.genderPreference)}</span>
          {listing.distanceStr && (
            <span style={{ color: 'var(--jade)', fontWeight: 'bold' }}>📍 {listing.distanceStr}</span>
          )}
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

