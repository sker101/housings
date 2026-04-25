import { Link } from 'react-router-dom';

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
  return status === 'available_soon' || status === 'coming_soon' || status === 'listed_occupied';
}

export default function ListingCard({ listing }: {
  listing: any;
}) {
  const serviceCharge = Number(listing.service_charge_tzs || listing.serviceChargeTzs || 0);
  const baseRent = Number(listing.priceMonthly || 0);
  const monthlyTotal = baseRent + serviceCharge;
  const hasServiceCharge = serviceCharge > 0;

  return (
    <Link to={`/rooms/${listing.id}`} className="listing-card">
      <div className="listing-card__image-wrap">
        <img
          className="listing-card__image"
          src={listing.imageUrl}
          alt={listing.title}
          loading="lazy"
        />
        {listing.verified ? <VerifiedBadge /> : null}

        {isComingSoon(listing.vacancyStatus) ? (
          <span className="listing-card__chip" style={{
            background: '#f59e0b', color: '#fff',
          }}>
            Coming Soon
          </span>
        ) : (
          <span className={`listing-card__chip status-${listing.vacancyStatus || 'available'}`}>
            {humanize(listing.vacancyStatus || 'available')}
          </span>
        )}
      </div>

      <div className="listing-card__content">
        <h3>{listing.title}</h3>
        <p className="listing-card__address">{listing.location}</p>

        <div className="listing-card__price-row" style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '0.2rem' }}>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--brand)' }}>
            {formatTZS(hasServiceCharge ? monthlyTotal : baseRent)}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--mid)', fontWeight: 500 }}>/ month</span>
        </div>
      </div>
    </Link>
  );
}

