import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
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

function getComingSoonDetails(listing: any) {
  const isComingSoonFlag = listing.isComingSoon || listing.is_coming_soon || false;
  const status = listing.vacancyStatus || listing.vacancy_status;
  const isLegacy = status === 'available_soon' || status === 'coming_soon' || status === 'listed_occupied';
  const availableFrom = listing.availableFrom || listing.available_from;

  let isSoon = false;
  if (isComingSoonFlag) {
    if (!availableFrom) isSoon = true;
    else {
      const availDate = new Date(availableFrom + 'T00:00:00').getTime();
      isSoon = availDate > new Date().setHours(0, 0, 0, 0);
    }
  } else if (isLegacy) {
    isSoon = true;
  }

  let daysUntil = null;
  if (availableFrom) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const availDate = new Date(availableFrom + 'T00:00:00');
    availDate.setHours(0, 0, 0, 0);
    const diffTime = availDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0) daysUntil = diffDays;
  }
  return { isComingSoon: isSoon, daysUntil, availableFrom };
}

function formatAvailableFrom(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('sw-TZ', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function ListingCard({
  listing,
  onSave,
}: {
  listing: any;
  onSave?: (id: string) => void;
}) {
  const serviceCharge = Number(listing.service_charge_tzs || listing.serviceChargeTzs || 0);
  const baseRent = Number(listing.priceMonthly || listing.price_tzs || 0);
  const monthlyTotal = baseRent + serviceCharge;
  const hasServiceCharge = serviceCharge > 0;

  const { isComingSoon: comingSoon, daysUntil, availableFrom } = getComingSoonDetails(listing);

  return (
    <div className="listing-card-wrapper">
      <Link to={`/rooms/${listing.id}`} className="listing-card">
        <div className="listing-card__image-wrap">
          <img
            className="listing-card__image"
            src={listing.imageUrl}
            alt={listing.title}
            loading="lazy"
          />
          {listing.verified ? <VerifiedBadge /> : null}

          {/* ── Coming Soon badge (jade, top-left) ── */}
          {comingSoon ? (
            <span
              className="listing-card__chip"
              style={{
                background: 'var(--jade, #22c55e)',
                color: '#fff',
                position: 'absolute',
                top: 10,
                left: 10,
                fontWeight: 700,
                fontSize: '0.75rem',
                padding: '0.3rem 0.65rem',
                borderRadius: 999,
                boxShadow: '0 2px 8px rgba(34,197,94,0.35)',
              }}
            >
              {daysUntil !== null ? `Inakuja: Siku ${daysUntil}` : 'Inakuja Hivi Karibuni'}
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

          <div
            className="listing-card__price-row"
            style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '0.2rem' }}
          >
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--brand, #22c55e)' }}>
              {formatTZS(hasServiceCharge ? monthlyTotal : baseRent)}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--mid)', fontWeight: 500 }}>/ month</span>
          </div>

          {/* ── Available-from chip (muted, below price) ── */}
          {comingSoon && availableFrom && (
            <p style={{
              margin: '0.35rem 0 0',
              fontSize: '0.78rem',
              color: 'var(--mid, #64748b)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: 'var(--cream, #f8fafc)',
              padding: '0.2rem 0.55rem',
              borderRadius: 999,
              border: '1px solid var(--border, #e2e8f0)',
            }}>
              📅 Inapatikana {formatAvailableFrom(availableFrom)} {daysUntil !== null ? `(baada ya siku ${daysUntil})` : ''}
            </p>
          )}
        </div>
      </Link>

      {/* ── "Hifadhi & Arifiwa" CTA for coming-soon rooms ── */}
      {comingSoon && onSave && (
        <button
          type="button"
          aria-label="Hifadhi na uarifwe"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSave(listing.id); }}
          style={{
            position: 'absolute',
            bottom: '0.75rem',
            right: '0.75rem',
            background: 'var(--jade, #22c55e)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.4rem 0.75rem',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
            transition: 'transform 0.15s',
            zIndex: 5,
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Bookmark size={12} /> Hifadhi &amp; Arifiwa
        </button>
      )}
    </div>
  );
}
