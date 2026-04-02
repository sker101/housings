import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ListingCard from '../components/ListingCard';
import ListingMap from '../components/ListingMap';
import { useAuth } from '../context/AuthContext';
import { APP_ROLE } from '../lib/roles';
import {
  createBookingRequest,
  fetchListingBookingsForUser,
  fetchListingById,
  fetchListingReviews,
  fetchRelatedListings,
  fetchSavedListingIds,
  toggleSavedListing
} from '../lib/listings';
import { countRows, insertRows, invokeFunction, selectRows, updateRows } from '../lib/supabase';

const MESSAGE_TEMPLATES = [
  'Hi, I am interested in this room. Is it still available?',
  'Can I schedule a viewing this week?',
  'Is rent negotiable if I pay several months in advance?'
];

const UNIVERSITY_COORDINATES = [
  { label: 'UDSM', lat: -6.7734, lng: 39.2431 },
  { label: 'Ardhi University', lat: -6.7738, lng: 39.2399 },
  { label: 'MUHAS', lat: -6.8222, lng: 39.2658 },
  { label: 'IFM', lat: -6.8169, lng: 39.2892 },
  { label: 'Mzumbe Campus', lat: -6.8106, lng: 39.2953 }
];

function formatPrice(value) {
  return `${new Intl.NumberFormat('en-TZ').format(Number(value || 0))} TZS / month`;
}

function formatDate(value) {
  if (!value) {
    return 'Not specified';
  }

  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function formatShortDate(value) {
  if (!value) {
    return 'Not specified';
  }

  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return value;
  }
}

function humanize(value) {
  if (!value) {
    return 'Not specified';
  }

  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function amenityEmoji(label) {
  const key = normalizeKey(label);
  const map = {
    wifi: '📶',
    internet: '🌐',
    water: '💧',
    electricity: '⚡',
    power: '⚡',
    generator: '🔋',
    security: '🛡️',
    guard: '🛡️',
    parking: '🚗',
    furnished: '🛋️',
    kitchen: '🍳',
    bathroom: '🚿',
    laundry: '🧺',
    ac: '❄️',
    fan: '🌀',
    balcony: '🌤️'
  };

  return map[key] || '🏠';
}

function parseHouseRules(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const compact = text.trim();
  if (!compact) {
    return [];
  }

  const byLine = compact
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (byLine.length > 1) {
    return byLine.map((line) => line.replace(/^[-\d.)\s]+/, '').trim());
  }

  const bySentence = compact
    .split(/[.;]\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/[.;]$/, '').trim());

  return bySentence.length > 1 ? bySentence : [compact];
}

