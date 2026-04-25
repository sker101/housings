import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import ListingCard from '../components/ListingCard';
import ListingMap from '../components/ListingMap';
import { useAuth } from '../context/AuthContext';
import { APP_ROLE } from '../lib/roles';
import {
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
  const [bookingsLoading, setBookingsLoading] = useState(true);

  // Report state
  const [openReport, setOpenReport] = useState(false);
  const [reportReason, setReportReason] = useState('fraud');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState('');

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
        setBookingsLoading(false);
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
        }
      } catch (err) {
        console.error('Error fetching bookings:', err);
        if (mounted) {
          setExistingBooking(null);
        }
      } finally {
        if (mounted) {
          setBookingsLoading(false);
        }
      }
    }

    loadBookings();

    return () => {
      mounted = false;
    };
  }, [listing?.id, user?.userId, token]);

  const isAuthorized = useMemo(() => {
    if (!listing) return null;
    if (listing.vacancyStatus !== 'occupied') return true;
    if (user?.userId === listing.listerId) return true;
    if (!user?.userId) return false;
    
    if (bookingsLoading) return null; 
    
    if (existingBooking && ['requested', 'approved', 'paid', 'confirmed'].includes(existingBooking.status) && existingBooking.tenantId === user.userId) return true;
    
    return false;
  }, [listing, user?.userId, existingBooking, bookingsLoading]);

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
      .filter((item) => item.enabled)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [listing?.amenities]);

  const houseRules = useMemo(
    () => parseHouseRules(listing?.houseRules),
    [listing?.houseRules]
  );

  const saved = useMemo(
    () => (listing?.id ? savedIds.has(listing.id) : false),
    [savedIds, listing?.id]
  );
  const canReserveListing = !isAuthenticated || user?.role === APP_ROLE.TENANT;

  // Contact info is only visible to:
  // 1. The listing owner (landlord/dalali who posted it)
  // 2. Users who have a paid/confirmed/approved booking for this listing
  const hasPaidBooking = useMemo(() => {
    // Listing owner always sees contact info
    if (user?.userId && listing?.listerId && user.userId === listing.listerId) return true;
    // Check if user has a paid booking
    if (existingBooking && ['paid', 'confirmed', 'approved'].includes(existingBooking.status)) return true;
    return false;
  }, [user?.userId, listing?.listerId, existingBooking]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const validReviews = reviews.filter((r) => typeof r?.rating === 'number' && !isNaN(r.rating));
    if (validReviews.length === 0) return 0;
    const sum = validReviews.reduce((acc: number, review: any) => acc + review.rating, 0);
    return (sum / validReviews.length).toFixed(1);
  }, [reviews]);

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
      text: `Check this listing on iRent: ${listing.title}`,
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

  const captureSwipeStart = (e) => {
    if (e.changedTouches?.[0]) {
      setSwipeStartX(e.changedTouches[0].clientX);
    }
  };

  const captureSwipeEnd = (e) => {
    if (!e.changedTouches?.[0] || swipeStartX == null) {
      return;
    }

    const deltaX = e.changedTouches[0].clientX - swipeStartX;
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

    setSubmittingInquiry(true);
    setError('');

    // Ensure profile has a name if missing (rare but possible via social login)
    if (!user.fullName) {
      await updateRows('profiles', { full_name: inquiryName }, {
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
        'chat_messages',
        {
          conversation_id: conversationId,
          sender_id: user.userId,
          body: message.trim()
        },
        { accessToken: token }
      );

      setSubmittingInquiry(false);
      setMessage('');
      setOpenInquiry(false);
      navigate(`/messages/${conversationId}`);
    } catch (err) {
      setError(err.message || 'Failed to send message. Please try again.');
      setSubmittingInquiry(false);
    }
  };

  if (loading) {
    return (
      <div className="container section">
        <section className="room-hero room-hero--skeleton">
          <div className="room-skeleton-image room-skeleton-block" />
          <div className="room-skeleton-content">
            <div className="room-skeleton-line room-skeleton-line--title room-skeleton-block" />
            <div className="room-skeleton-line room-skeleton-block" style={{ width: '40%' }} />
            <div className="room-skeleton-line room-skeleton-block" style={{ width: '30%', marginTop: '1rem' }} />
          </div>
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

  if (isAuthorized === false) {
    return (
      <div className="container section">
        <section className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <h1 style={{ color: '#E53E3E', marginBottom: '1rem' }}>Room Unavailable</h1>
          <p className="error-text">This room has been paid for and is no longer available for viewing.</p>
          <Link className="btn" to="/search" style={{ marginTop: '1.5rem', display: 'inline-block' }}>
            {t('roomDetails.backToSearch')}
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="container section room-page">
      <Link
        to="/search"
        className="btn btn--ghost btn--small"
        style={{ width: 'fit-content', marginBottom: '1rem' }}
      >
        ← {t('roomDetails.backToSearch')}
      </Link>

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
              <span className="room-photo-angle">{activePhoto?.caption || humanize(activePhoto?.angle || 'main').replace(/\d+/g, '').trim()}</span>
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
                <span className="room-thumb__label">{photo.caption || humanize(photo.angle || 'photo').replace(/\d+/g, '').trim()}</span>
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
                  {listerProfile?.full_name?.[0] || 'L'}
                </div>
              )}
              <div>
                <h3>{listerProfile?.full_name || 'Asha Owner'}</h3>
                <p className="muted">
                  {listerProfile?.lister_type ? humanize(listerProfile.lister_type) : 'Lister'} • {humanize(listerProfile?.verification_status || 'pending')} • {t('roomDetails.memberSince', { date: formatShortDate(listerProfile?.created_at) })}
                </p>
              </div>
            </div>
            <div className="room-lister-card__stats">
              <span>{listerListingCount === 1 ? t('roomDetails.approvedListings', { count: listerListingCount }) : t('roomDetails.approvedListingsPlural', { count: listerListingCount })}</span>
              <span>{t('roomDetails.respondsViaChat')}</span>
            </div>
            {hasPaidBooking ? (
              <>
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
              </>
            ) : (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: 'linear-gradient(135deg, #FEF3C7, #F9FAFB)', borderRadius: '10px', display: 'flex', gap: '0.6rem', alignItems: 'center', border: '1px solid #E5E7EB' }}>
                <span style={{ fontSize: '1.2rem' }}>🔒</span>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#374151', fontWeight: 600, lineHeight: 1.4 }}>
                    Contact details are hidden
                  </p>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.4 }}>
                    Reserve / pay for this room to unlock landlord phone &amp; WhatsApp.
                  </p>
                </div>
              </div>
            )}
          </section>

          <div className="room-actions">
            <button
              type="button"
              className={`btn btn--ghost ${saved ? 'is-saved' : ''}`}
              onClick={() => handleToggleSave(listing.id)}
            >
              {saved ? t('listingCard.saved') : t('listingCard.save')}
            </button>
            {canReserveListing && listing.vacancyStatus === 'available' ? (
              <Link
                to="/tenant/payments"
                className="btn"
                state={{
                  listingId: listing.id,
                  price: listing.priceMonthly,
                  title: listing.title,
                  availableFrom: listing.availableFrom,
                  coverPhoto: Array.isArray(listing?.photos) ? listing.photos[0] : null,
                  address: listing.location || listing.district || listing.ward || '',
                  listerId: listing.listerId,
                }}
              >
                Reserve / Pay
              </Link>
            ) : null}
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                if (!isAuthenticated) {
                  navigate('/login', { state: { from: { pathname: `/rooms/${roomId}` } } });
                  return;
                }
                setOpenInquiry(true);
              }}
            >
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
              <strong>{fact.value || 'Not specified'}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="room-sections" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <article className="card room-section-card">
          <h2>{t('roomDetails.amenities')}</h2>
          {amenities.length > 0 ? (
            <div className="room-chip-row">
              {amenities.map((item) => (
                <span key={item.label} className="room-chip room-chip--amenity">
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
      </section>

      <section className="card room-location-section" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0 }}>{t('roomDetails.location')}</h2>
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>{listing.location}</p>
        </div>
        <div className="room-location-map" style={{ height: '400px', borderRadius: '16px', overflow: 'hidden' }}>
          <ListingMap listings={[listing]} onMarkerSelect={() => { }} center={[listing.lat, listing.lng]} zoom={15} />
        </div>
        <div style={{ marginTop: '1rem' }}>
          {nearestUniversity ? (
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              {t('roomDetails.nearestCampus', { name: nearestUniversity.name, distance: nearestUniversity.displayDistance })}
            </p>
          ) : null}
          {listing.nearUniversities?.length ? (
            <div className="room-chip-row" style={{ marginTop: '0.5rem' }}>
              {listing.nearUniversities.map((university) => (
                <span key={university} className="room-chip">🎓 {university}</span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Reviews Section */}
      <section className="card room-reviews" style={{ marginTop: '1.5rem' }}>
        <div className="room-reviews__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>{t('roomDetails.reviewsAndRatings')}</h2>
          {reviews.length > 0 ? (
            <div className="room-reviews__summary" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="room-reviews__avg" style={{ color: '#f59e0b', letterSpacing: '2px' }}>
                {'★'.repeat(Math.round(Number(averageRating)))}
                {'☆'.repeat(5 - Math.round(Number(averageRating)))}
              </span>
              <span className="room-reviews__score" style={{ fontWeight: 700, fontSize: '1.2rem' }}>{averageRating}</span>
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
          <div className="room-reviews__list" style={{ display: 'grid', gap: '1.5rem' }}>
            {reviews.slice(0, 3).map((review) => (
              <article key={review.id} className="room-review-card" style={{ paddingBottom: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <div className="room-review-card__header" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                  {review.authorPhotoUrl ? (
                    <img src={review.authorPhotoUrl} alt={review.authorName} className="room-review-avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div className="room-review-avatar room-review-avatar--fallback" style={{ width: 40, height: 40, borderRadius: '50%', background: '#eef2ff', display: 'grid', placeItems: 'center', fontWeight: 600, color: '#4f46e5' }}>
                      {(review.authorName || 'T').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{review.authorName}</strong>
                      <span className="muted room-review-date" style={{ fontSize: '0.8rem' }}>{formatShortDate(review.createdAt)}</span>
                    </div>
                    <span className="room-review-stars" style={{ color: '#f59e0b', fontSize: '0.9rem' }}>
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </span>
                  </div>
                </div>
                {review.comment ? <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.5 }}>{review.comment}</p> : null}
              </article>
            ))}

            <Link to={`/reviews?listing=${listing.id}`} className="btn btn--ghost" style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}>
              See all {reviews.length} reviews
            </Link>
          </div>
        ) : null}
      </section>

      {relatedListings.length > 0 ? (
        <section className="room-related" style={{ marginTop: '2.5rem' }}>
          <h2>{t('roomDetails.similarRooms')}</h2>
          <div className="listing-grid">
            {relatedListings.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
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
          <article
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Send inquiry"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>{t('roomDetails.sendInquiry')}</h2>
              <button type="button" className="btn btn--ghost" onClick={() => setOpenInquiry(false)} style={{ border: 'none', fontSize: '1.5rem' }}>&times;</button>
            </div>
            
            <form onSubmit={submitInquiry}>
              <label>
                {t('roomDetails.yourName')}
                {editingName ? (
                  <input
                    value={inquiryName}
                    onChange={(event) => setInquiryName(event.target.value)}
                    onBlur={() => setEditingName(false)}
                    autoFocus
                    required
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span>{inquiryName || 'Anonymous'}</span>
                    <button type="button" className="btn btn--ghost btn--small" onClick={() => setEditingName(true)}>Change</button>
                  </div>
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
                {t('roomDetails.message')}
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Hi, I am interested in this listing..."
                  maxLength={400}
                  required
                  rows={4}
                />
              </label>

              <div className="room-message-templates" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {MESSAGE_TEMPLATES.map((template) => (
                  <button
                    key={template}
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => setMessage(template)}
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', borderRadius: '20px' }}
                  >
                    {template}
                  </button>
                ))}
              </div>

              {error ? <p className="error-text" style={{ marginTop: '1rem', marginBottom: '1rem' }}>{error}</p> : null}

              <div className="sheet__actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn--ghost" onClick={() => setOpenInquiry(false)} style={{ flex: 1 }}>
                  {t('roomDetails.cancel')}
                </button>
                <button type="submit" className="btn" disabled={submittingInquiry} style={{ flex: 2 }}>
                  {submittingInquiry ? 'Sending...' : t('roomDetails.send')}
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
          style={{ background: 'rgba(0,0,0,0.95)' }}
        >
          <article
            className="room-lightbox__dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Photo lightbox"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh' }}
          >
            <button
              type="button"
              className="btn btn--ghost btn--small room-lightbox__close"
              onClick={() => setLightboxOpen(false)}
              style={{ position: 'absolute', top: '-3rem', right: 0, color: '#fff', border: 'none', fontSize: '2rem' }}
            >
              &times;
            </button>
            <img
              src={activePhoto?.public_url || listing.imageUrl}
              alt={listing.title}
              className="room-lightbox__image"
              onTouchStart={captureSwipeStart}
              onTouchEnd={captureSwipeEnd}
              style={{ width: '100%', height: 'auto', maxHeight: '80vh', objectFit: 'contain', borderRadius: '12px' }}
            />
            <p style={{ color: '#fff', textAlign: 'center', marginTop: '1rem' }}>
              {humanize(activePhoto?.angle || 'main')} • {activePhotoIndex + 1}/{galleryPhotos.length}
            </p>
            {galleryPhotos.length > 1 ? (
              <div className="room-lightbox__actions" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn--ghost" onClick={goToPrevPhoto} style={{ color: '#fff', borderColor: '#fff' }}>
                  {t('roomDetails.previous')}
                </button>
                <button type="button" className="btn" onClick={goToNextPhoto} style={{ background: '#fff', color: '#000' }}>
                  {t('roomDetails.next')}
                </button>
              </div>
            ) : null}
          </article>
        </section>
      ) : null}

      {openReport ? (
        <section
          className="sheet-backdrop"
          role="presentation"
          onClick={() => setOpenReport(false)}
          onKeyDown={(e) => e.key === 'Escape' && setOpenReport(false)}
        >
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
