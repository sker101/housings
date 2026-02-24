import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { apiClient, extractErrorMessage } from '../api/client';
import VerifiedBadge from '../components/VerifiedBadge';
import { FALLBACK_IMAGES, findDummyRoomById, mapApiListing } from '../data/rooms';

const STRUCTURED_DETAILS_MARKER = 'Structured Details:';
const DEFAULT_ROOM_IMAGE = FALLBACK_IMAGES[0];

function normalizeDetailKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function humanizeText(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => {
      if (part === part.toUpperCase() && part.length <= 4) {
        return part;
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

function parseBedsBaths(value) {
  const match = String(value || '')
    .trim()
    .match(/^(\d+)\s*\/\s*(\d+)$/);

  if (!match) {
    return [null, null];
  }

  return [Number(match[1]), Number(match[2])];
}

function parsePhotoEvidenceLine(line) {
  const trimmed = String(line || '').trim();
  const match = trimmed.match(/\[([^\]]+)\]\s*(.+)$/);

  if (!match) {
    return {
      angle: 'Photo',
      file: trimmed
    };
  }

  return {
    angle: humanizeText(match[1]),
    file: match[2].trim()
  };
}

function parseStructuredDescription(rawDescription) {
  const text = String(rawDescription || '').trim();
  const markerIndex = text.indexOf(STRUCTURED_DETAILS_MARKER);
  const summary = markerIndex >= 0 ? text.slice(0, markerIndex).trim() : text;
  const structuredBlock = markerIndex >= 0 ? text.slice(markerIndex + STRUCTURED_DETAILS_MARKER.length).trim() : '';

  const details = {};
  const photoEvidence = [];
  const acceptedPolicies = [];

  if (!structuredBlock) {
    return { summary, details, photoEvidence, acceptedPolicies };
  }

  let section = 'details';
  structuredBlock
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      if (/^photo evidence\s*:?$/i.test(line)) {
        section = 'photos';
        return;
      }

      if (/^accepted policies\s*:?$/i.test(line)) {
        section = 'policies';
        return;
      }

      if (section === 'details') {
        const match = line.match(/^-+\s*([^:]+):\s*(.+)$/) || line.match(/^([^:]+):\s*(.+)$/);
        if (!match) {
          return;
        }

        const key = normalizeDetailKey(match[1]);
        const value = match[2].trim();
        if (key && value) {
          details[key] = value;
        }
        return;
      }

      const cleaned = line.replace(/^\d+\.\s*/, '').replace(/^-+\s*/, '').trim();
      if (!cleaned) {
        return;
      }

      if (section === 'photos') {
        photoEvidence.push(cleaned);
      } else if (section === 'policies') {
        acceptedPolicies.push(cleaned);
      }
    });

  return { summary, details, photoEvidence, acceptedPolicies };
}

function pickDetail(details, ...keys) {
  for (const key of keys) {
    const normalized = normalizeDetailKey(key);
    if (details[normalized]) {
      return details[normalized];
    }
  }

  return '';
}

function toMapUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function isReadableSummary(value) {
  const text = String(value || '').trim();
  if (!text) {
    return false;
  }

  if (!/\s/.test(text) && text.length > 40) {
    return false;
  }

  const hasVeryLongToken = text
    .split(/\s+/)
    .some((token) => token.replace(/[^a-z0-9]/gi, '').length >= 30);

  return !hasVeryLongToken;
}