function haversineDistanceKm(aLat, aLng, bLat, bLng) {
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRad(bLat - aLat);
  const deltaLng = toRad(bLng - aLng);

  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.sin(deltaLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RoomDetailsPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { user, token, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const [listing, setListing] = useState(null);
  const [listerProfile, setListerProfile] = useState(null);
  const [relatedListings, setRelatedListings] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [listerListingCount, setListerListingCount] = useState(0);
  const [savedIds, setSavedIds] = useState(new Set());
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [swipeStartX, setSwipeStartX] = useState(null);
  const [openInquiry, setOpenInquiry] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [inquiryName, setInquiryName] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [durationMonths, setDurationMonths] = useState('6');
  const [contactPreference, setContactPreference] = useState('in_app_chat');
  const [message, setMessage] = useState('');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Bookings state
  const [existingBooking, setExistingBooking] = useState(null);
  // const [bookingsLoading, setBookingsLoading] = useState(true);
  // const [bookings, setBookings] = useState([]);

  // Report state
  const [openReport, setOpenReport] = useState(false);
  const [reportReason, setReportReason] = useState('fraud');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState('');

  const monthlyRent = useMemo(() => Number((listing as any)?.priceMonthly ?? (listing as any)?.price_monthly ?? 0), [listing]);
  const securityDeposit = monthlyRent;
  const platformFee = 5000;
  const totalDueToday = monthlyRent + securityDeposit + platformFee;

  const REPORT_REASONS = [
    { value: 'fraud', label: '⚠️ Fraudulent / Scam Listing' },
    { value: 'photos_mismatch', label: '📷 Photos Don\'t Match Property' },
    { value: 'misleading_price', label: '💸 Price is Misleading' },
    { value: 'unsafe', label: '🔒 Unsafe or Illegal Property' },
    { value: 'harassment', label: '😠 Landlord Harassment' },
    { value: 'already_rented', label: '🔑 Already Rented Out' },
    { value: 'unconducive', label: '🏚️ Unconducive Environment' },
  ];

  async function submitReport(event) {
    event.preventDefault();
    if (!listing?.id) return;
    setSubmittingReport(true);
    setReportError('');
    try {
      await invokeFunction('process-report', {
        listing_id: listing.id,
        reason: reportReason,
        description: reportDescription,
      }, token);
      setReportSuccess(true);
      setReportDescription('');
      setTimeout(() => {
        setOpenReport(false);
        setReportSuccess(false);
        // Soft refresh: let the modal close, user doesn't need a hard reload.
      }, 2500);
    } catch (err) {
      setReportError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmittingReport(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadListing() {
      if (!roomId) {
        return;
      }

      setLoading(true);
      setError('');
      setNotice('');
      setRelatedLoading(true);

      try {
        const payload = await fetchListingById(roomId, token);
        if (!mounted) {
          return;
        }

        setListing(payload.listing);
        setListerProfile(payload.listerProfile);
        setActivePhotoIndex(0);

        invokeFunction('increment-view', { listingId: payload.listing.id }, token).catch(() => {
          // Best-effort analytics update.
        });

        const [related, listingCount, reviewsList] = await Promise.all([
          fetchRelatedListings(payload.listing, token, 6).catch(() => []),
          payload.listing.listerId
            ? countRows('listings', {
              filters: [
                { column: 'lister_id', op: 'eq', value: payload.listing.listerId },
                { column: 'status', op: 'eq', value: 'approved' }
              ],
              accessToken: token
            }).catch(() => 0)
            : Promise.resolve(0),
          fetchListingReviews(payload.listing.id, token).catch(() => [])
        ]);

        if (mounted) {
          setRelatedListings(related);
          setListerListingCount(listingCount);
          setReviews(reviewsList);
          setReviewsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setListing(null);
          setRelatedListings([]);
          setListerListingCount(0);
          setReviewsLoading(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setRelatedLoading(false);
        }
      }
    }

    loadListing();

    return () => {
      mounted = false;
    };
  }, [roomId, token]);

  useEffect(() => {
    if (user?.fullName && !inquiryName) {
      setInquiryName(user.fullName);
    }
  }, [user?.fullName, inquiryName]);

  useEffect(() => {
    let mounted = true;

    async function loadSavedIds() {
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

    loadSavedIds();

    return () => {
      mounted = false;
    };
  }, [user?.userId, token]);

  // Load existing bookings for this listing
  useEffect(() => {
    let mounted = true;

    async function loadBookings() {
      if (!listing?.id || !user?.userId || !token) {
        return;
      }

      try {
        const bookings = await fetchListingBookingsForUser({
          listingId: listing.id,
          userId: user.userId,
          accessToken: token
        });

        if (mounted) {
          setExistingBooking(bookings.length > 0 ? bookings[0] : null);
          // setBookings(activeBookings);
        }
      } catch (err) {
        console.error('Error fetching bookings:', err);
        if (mounted) {
          setExistingBooking(null);
        }
      } finally {
        if (mounted) {
          // setBookingsLoading(false); // This line was removed
        }
      }
    }

    loadBookings();

    return () => {
      mounted = false;
    };
  }, [listing?.id, user?.userId, token]);

  const amenities = useMemo(() => {
    if (!listing?.amenities || typeof listing.amenities !== 'object') {
      return [];
    }

    return Object.entries(listing.amenities)
      .map(([key, enabled]) => ({
        key,
        label: humanize(key),
        emoji: amenityEmoji(key),
        enabled: Boolean(enabled)
      }))
      .sort((a, b) => {
        // Enabled items first
        if (a.enabled !== b.enabled) return b.enabled ? 1 : -1;
        return a.label.localeCompare(b.label);
      });
  }, [listing?.amenities]);

  const houseRules = useMemo(
    () => parseHouseRules(listing?.houseRules),
    [listing?.houseRules]
  );

  const saved = useMemo(
    () => (listing?.id ? savedIds.has(listing.id) : false),
    [savedIds, listing?.id]
  );
  const canReserveListing = !isAuthenticated || user?.role === APP_ROLE.STUDENT;

  const galleryPhotos = useMemo(() => {
    if (!listing) {
      return [];
    }

    if (Array.isArray(listing.photos) && listing.photos.length > 0) {
      return listing.photos.map((photo, index) => ({
        ...photo,
        id: photo.id || `photo-${index}`
      }));
    }

    return [
      {
        id: 'fallback',
        public_url: listing.imageUrl,
        angle: 'main'
      }
    ];
  }, [listing]);

  useEffect(() => {
    if (activePhotoIndex >= galleryPhotos.length) {
      setActivePhotoIndex(0);
    }
  }, [activePhotoIndex, galleryPhotos.length]);

  const activePhoto = galleryPhotos[activePhotoIndex] || galleryPhotos[0] || null;

  const nearestUniversity = useMemo(() => {
    if (!listing?.lat || !listing?.lng) {
      return null;
    }

    const lat = Number(listing.lat);
    const lng = Number(listing.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    let closest = null;
    UNIVERSITY_COORDINATES.forEach((university) => {
      const distance = haversineDistanceKm(
        lat,
        lng,
        university.lat,
        university.lng
      );

      if (!closest || distance < closest.distanceKm) {
        closest = {
          name: university.label,
          distanceKm: distance
        };
      }
    });

    if (!closest) {
      return null;
    }

    return {
      ...closest,
      displayDistance: `${closest.distanceKm.toFixed(1)} km`
    };
  }, [listing?.lat, listing?.lng]);

  const facts = useMemo(
    () => [
      { label: t('roomDetails.roomType'), value: humanize(listing?.roomType) },
      { label: 'Property Type', value: humanize(listing?.propertyType) || 'N/A' },
      { label: 'Floor', value: humanize(listing?.floor) || 'N/A' },
      { label: 'Total Rooms', value: listing?.totalRooms ? String(listing.totalRooms) : 'N/A' },
      { label: 'Furnished', value: listing?.furnished ? 'Yes' : 'No' },
      { label: t('roomDetails.genderPreference'), value: humanize(listing?.genderPreference) },
      { label: t('roomDetails.utilitiesIncluded'), value: listing?.utilitiesIncluded ? t('roomDetails.yes') : t('roomDetails.no') },
      { label: t('roomDetails.vacancy'), value: humanize(listing?.vacancyStatus) },
      { label: t('roomDetails.availableFrom', { date: formatDate(listing?.availableFrom) }), value: '' },
      { label: t('roomDetails.views'), value: `${new Intl.NumberFormat('en-TZ').format(listing?.viewCount || 0)}` },
      { label: t('roomDetails.posted'), value: formatShortDate(listing?.createdAt) }
    ],
    [
      listing?.availableFrom,
      listing?.createdAt,
      listing?.floor,
      listing?.furnished,
      listing?.genderPreference,
      listing?.propertyType,
      listing?.roomType,
      listing?.totalRooms,
      listing?.utilitiesIncluded,
      listing?.vacancyStatus,
      listing?.viewCount,
      t
    ]
  );

  const handleToggleSave = async (targetListingId = listing?.id) => {
    if (!targetListingId) {
      return;
    }

    if (!isAuthenticated || !user?.userId) {
      navigate('/login', { state: { from: { pathname: `/rooms/${roomId}` } } });
      return;
    }

    setError('');

    try {
      const nextSaved = await toggleSavedListing({
        tenantId: user.userId,
        listingId: targetListingId,
        accessToken: token
      });

      setSavedIds((prev) => {
        const next = new Set(prev);
        if (nextSaved) {
          next.add(targetListingId);
        } else {
          next.delete(targetListingId);
        }
        return next;
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleShare = async () => {
    if (!listing) {
      return;
    }

    const shareData = {
      title: listing.title,
      text: `Check this listing on CampusStay TZ: ${listing.title}`,
      url: window.location.href
    };

    setError('');

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setNotice('Listing shared.');
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      setNotice('Link copied to clipboard.');
    } catch (shareError) {
      setError(
        shareError instanceof Error ? shareError.message : 'Unable to share listing.'
      );
    }
  };

  const goToPrevPhoto = () => {
    setActivePhotoIndex((current) => {
      if (galleryPhotos.length <= 1) {
        return current;
      }

      return current === 0 ? galleryPhotos.length - 1 : current - 1;
    });
  };

  const goToNextPhoto = () => {
    setActivePhotoIndex((current) => {
      if (galleryPhotos.length <= 1) {
        return current;
      }

      return current === galleryPhotos.length - 1 ? 0 : current + 1;
    });
  };

  const captureSwipeStart = (event) => {
    if (!event.changedTouches?.[0]) {
      return;
    }

    setSwipeStartX(event.changedTouches[0].clientX);
  };

  const captureSwipeEnd = (event) => {
    if (!event.changedTouches?.[0] || swipeStartX == null) {
      return;
    }

    const deltaX = event.changedTouches[0].clientX - swipeStartX;
    setSwipeStartX(null);

    if (Math.abs(deltaX) < 40) {
      return;
    }

    if (deltaX > 0) {
      goToPrevPhoto();
    } else {
      goToNextPhoto();
    }
  };

  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return 0;
    }

    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const submitInquiry = async (event) => {
    event.preventDefault();

    if (!listing || !user?.userId || !token) {
      navigate('/login');
      return;
    }

    if (user.userId === listing.listerId) {
      setError('You cannot inquire on your own listing.');
      return;
    }

    if (message.trim().length < 16) {
      setError('Please add a bit more detail so the lister can help quickly.');
      return;
    }

    setSubmittingInquiry(true);
    setError('');

    if (inquiryName.trim() && inquiryName.trim() !== (user?.fullName || '').trim()) {
      updateRows('profiles', { full_name: inquiryName.trim() }, {
        filters: [{ column: 'id', op: 'eq', value: user.userId }],
        accessToken: token
      }).catch(() => { });
    }

    try {
      const existing = await selectRows('conversations', {
        select: 'id',
        filters: [
          { column: 'listing_id', op: 'eq', value: listing.id },
          { column: 'tenant_id', op: 'eq', value: user.userId }
        ],
        limit: 1,
        accessToken: token
      });

      let conversationId = existing[0]?.id;

      if (!conversationId) {
        const created = await insertRows(
          'conversations',
          {
            listing_id: listing.id,
            tenant_id: user.userId,
            lister_id: listing.listerId,
            inquiry_status: 'open',
            move_in_date: moveInDate || null
          },
          { accessToken: token }
        );

        conversationId = created?.[0]?.id;
      }

      if (!conversationId) {
        throw new Error('Unable to open conversation.');
      }

      await insertRows(
        'messages',
        {
          conversation_id: conversationId,
          sender_id: user.userId,
          body: `${message.trim()}\n\nPreferred contact: ${humanize(contactPreference)}`
        },
        { accessToken: token }
      );

      await updateRows(
        'conversations',
        {
          last_message_at: new Date().toISOString()
        },
        {
          filters: [{ column: 'id', op: 'eq', value: conversationId }],
          accessToken: token
        }
      );

      // Also create a booking request
      if (moveInDate) {
        await createBookingRequest({
          listingId: listing.id,
          tenantId: user.userId,
          listerId: listing.listerId,
          moveInDate,
          durationMonths: Number(durationMonths) || 6,
          message: message.trim(),
          contactPreference,
          accessToken: token
        }).catch(() => {
          // Booking creation is best-effort; inquiry still succeeds
        });
      }

      setSubmittingInquiry(false);
      navigate(`/messages/${conversationId}`);
    } catch (err) {
      setError(err.message);
      setSubmittingInquiry(false);
    }
  };

  if (loading) {
    return (
      <div className="container section room-page">
        <section className="room-hero card room-hero--skeleton">
          <div className="room-skeleton-block room-skeleton-image" />
          <div className="room-skeleton-content">
            <div className="room-skeleton-block room-skeleton-line room-skeleton-line--title" />
            <div className="room-skeleton-block room-skeleton-line" />
            <div className="room-skeleton-block room-skeleton-line room-skeleton-line--short" />
            <div className="room-skeleton-block room-skeleton-line" />
            <div className="room-skeleton-block room-skeleton-line room-skeleton-line--short" />
          </div>
        </section>

        <section className="card room-sections">
          <div className="room-skeleton-block room-skeleton-line room-skeleton-line--title" />
          <div className="room-skeleton-block room-skeleton-line" />
          <div className="room-skeleton-block room-skeleton-line" />
        </section>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container section">
        <section className="card">
          <h1>{t('roomDetails.notAvailable')}</h1>
          <p className="error-text">{error || t('roomDetails.notAvailable')}</p>
          <Link className="btn" to="/search">
            {t('roomDetails.backToSearch')}
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="container section room-page">
      <section className="room-hero card">
        <div className="room-hero__gallery">
          <div
            className="room-hero__image-wrap"
            onTouchStart={captureSwipeStart}
            onTouchEnd={captureSwipeEnd}
          >
            <button
              type="button"
              className="room-hero__image-btn"
              onClick={() => setLightboxOpen(true)}
              aria-label="Open photo lightbox"
            >
              <img
                src={activePhoto?.public_url || listing.imageUrl}
                alt={listing.title}
                className="room-hero__image"
              />
            </button>
            <div className="room-hero__image-meta">
              <span className="room-photo-angle">{humanize(activePhoto?.angle || 'main')}</span>
              <span className="room-photo-count">
                {activePhotoIndex + 1}/{galleryPhotos.length}
              </span>
            </div>
            {galleryPhotos.length > 1 ? (
              <div className="room-hero__nav">
                <button type="button" className="room-nav-btn" onClick={goToPrevPhoto}>
                  Prev
                </button>
                <button type="button" className="room-nav-btn" onClick={goToNextPhoto}>
                  Next
                </button>
              </div>
            ) : null}
            {listing?.videoTourUrl && (
              <a
                href={listing.videoTourUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn--small"
                style={{
                  position: 'absolute',
                  bottom: '1rem',
                  right: '1rem',
                  background: 'rgba(29, 158, 117, 0.9)',
                  color: 'white',
                  fontSize: '0.85rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  textDecoration: 'none'
                }}
              >
                🎥 Video Tour
              </a>
            )}
          </div>

          <div className="room-hero__thumbs">
            {galleryPhotos.map((photo, index) => (
              <button
                type="button"
                key={photo.id}
                className={`room-thumb ${activePhotoIndex === index ? 'is-active' : ''}`}
                onClick={() => setActivePhotoIndex(index)}
              >
                <img src={photo.public_url} alt={photo.angle || 'Listing photo'} loading="lazy" />
                <span className="room-thumb__label">{humanize(photo.angle || 'photo')}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="room-hero__content">
          <div className="room-hero__title-row">
            <h1>{listing.title}</h1>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {listing.featured ? <span className="room-featured-badge">{t('roomDetails.featured')}</span> : null}
              {Number(averageRating) > 0 && reviews.length > 0 ? (
                <span className="room-review-stars" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: '#eef2ff', padding: '0.2rem 0.6rem', borderRadius: 16 }}>
                  <span style={{ color: '#f59e0b', fontSize: '1.2rem' }}>★</span>
                  <strong style={{ color: '#3730A3' }}>{averageRating}</strong>
                  <span style={{ color: '#4F46E5', fontSize: '0.85rem' }}>({reviews.length})</span>
                </span>
              ) : null}
            </div>
          </div>
          <p className="room-hero__location">{listing.location}</p>
          <p className="room-price">{formatPrice(listing.priceMonthly)}</p>

          <div className="room-chip-row">
            <span className="room-chip">{humanize(listing.roomType)}</span>
            <span className="room-chip">{humanize(listing.genderPreference)}</span>
            <span className="room-chip">{humanize(listing.vacancyStatus)}</span>
            <span className="room-chip">{t('roomDetails.availableFrom', { date: formatDate(listing.availableFrom) })}</span>
          </div>

          <p>{listing.description}</p>

          <section className="card room-lister-card">
            <div className="room-lister-card__header">
              {listerProfile?.profile_photo_url ? (
                <img
                  src={listerProfile.profile_photo_url}
                  alt={listerProfile.full_name || 'Lister'}
                  className="room-lister-avatar"
                />
              ) : (
                <div className="room-lister-avatar room-lister-avatar--fallback">
                  {(listerProfile?.full_name || 'L')
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
              <div>
                <h2>{listerProfile?.full_name || t('roomDetails.verifiedLister')}</h2>
                <p className="muted">
                  {listerProfile?.lister_type ? humanize(listerProfile.lister_type) : 'Lister'} • {humanize(listerProfile?.verification_status || 'pending')} • {t('roomDetails.memberSince', { date: formatShortDate(listerProfile?.created_at) })}
                </p>
              </div>
            </div>
            <div className="room-lister-card__stats">
              <span>{listerListingCount === 1 ? t('roomDetails.approvedListings', { count: listerListingCount }) : t('roomDetails.approvedListingsPlural', { count: listerListingCount })}</span>
              <span>{t('roomDetails.respondsViaChat')}</span>
            </div>
            {listerProfile?.phone && (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
                <strong>Phone:</strong> {listerProfile.phone}
              </p>
            )}
            {listing?.whatsappNumber && (
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.9rem' }}>
                <strong>WhatsApp:</strong> {listing.whatsappNumber}
              </p>
            )}
          </section>

          {listing?.listerType === 'dalali' && (listing?.ownerName || listing?.ownerPhone) ? (
            <section className="card" style={{ marginTop: '1rem', padding: '1.5rem', border: '1px solid #E5E5E0' }}>
              <h3 style={{ margin: '0 0 1rem' }}>Property Owner</h3>
              {listing?.ownerName && (
                <p style={{ margin: '0 0 0.5rem' }}>
                  <strong>{listing.ownerName}</strong>
                </p>
              )}
              {listing?.ownerPhone && (
                <p style={{ margin: '0', fontSize: '0.9rem' }}>
                  <strong>Phone:</strong> {listing.ownerPhone}
                </p>
              )}
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#6B6B5A' }}>
                (Listed by {listerProfile?.full_name || 'agent'})
              </p>
            </section>
          ) : null}

          <div className="room-actions">
            <button
              type="button"
              className={`btn btn--ghost ${saved ? 'is-saved' : ''}`}
              onClick={() => handleToggleSave(listing.id)}
            >
              {saved ? t('listingCard.saved') : t('listingCard.save')}
            </button>
            {canReserveListing ? (
              <Link
                to="/pay"
                className="btn btn--large"
                style={{ flex: 2, textAlign: 'center' }}
                state={{
                  listingId: listing.id,
                  price: listing.priceMonthly,
                  title: listing.title,
                  availableFrom: listing.availableFrom,
                  coverPhoto: Array.isArray(listing?.photos) ? listing.photos[0] : null,
                  address: listing.location || listing.district || listing.ward || ''
                }}
              >
                Reserve / Pay
              </Link>
            ) : null}
            <button type="button" className="btn btn--ghost" onClick={() => setOpenInquiry(true)}>
              {t('roomDetails.startChat')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={handleShare}>
              {t('roomDetails.share')}
            </button>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              style={{ color: 'var(--red, #C0392B)', fontSize: '0.8rem' }}
              onClick={() => { setOpenReport(true); setReportSuccess(false); }}
            >
              {t('roomDetails.reportListing')}
            </button>
          </div>
        </div>
      </section>

      <section className="card room-facts">
        <h2>{t('roomDetails.quickFacts')}</h2>
        <div className="room-facts-grid">
          {facts.map((fact) => (
            <article className="room-fact" key={fact.label}>
              <p>{fact.label}</p>
              <strong>{fact.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="room-sections">
        <article className="card room-section-card">
          <h2>{t('roomDetails.amenities')}</h2>
          {amenities.length > 0 ? (
            <div className="room-chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {amenities.map((item) => (
                <span
                  key={item.label}
                  className="room-chip room-chip--amenity"
                  style={{
                    background: item.enabled ? '#EDF7F1' : '#F5F5F0',
                    border: `1px solid ${item.enabled ? '#1D9E75' : '#E5E5E0'}`,
                    color: item.enabled ? '#1A1A2E' : '#9999 99'
                  }}
                >
                  <span className="room-chip__emoji" aria-hidden="true">
                    {item.emoji}
                  </span>
                  {item.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">{t('roomDetails.noAmenities')}</p>
          )}
        </article>

        <article className="card room-section-card">
          <h2>{t('roomDetails.houseRules')}</h2>
          {houseRules.length > 0 ? (
            <ol className="room-rules-list">
              {houseRules.map((rule, index) => (
                <li key={`${rule}-${index}`}>{rule}</li>
              ))}
            </ol>
          ) : (
            <p>{t('roomDetails.noHouseRules')}</p>
          )}
        </article>

        <article className="card room-section-card">
          <h2>Lease Terms & Payment</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
            <div>
              <p style={{ margin: '0 0 0.3rem', color: '#6B6B5A' }}>Monthly Rent</p>
              <p style={{ margin: '0', fontWeight: '700', fontSize: '1rem', color: '#1D9E75' }}>
                TZS {new Intl.NumberFormat('en-TZ').format(listing?.priceMonthly || 0)}
              </p>
            </div>
            {listing?.securityDeposit ? (
              <div>
                <p style={{ margin: '0 0 0.3rem', color: '#6B6B5A' }}>Security Deposit</p>
                <p style={{ margin: '0', fontWeight: '700', fontSize: '1rem' }}>
                  TZS {new Intl.NumberFormat('en-TZ').format(listing.securityDeposit)}
                </p>
              </div>
            ) : null}
            {listing?.minLeaseMonths ? (
              <div>
                <p style={{ margin: '0 0 0.3rem', color: '#6B6B5A' }}>Minimum Lease</p>
                <p style={{ margin: '0', fontWeight: '700' }}>{listing.minLeaseMonths} month{listing.minLeaseMonths !== 1 ? 's' : ''}</p>
              </div>
            ) : null}
            {listing?.paymentSchedule ? (
              <div>
                <p style={{ margin: '0 0 0.3rem', color: '#6B6B5A' }}>Payment Schedule</p>
                <p style={{ margin: '0', fontWeight: '700' }}>{humanize(listing.paymentSchedule)}</p>
              </div>
            ) : null}
            {listing?.lateFeePolicy ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ margin: '0 0 0.3rem', color: '#6B6B5A' }}>Late Fee Policy</p>
                <p style={{ margin: '0' }}>{listing.lateFeePolicy}</p>
              </div>
            ) : null}
          </div>
        </article>

        <article className="card room-section-card">
          <h2>{t('roomDetails.location')}</h2>
          <p>{listing.location}</p>
          <div className="room-location-map">
            <ListingMap listings={[listing]} onMarkerSelect={() => { }} />
          </div>
          {nearestUniversity ? (
            <p className="muted">
              {t('roomDetails.nearestCampus', { name: nearestUniversity.name, distance: nearestUniversity.displayDistance })}
            </p>
          ) : null}
          {listing.nearUniversities?.length ? (
            <div className="room-chip-row">
              {listing.nearUniversities.map((university) => (
                <span key={university} className="room-chip">
                  {university}
                </span>
              ))}
            </div>
          ) : null}
          {nearestUniversity ? (
            <div className="room-chip-row">
              {UNIVERSITY_COORDINATES
                .map((university) => ({
                  label: university.label,
                  distanceKm: haversineDistanceKm(
                    Number(listing.lat), Number(listing.lng),
                    university.lat, university.lng
                  )
                }))
                .sort((a, b) => a.distanceKm - b.distanceKm)
                .slice(0, 3)
                .map((uni) => (
                  <span key={uni.label} className="room-chip">
                    {uni.label} ({uni.distanceKm.toFixed(1)} km)
                  </span>
                ))}
            </div>
          ) : null}
          {listing.lat && listing.lng ? (
            <a
              href={`https://maps.google.com/?q=${listing.lat},${listing.lng}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn--ghost btn--small"
            >
              {t('roomDetails.openMapPin')}
            </a>
          ) : null}
        </article>
      </section>

      <section className="card room-related">
        <div className="room-related__header">
          <h2>{t('roomDetails.similarRooms')}</h2>
          <Link
            className="btn btn--ghost btn--small"
            to={`/search?q=${encodeURIComponent(listing.district || listing.region || '')}`}
          >
            {t('roomDetails.viewMore')}
          </Link>
        </div>

        {relatedLoading ? (
          <div className="room-related-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`related-skeleton-${index}`} className="room-skeleton-block room-skeleton-card" />
            ))}
          </div>
        ) : null}

        {!relatedLoading && relatedListings.length > 0 ? (
          <div className="room-related-grid">
            {relatedListings.map((item) => (
              <ListingCard
                key={item.id}
                listing={item}
                onToggleSave={(id) => handleToggleSave(id)}
                isSaved={savedIds.has(item.id)}
              />
            ))}
          </div>
        ) : null}

        {!relatedLoading && relatedListings.length === 0 ? (
          <p className="muted">{t('roomDetails.noSimilarRooms')}</p>
        ) : null}
      </section>

      {/* Reviews Section */}
      <section className="card room-reviews">
        <div className="room-reviews__header">
          <h2>{t('roomDetails.reviewsAndRatings')}</h2>
          {reviews.length > 0 ? (
            <div className="room-reviews__summary">
              <span className="room-reviews__avg">
                {'★'.repeat(Math.round(Number(averageRating)))}
                {'☆'.repeat(5 - Math.round(Number(averageRating)))}
              </span>
              <span className="room-reviews__score">{averageRating}</span>
              <span className="muted">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
            </div>
          ) : null}
        </div>

        {reviewsLoading ? <p className="muted">Loading reviews...</p> : null}

        {!reviewsLoading && reviews.length === 0 ? (
          <div>
            <p className="muted" style={{ marginBottom: '1rem' }}>No reviews yet. Be the first to review this listing.</p>
            <Link to={`/reviews?listing=${listing.id}`} className="btn btn--ghost btn--small">Write a Review</Link>
          </div>
        ) : null}

        {!reviewsLoading && reviews.length > 0 ? (
          <div className="room-reviews__list">
            {reviews.slice(0, 3).map((review: any) => (
              <article key={review.id} className="room-review-card">
                <div className="room-review-card__header">
                  {review.authorPhotoUrl ? (
                    <img src={review.authorPhotoUrl} alt={review.authorName} className="room-review-avatar" />
                  ) : (
                    <div className="room-review-avatar room-review-avatar--fallback">
                      {(review.authorName || 'T').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <strong>{review.authorName}</strong>
                    <span className="room-review-stars">
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </span>
                  </div>
                  <span className="muted room-review-date">{formatShortDate(review.createdAt)}</span>
                </div>
                {review.comment ? <p>{review.comment}</p> : null}
              </article>
            ))}

            <Link to={`/reviews?listing=${listing.id}`} className="btn btn--ghost" style={{ marginTop: '1rem', display: 'inline-block' }}>
              See all {reviews.length} reviews
            </Link>
          </div>
        ) : null}
      </section>

      {/* Booking Status */}
      {existingBooking ? (
        <section className="card room-booking-status">
          <h2>{t('roomDetails.yourBookingRequest')}</h2>
          <div className="room-booking-status__info">
            <p>
              <strong>{t('roomDetails.status')}:</strong>{' '}
              <span className={`room-booking-badge room-booking-badge--${existingBooking.status}`}>
                {humanize(existingBooking.status)}
              </span>
            </p>
            <p><strong>{t('roomDetails.moveIn')}:</strong> {formatDate(existingBooking.moveInDate)}</p>
            <p><strong>{t('roomDetails.duration')}:</strong> {existingBooking.durationMonths} month{existingBooking.durationMonths !== 1 ? 's' : ''}</p>
            <p className="muted">{t('roomDetails.requestedOn', { date: formatShortDate(existingBooking.createdAt) })}</p>
          </div>
        </section>
      ) : null}

      {openInquiry ? (
        <section
          className="sheet-backdrop"
          role="presentation"
          onClick={() => setOpenInquiry(false)}
          onKeyDown={(e) => e.key === 'Escape' && setOpenInquiry(false)}
        >
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <article
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Send Inquiry"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <h2>{t('roomDetails.sendInquiry')}</h2>
            <p className="muted">
              {t('roomDetails.inquirySubtitle')}
            </p>
            <div style={{
              background: 'var(--cream)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <p style={{ margin: '0 0 0.6rem', fontWeight: 700, fontSize: '0.9rem' }}>Cost breakdown</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--mid)' }}>Monthly rent</span>
                <span>TZS {new Intl.NumberFormat('sw-TZ').format(monthlyRent)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--mid)' }}>Security deposit</span>
                <span>TZS {new Intl.NumberFormat('sw-TZ').format(securityDeposit)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--mid)' }}>Platform fee</span>
                <span>TZS {new Intl.NumberFormat('sw-TZ').format(platformFee)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.6rem', paddingTop: '0.6rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>Total due today</span>
                <span style={{ fontWeight: 700, color: '#1D9E75' }}>TZS {new Intl.NumberFormat('sw-TZ').format(totalDueToday)}</span>
              </div>
            </div>
            <form onSubmit={submitInquiry}>
              <label>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span>{t('roomDetails.yourName')}</span>
                  {user?.fullName && !editingName ? (
                    <button
                      type="button"
                      className="btn btn--small btn--ghost"
                      onClick={() => setEditingName(true)}
                    >
                      {t('roomDetails.edit')}
                    </button>
                  ) : null}
                </div>
                {user?.fullName && !editingName ? (
                  <input value={user.fullName} readOnly />
                ) : (
                  <input
                    value={inquiryName}
                    onChange={(event) => setInquiryName(event.target.value)}
                    placeholder=""
                    required
                  />
                )}
              </label>

              <label>
                {t('roomDetails.moveInDate')}
                <input
                  type="date"
                  value={moveInDate}
                  onChange={(event) => setMoveInDate(event.target.value)}
                />
              </label>

              <label>
                {t('roomDetails.duration')}
                <select
                  value={durationMonths}
                  onChange={(event) => setDurationMonths(event.target.value)}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((months) => (
                    <option key={months} value={months}>
                      {months} month{months !== 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t('roomDetails.contactPreference')}
                <select
                  value={contactPreference}
                  onChange={(event) => setContactPreference(event.target.value)}
                >
                  <option value="in_app_chat">{t('roomDetails.inAppChatFirst')}</option>
                  <option value="phone_call">{t('roomDetails.phoneCall')}</option>
                  <option value="whatsapp">{t('roomDetails.whatsapp')}</option>
                </select>
              </label>

              <label>
                {t('roomDetails.message')}
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Hi, I am interested in this listing..."
                  maxLength={400}
                  required
                />
              </label>

              <div className="room-message-templates">
                {MESSAGE_TEMPLATES.map((template) => (
                  <button
                    key={template}
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => setMessage(template)}
                  >
                    {t('roomDetails.useTemplate')}
                  </button>
                ))}
              </div>

              <p className="muted">{message.trim().length}/400 characters</p>

              {error ? <p className="error-text" style={{ marginTop: '1rem', marginBottom: '1rem' }}>{error}</p> : null}

              <div className="sheet__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setOpenInquiry(false)}>
                  {t('roomDetails.cancel')}
                </button>
                <button type="submit" className="btn" disabled={submittingInquiry}>
                  {submittingInquiry ? t('search.searching') : t('roomDetails.send')}
                </button>
              </div>
            </form>
          </article>
        </section>
      ) : null}

      {lightboxOpen ? (
        <section
          className="sheet-backdrop room-lightbox"
          role="presentation"
          onClick={() => setLightboxOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setLightboxOpen(false)}
        >
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <article
            className="room-lightbox__dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Photo lightbox"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="btn btn--ghost btn--small room-lightbox__close"
              onClick={() => setLightboxOpen(false)}
            >
              {t('roomDetails.close')}
            </button>
            <img
              src={activePhoto?.public_url || listing.imageUrl}
              alt={listing.title}
              className="room-lightbox__image"
              onTouchStart={captureSwipeStart}
              onTouchEnd={captureSwipeEnd}
            />
            <p className="muted">
              {humanize(activePhoto?.angle || 'main')} • {activePhotoIndex + 1}/{galleryPhotos.length}
            </p>
            {galleryPhotos.length > 1 ? (
              <div className="room-lightbox__actions">
                <button type="button" className="btn btn--ghost" onClick={goToPrevPhoto}>
                  {t('roomDetails.previous')}
                </button>
                <button type="button" className="btn" onClick={goToNextPhoto}>
                  {t('roomDetails.next')}
                </button>
              </div>
            ) : null}
          </article>
        </section>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}
      {notice ? <p className="success-text">{notice}</p> : null}

      {openReport ? (
        <section
          className="sheet-backdrop"
          role="presentation"
          onClick={() => setOpenReport(false)}
          onKeyDown={(e) => e.key === 'Escape' && setOpenReport(false)}
        >
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <article
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Report listing"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <h2>🚩 Report this listing</h2>
            <p className="muted">
              Reports are reviewed within 24h. Critical reports trigger an immediate takedown.
            </p>
            {reportSuccess ? (
              <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</p>
                <p style={{ fontWeight: '600', color: 'var(--ink)' }}>Thank you for your report!</p>
                <p className="muted">Our team will review it shortly.</p>
                <button type="button" className="btn btn--ghost" style={{ marginTop: '1rem' }} onClick={() => setOpenReport(false)}>
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submitReport}>
                {reportError ? <p className="error-text" style={{ marginBottom: '1rem' }}>{reportError}</p> : null}
                <label>
                  Reason for report
                  <select value={reportReason} onChange={(event) => setReportReason(event.target.value)}>
                    {REPORT_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Additional details (optional)
                  <textarea
                    value={reportDescription}
                    onChange={(event) => setReportDescription(event.target.value)}
                    placeholder="Describe what you observed..."
                    maxLength={500}
                    rows={4}
                  />
                </label>

                <div className="sheet__actions">
                  <button type="button" className="btn btn--ghost" onClick={() => setOpenReport(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn"
                    style={{ background: '#C0392B', borderColor: '#C0392B' }}
                    disabled={submittingReport}
                  >
                    {submittingReport ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </article>
        </section>
      ) : null}

    </div>
  );
}
