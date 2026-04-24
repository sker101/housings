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
    <Link to={`/rooms/${listing.id}`} className="listing-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
      <div className="listing-card__image-wrap" style={{ position: 'relative', width: '100%', aspectRatio: '4/3', borderRadius: '12px', overflow: 'hidden', marginBottom: '0.75rem' }}>
        <img
          className="listing-card__image"
          src={listing.imageUrl}
          alt={listing.title}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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

      <div className="listing-card__content" style={{ padding: '0 0.25rem' }}>
        <h3 style={{ margin: '0 0 0.2rem', fontSize: '1rem', fontWeight: 600, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {listing.title}
        </h3>
        <p className="listing-card__address" style={{ margin: '0 0 0.3rem', fontSize: '0.85rem', color: '#6b6b5a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {listing.location}
        </p>

        <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e' }}>
            {formatTZS(hasServiceCharge ? monthlyTotal : baseRent)}
          </span>
          <span style={{ fontSize: '0.85rem', color: '#1a1a2e' }}>/ month</span>
        </div>
      </div>
    </Link>
  );
}