export default function RoomDetailsPage() {
  const { roomId } = useParams();
  const location = useLocation();

  const [room, setRoom] = useState(location.state?.listing || null);
  const [loading, setLoading] = useState(!location.state?.listing);
  const [error, setError] = useState('');
  const [heroImage, setHeroImage] = useState(location.state?.listing?.imageUrl || DEFAULT_ROOM_IMAGE);

  useEffect(() => {
    let isMounted = true;

    async function loadRoom() {
      if (!roomId) {
        return;
      }

      const dummyRoom = findDummyRoomById(roomId);
      if (dummyRoom) {
        setRoom(dummyRoom);
        setLoading(false);
        return;
      }

      if (!location.state?.listing) {
        setLoading(true);
      }
      setError('');

      try {
        const { data } = await apiClient.get(`/public/listings/${roomId}`);
        if (isMounted) {
          setRoom(mapApiListing(data, 0));
          setError('');
        }
      } catch (err) {
        if (isMounted && !location.state?.listing) {
          setError(extractErrorMessage(err));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadRoom();

    return () => {
      isMounted = false;
    };
  }, [roomId, location.state?.listing]);

  useEffect(() => {
    const firstGalleryPhoto = Array.isArray(room?.photos) ? room.photos.find((photo) => Boolean(photo?.url)) : null;
    setHeroImage(firstGalleryPhoto?.url || room?.imageUrl || DEFAULT_ROOM_IMAGE);
  }, [room?.photos, room?.imageUrl]);

  const title = useMemo(() => room?.title || 'Room Details', [room]);

  const parsedDescription = useMemo(() => parseStructuredDescription(room?.description), [room?.description]);
  const details = parsedDescription.details;
  const [bedsFromDetails, bathsFromDetails] = parseBedsBaths(pickDetail(details, 'Bedrooms/Bathrooms'));

  const bedrooms = Number.isFinite(Number(room?.bedrooms)) ? Number(room.bedrooms) : bedsFromDetails;
  const bathrooms = Number.isFinite(Number(room?.bathrooms)) ? Number(room.bathrooms) : bathsFromDetails;
  const propertyType = humanizeText(pickDetail(details, 'Property Type')) || humanizeText(room?.roomType);
  const listingType = humanizeText(pickDetail(details, 'Listing Type'));
  const paymentFrequency = humanizeText(pickDetail(details, 'Payment Frequency'));
  const genderPreference = humanizeText(pickDetail(details, 'Gender Preference'));
  const depositRequired = pickDetail(details, 'Deposit Required');
  const depositRefundable = pickDetail(details, 'Deposit Refundable');
  const nearbyUniversity = pickDetail(details, 'Nearby University');
  const mapPinUrl = toMapUrl(pickDetail(details, 'Map Pin'));
  const houseRules = pickDetail(details, 'House Rules');
  const amenities = pickDetail(details, 'Amenities')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
  const monthlyRentLabel = `${new Intl.NumberFormat('en-TZ').format(Number(room?.rentAmount || 0))} TZS / month`;
  const summaryText = isReadableSummary(parsedDescription.summary)
    ? parsedDescription.summary
    : 'This verified room listing is available for students near UDSM. Contact the landlord directly through CampusStay TZ.';
  const photoEvidenceItems = parsedDescription.photoEvidence.map(parsePhotoEvidenceLine);
  const galleryPhotos = useMemo(() => {
    const fromApi = Array.isArray(room?.photos)
      ? room.photos
          .filter((photo) => Boolean(photo?.url))
          .map((photo, index) => ({
            id: photo.id || `${room?.id || 'listing'}-photo-${index}`,
            angle: humanizeText(photo.angle || 'Photo'),
            url: photo.url
          }))
      : [];

    if (fromApi.length > 0) {
      return fromApi;
    }

    if (room?.imageUrl) {
      return [
        {
          id: `${room.id || 'listing'}-fallback-photo`,
          angle: 'Room',
          url: room.imageUrl
        }
      ];
    }

    return [
      {
        id: 'default-room-photo',
        angle: 'Room',
        url: DEFAULT_ROOM_IMAGE
      }
    ];
  }, [room?.id, room?.imageUrl, room?.photos]);

  const overviewItems = [
    { label: 'Bedrooms', value: bedrooms ?? 'Not specified' },
    { label: 'Bathrooms', value: bathrooms ?? 'Not specified' },
    { label: 'Property Type', value: propertyType || 'Not specified' },
    { label: 'Listing Type', value: listingType || 'Not specified' },
    { label: 'Payment Frequency', value: paymentFrequency || 'Not specified' },
    { label: 'Gender Preference', value: genderPreference || 'Not specified' },
    { label: 'Deposit Required', value: depositRequired || 'Not specified' },
    { label: 'Deposit Refundable', value: depositRefundable || 'Not specified' }
  ];

  const handleHeroImageError = () => {
    if (heroImage !== DEFAULT_ROOM_IMAGE) {
      setHeroImage(DEFAULT_ROOM_IMAGE);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <section className="card">
          <h1>Loading room details...</h1>
        </section>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="container">
        <section className="card">
          <h1>Room details unavailable</h1>
          <p className="error-text">{error || 'This room was not found.'}</p>
          <Link to="/" className="btn">
            Back to listings
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="container room-details-page">
      <section className="room-details-hero card">
        <div className="room-details-hero__image-wrap">
          <img src={heroImage} alt={title} className="room-details-hero__image" onError={handleHeroImageError} />
        </div>

        <div className="room-details-hero__content">
          <p className="room-details-hero__eyebrow">{room.location}</p>
          <h1>{title}</h1>

          <div className="room-details-hero__chips">
            {room.verified ? <VerifiedBadge /> : null}
            <span className="room-details-chip room-details-chip--price">{monthlyRentLabel}</span>
            <span className="room-details-chip">{nearbyUniversity ? `Near ${nearbyUniversity}` : room.distanceLabel || 'Near UDSM'}</span>
            <span className="room-details-chip">{propertyType || 'Single'}</span>
          </div>

          <p className="room-details-hero__desc">{summaryText}</p>

          <div className="room-details-hero__actions">
            <Link to="/login" className="btn">
              Contact Landlord
            </Link>
            <Link to="/" className="btn btn--ghost">
              Back to Rooms
            </Link>
          </div>

          {galleryPhotos.length > 0 ? (
            <div className="room-details-gallery">
              <p className="room-details-gallery__title">Room Photos</p>
              <div className="room-details-gallery__track">
                {galleryPhotos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    className={`room-details-gallery__item ${heroImage === photo.url ? 'is-active' : ''}`}
                    onClick={() => setHeroImage(photo.url)}
                  >
                    <img src={photo.url} alt={`${title} - ${photo.angle}`} loading="lazy" />
                    <span>{photo.angle}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="card">
        <h2>Property Overview</h2>
        <div className="room-overview-grid">
          {overviewItems.map((item) => (
            <article key={item.label} className="room-overview-item">
              <p>{item.label}</p>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="card room-details-meta-grid">
        <article className="room-details-meta-card">
          <h2>Amenities</h2>
          {amenities.length > 0 ? (
            <div className="room-details-amenities">
              {amenities.map((amenity) => (
                <span key={amenity} className="room-details-chip">
                  {amenity}
                </span>
              ))}
            </div>
          ) : (
            <p className="room-details-muted">Amenities were not specified for this listing.</p>
          )}
        </article>

        <article className="room-details-meta-card">
          <h2>Location</h2>
          <p className="room-details-location">{room.location}</p>
          {mapPinUrl ? (
            <a href={mapPinUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--small">
              Open Map Pin
            </a>
          ) : (
            <p className="room-details-muted">Map pin is not available.</p>
          )}
        </article>
      </section>

      <section className="card room-details-meta-grid">
        <article className="room-details-meta-card">
          <h2>House Rules</h2>
          <p className="room-details-copy">{houseRules || 'No additional house rules were provided by the lister.'}</p>
        </article>

        <article className="room-details-meta-card">
          <h2>Photo Checklist</h2>
          {photoEvidenceItems.length > 0 ? (
            <ul className="room-photo-list">
              {photoEvidenceItems.map((item, index) => (
                <li key={`${item.angle}-${item.file}-${index}`}>
                  <span>{item.angle}</span>
                  <strong>{item.file}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="room-details-muted">Photos are reviewed in admin checks before the listing goes live.</p>
          )}
        </article>
      </section>

      {parsedDescription.acceptedPolicies.length > 0 ? (
        <section className="card">
          <h2>Accepted Platform Policies</h2>
          <ul className="room-details-list">
            {parsedDescription.acceptedPolicies.map((policy) => (
              <li key={policy}>{policy}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card">
        <h2>Safety Notes</h2>
        <ul className="room-details-list">
          <li>Meet landlords in safe public locations for first viewing.</li>
          <li>Verify all terms before paying any deposit.</li>
          <li>Use verified listings only to reduce scam risk.</li>
        </ul>
      </section>
    </div>
  );
}
