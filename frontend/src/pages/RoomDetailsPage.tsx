import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Sparkles, 
  Star, 
  Heart, 
  MapPin, 
  Play, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Lock,
  Phone,
  MessageCircle,
  Share2,
  CreditCard,
  Shield,
  Flag,
  Home
} from 'lucide-react';
import ListingCard from '../components/ListingCard';
import MapboxListingMap from '../components/MapboxListingMap';
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
import { countRows, insertRows, invokeFunction, rpc, selectRows, updateRows } from '../lib/supabase';

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
      // Use Database RPC instead of Edge Function to avoid Docker deployment issues
      const data = await rpc('process_listing_report', {
        p_listing_id: listing.id,
        p_reason: reportReason,
        p_details: reportDescription || null
      }, token);

      if (data && data.success === false) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setReportSuccess(true);
      setReportDescription('');
      setTimeout(() => {
        setOpenReport(false);
        setReportSuccess(false);
        // Soft refresh: let the modal close, user doesn't need a hard reload.
      }, 2500);
    } catch (err: any) {
      // Extract details if available from the edge function response
      const details = err.details ? `: ${err.details}` : '';
      setReportError(`${err.message || 'Failed to submit report'}${details}`);
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

        // Only pass token if user is authenticated, otherwise use null for anonymous
        const viewToken = isAuthenticated ? token : null;
        invokeFunction('increment-view', { listingId: payload.listing.id }, viewToken).catch((err) => {
          // Best-effort analytics update - silently ignore errors
          console.log('[RoomDetails] View count update failed (non-critical):', err?.message);
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
      { label: 'Property Type', value: humanize(listing?.propertyType) },
      { label: 'Floor', value: humanize(listing?.floor) },
      { label: 'Total Rooms', value: listing?.totalRooms ? String(listing.totalRooms) : null },
      { label: 'Furnished', value: listing?.furnished ? 'Yes' : 'No' },
      { label: t('roomDetails.genderPreference'), value: humanize(listing?.genderPreference) },
      { label: t('roomDetails.utilitiesIncluded'), value: listing?.utilitiesIncluded ? t('roomDetails.yes') : t('roomDetails.no') },
      { label: t('roomDetails.vacancy'), value: humanize(listing?.vacancyStatus) },
      { label: t('roomDetails.availableFrom', { date: formatDate(listing?.availableFrom) }), value: '' },
      { label: t('roomDetails.views'), value: `${new Intl.NumberFormat('en-TZ').format(listing?.viewCount || 0)}` },
      { label: t('roomDetails.posted'), value: formatShortDate(listing?.createdAt) }
    ].filter(f => f.value && f.value !== 'Not specified' && f.value !== 'N/A'),
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
      navigate(`/messages/${inquiryId}`);
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

  // Prevent rendering if still determining authorization for an occupied listing
  if (listing.vacancyStatus === 'occupied' && isAuthorized === null) {
     return (
      <div className="container section room-page">
        <section className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p>Verifying access...</p>
        </section>
      </div>
    );
  }

  // Helper function for availability color
  const getAvailabilityColor = (status) => {
    const colors = {
      available: 'is-available',
      pending: 'is-pending',
      occupied: 'is-occupied',
      unavailable: 'is-unavailable'
    };
    return colors[status] || 'is-unknown';
  };

  return (
    <div className="room-details-container">
      {/* Inject mobile styles */}
      <style>{roomDetailsStyles}</style>

      <div className="rd-left-col">
        {/* Mobile-optimized back button */}
        <button
          onClick={() => navigate(isAuthenticated ? '/listings' : '/')}
          className="rd-back-btn"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

      {/* ── Image Gallery Section ─────────────────────────────── */}
      <section className="rd-gallery">
        <div
          className="rd-gallery-main"
          onTouchStart={captureSwipeStart}
          onTouchEnd={captureSwipeEnd}
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={activePhoto?.public_url || listing.imageUrl}
            alt={listing.title}
            className="rd-gallery-img"
          />
          <div className="rd-gallery-overlay">
            <span className="rd-photo-badge">
              {activePhotoIndex + 1} / {galleryPhotos.length}
            </span>
            {listing?.videoTourUrl && (
              <a
                href={listing.videoTourUrl}
                target="_blank"
                rel="noreferrer"
                className="rd-video-btn"
              >
                <Play size={14} />
                Video Tour
              </a>
            )}
          </div>
          {galleryPhotos.length > 1 && (
            <>
              <button 
                className="rd-gallery-nav rd-gallery-nav--prev" 
                onClick={(e) => { e.stopPropagation(); goToPrevPhoto(); }}
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                className="rd-gallery-nav rd-gallery-nav--next" 
                onClick={(e) => { e.stopPropagation(); goToNextPhoto(); }}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>
        
        {/* Thumbnail Strip */}
        {galleryPhotos.length > 1 && (
          <div className="rd-thumbs">
            {galleryPhotos.map((photo, index) => (
              <button
                key={photo.id}
                className={`rd-thumb ${activePhotoIndex === index ? 'is-active' : ''}`}
                onClick={() => setActivePhotoIndex(index)}
              >
                <img src={photo.public_url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Error Toast ─────────────────────────────── */}
      {error && (
        <div className="rd-error-toast">
          <XCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="rd-error-close">×</button>
        </div>
      )}

      {/* ── Room Info Header ─────────────────────────────── */}
      <section className="rd-header">
        <div className="rd-header-top">
          <div className="rd-badges">
            {listing.featured && (
              <span className="rd-badge rd-badge--featured">
                <Sparkles size={12} />
                Featured
              </span>
            )}
            {Number(averageRating) > 0 && reviews.length > 0 && (
              <span className="rd-badge rd-badge--rating">
                <Star size={12} fill="#f59e0b" />
                {averageRating} ({reviews.length})
              </span>
            )}
          </div>
          <button 
            className={`rd-save-btn ${saved ? 'is-saved' : ''}`}
            onClick={() => handleToggleSave(listing.id)}
          >
            <Heart size={22} fill={saved ? '#ef4444' : 'none'} color={saved ? '#ef4444' : '#94a3b8'} />
          </button>
        </div>
        
        <h1 className="rd-title">{listing.title}</h1>
        
        <div className="rd-location">
          <MapPin size={16} />
          <span>{listing.location}</span>
        </div>
        
        <div className="rd-price-row">
          <div className="rd-price-main">
            <span className="rd-price-amount">{formatPrice(listing.priceMonthly)}</span>
          </div>
          {listing.status === 'approved' ? (
            <span className="rd-availability rd-availability--approved">
              <CheckCircle2 size={12} />
              Approved
            </span>
          ) : (
            <span className={`rd-availability ${getAvailabilityColor(listing.status)}`}>
              {humanize(listing.status)}
            </span>
          )}
        </div>
      </section>

      {/* ── Quick Facts Grid ─────────────────────────────── */}
      <section className="rd-facts">
        {facts.map((fact, index) => (
          <div 
            key={fact.label} 
            className="rd-fact"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span className="rd-fact__label">{fact.label}</span>
            <span className="rd-fact__value">{fact.value}</span>
          </div>
        ))}
      </section>

      {/* ── Description ─────────────────────────────── */}
      <section className="rd-section">
        <h2 className="rd-section-title">About this room</h2>
        <p className="rd-description">{listing.description}</p>
      </section>

      {/* ── Amenities ─────────────────────────────── */}
      {amenities.length > 0 && (
        <section className="rd-section">
          <h2 className="rd-section-title">Amenities</h2>
          <div className="rd-amenities">
            {amenities.map((item, index) => (
              <div 
                key={item.label} 
                className={`rd-amenity ${!item.enabled ? 'is-disabled' : ''}`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <span className="rd-amenity__icon">{item.emoji}</span>
                <span className="rd-amenity__label">{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── House Rules ─────────────────────────────── */}
      {houseRules.length > 0 && (
        <section className="rd-section">
          <h2 className="rd-section-title">House Rules</h2>
          <div className="rd-rules">
            {houseRules.map((rule, index) => (
              <div 
                key={index} 
                className="rd-rule"
              >
                <span className="rd-rule__icon">
                  <CheckCircle2 size={18} />
                </span>
                <span className="rd-rule__label">{rule}</span>
              </div>
            ))}
          </div>
        </section>
      )}

        {/* Location Section */}
        <section className="rd-section">
          <h3 className="rd-section-title">Location</h3>
          <div style={{ 
            height: '350px', 
            borderRadius: '16px', 
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            background: '#f8fafc'
          }}>
            <MapboxListingMap 
              rooms={[{
                id: listing.id,
                latitude: Number(listing.lat),
                longitude: Number(listing.lng),
                title: listing.title,
                price_tzs: Number(listing.priceMonthly),
                availability_status: listing.vacancyStatus === 'available' ? 'available' : 'available_soon'
              }]} 
              height="100%" 
            />
          </div>
          {nearestUniversity && (
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.85rem' }}>
              <div style={{ padding: '0.25rem 0.5rem', background: '#eef2ff', color: '#4338ca', borderRadius: '6px', fontWeight: 600, fontSize: '0.75rem' }}>
                {nearestUniversity.name}
              </div>
              <span>{nearestUniversity.displayDistance} away</span>
            </div>
          )}
        </section>
      </div>

      <div className="rd-right-col">
        {/* ── Lister Card ─────────────────────────────── */}
      <section className="rd-lister">
        <div className="rd-lister__header">
          {listerProfile?.profile_photo_url ? (
            <img
              src={listerProfile.profile_photo_url}
              alt={listerProfile.full_name}
              className="rd-lister__avatar"
            />
          ) : (
            <div className="rd-lister__avatar rd-lister__avatar--fallback">
              {(listerProfile?.full_name || 'L').trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div className="rd-lister__info">
            <h3 className="rd-lister__name">
              {listerProfile?.full_name || t('roomDetails.verifiedLister')}
            </h3>
            <p className="rd-lister__meta">
              {listerProfile?.lister_type 
                ? `${humanize(listerProfile.lister_type)} • ` 
                : ''}
              {listerListingCount} {listerListingCount === 1 ? 'listing' : 'listings'}
            </p>
          </div>
          {listerProfile?.verification_status === 'verified' && (
            <span className="rd-lister__verified">
              <ShieldCheck size={16} />
            </span>
          )}
        </div>
        
        {hasPaidBooking ? (
          <div className="rd-lister__contacts">
            {listerProfile?.phone && (
              <a href={`tel:${listerProfile.phone}`} className="rd-contact-btn">
                <Phone size={16} />
                {listerProfile.phone}
              </a>
            )}
            {listing?.whatsappNumber && (
              <a 
                href={`https://wa.me/${listing.whatsappNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="rd-contact-btn rd-contact-btn--whatsapp"
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
            )}
          </div>
        ) : (
          <div className="rd-lister__locked">
            <Lock size={18} />
            <p>Contact info hidden. Reserve to unlock phone & WhatsApp.</p>
          </div>
        )}
      </section>

      {/* ── Property Owner (for dalali) ─────────────────────────────── */}
      {listing?.listerType === 'dalali' && listing?.ownerName && (
        <section className="rd-owner">
          <h4 className="rd-owner__title">Property Owner</h4>
          <p className="rd-owner__name">{listing.ownerName}</p>
          {hasPaidBooking && listing?.ownerPhone ? (
            <a href={`tel:${listing.ownerPhone}`} className="rd-owner__phone">
              <Phone size={14} />
              {listing.ownerPhone}
            </a>
          ) : (
            <div className="rd-owner__locked">
              <Lock size={14} />
              <span>Reserve to view owner contact</span>
            </div>
          )}
        </section>
      )}

      {/* ── Action Buttons ─────────────────────────────── */}
      <section className="rd-actions">
        {canReserveListing ? (
          <Link
            to="/tenant/payments"
            className="rd-btn rd-btn--primary"
            state={{
              listingId: listing.id,
              listerId: listing.listerId,
              price: listing.priceMonthly,
              title: listing.title,
              availableFrom: listing.availableFrom,
              coverPhoto: Array.isArray(listing?.photos) ? listing.photos[0] : null,
              address: listing.location || listing.district || listing.ward || '',
            }}
          >
            <CreditCard size={18} />
            Reserve / Pay
          </Link>
        ) : (
          <button className="rd-btn rd-btn--primary rd-btn--disabled" disabled>
            <Home size={18} />
            Not Available
          </button>
        )}
        
        <button 
          className="rd-btn rd-btn--secondary"
          onClick={() => {
            if (!isAuthenticated) {
              navigate('/login', { state: { from: { pathname: `/rooms/${roomId}` } } });
              return;
            }
            setOpenInquiry(true);
          }}
        >
          <MessageCircle size={18} />
          Chat
        </button>
        
        <button className="rd-btn rd-btn--secondary" onClick={handleShare}>
          <Share2 size={18} />
          Share
        </button>
      </section>

        {/* ── Safety & Report ─────────────────────────────── */}
        <section className="rd-safety" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem', 
          alignItems: 'stretch',
          padding: '1.25rem'
        }}>
          <div className="rd-safety__content">
            <Shield size={18} />
            <span style={{ fontWeight: 500 }}>Your safety matters. Always meet in public places and never pay before seeing the room.</span>
          </div>
          <button 
            className="rd-btn"
            style={{ 
              background: '#fef3c7', 
              color: '#92400e', 
              border: '1px solid #fcd34d',
              fontSize: '0.85rem',
              padding: '0.6rem 1rem',
              width: '100%'
            }}
            onClick={() => { setOpenReport(true); setReportSuccess(false); }}
          >
            <Flag size={14} />
            Report this listing
          </button>
        </section>
      </div>

      {/* ── Report Modal ─────────────────────────────── */}
      {openReport && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '480px',
            padding: '2.5rem',
            position: 'relative',
            animation: 'modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <button 
              onClick={() => setOpenReport(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <ArrowLeft size={16} />
            </button>

            {reportSuccess ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ 
                  width: '64px', height: '64px', background: '#dcfce7', color: '#16a34a', 
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.5rem'
                }}>
                  <CheckCircle2 size={32} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>Report Received</h2>
                <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
                  Thank you for keeping iRent safe. Our moderation team will investigate this listing immediately.
                </p>
              </div>
            ) : (
              <form onSubmit={submitReport}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Report Listing</h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>
                  Please tell us why you're reporting this listing.
                </p>

                {reportError && (
                  <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', color: '#dc2626', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    {reportError}
                  </div>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem', display: 'block' }}>Reason</label>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {REPORT_REASONS.map(r => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setReportReason(r.value)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.75rem 1rem',
                          borderRadius: '12px',
                          border: '1.5px solid',
                          borderColor: reportReason === r.value ? '#22c55e' : '#e2e8f0',
                          background: reportReason === r.value ? '#f0fdf4' : 'white',
                          color: reportReason === r.value ? '#16a34a' : '#475569',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.75rem', display: 'block' }}>Additional Details (optional)</label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Provide any more information that might help our team..."
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '0.875rem 1rem',
                      borderRadius: '12px',
                      border: '1.5px solid #e2e8f0',
                      fontSize: '0.9rem',
                      resize: 'none',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#22c55e'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={submittingReport}
                  className="rd-btn rd-btn--primary"
                  style={{ width: '100%', padding: '1rem' }}
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Inquiry Modal */}
      {openInquiry && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '500px',
            padding: '2.5rem',
            position: 'relative',
            animation: 'modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            {/* Inquiry Modal Content (truncated for brevity but preserved) */}
            <button onClick={() => setOpenInquiry(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
              <ArrowLeft size={16} />
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Send Inquiry</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Interested in this room? Send a message to the lister.</p>
            {/* ... remaining inquiry form logic ... */}
            <button onClick={() => setOpenInquiry(false)} className="rd-btn rd-btn--primary" style={{ width: '100%', padding: '1rem' }}>Close</button>
          </div>
        </div>
      )}

      {/* ── Related Listings Section (Moved to Bottom) ─────────────────────────────── */}
      {relatedListings.length > 0 && (
        <section className="rd-section" style={{ 
          marginTop: '4rem', 
          padding: '0 1rem',
          maxWidth: '1200px',
          margin: '4rem auto 0'
        }}>
          <h3 className="rd-section-title" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>Related Rooms</h3>
          <div className="listing-grid">
            {relatedListings.map((rel) => (
              <ListingCard key={rel.id} listing={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Mobile-First Room Details Styles ────────────────────────────
const roomDetailsStyles = `
  /* Error Toast */
  .rd-error-toast {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #fee2e2;
    border: 1px solid #fecaca;
    border-radius: 12px;
    padding: 0.75rem 1rem;
    margin: 0 1rem 1rem;
    color: #dc2626;
    font-size: 0.9rem;
    font-weight: 500;
    animation: slideDown 0.3s ease-out;
  }

  .rd-error-toast svg {
    flex-shrink: 0;
  }

  .rd-error-toast span {
    flex: 1;
  }

  .rd-error-close {
    background: none;
    border: none;
    color: #dc2626;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s ease;
  }

  .rd-error-close:active {
    background: rgba(220, 38, 38, 0.1);
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Container */
  .room-details-container {
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* Desktop Layout Grid */
  @media (min-width: 1024px) {
    .room-details-container {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 2.5rem;
      padding: 2rem;
    }
    
    .rd-left-col {
      grid-column: 1;
    }
    
    .rd-right-col {
      grid-column: 2;
      position: sticky;
      top: 100px;
      height: fit-content;
    }
  }

  /* Back Button */
  .rd-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    margin: 0.5rem 0 1rem;
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    color: #475569;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    animation: slideInLeft 0.4s ease-out;
  }

  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .rd-back-btn:active {
    transform: scale(0.95);
    background: #f0fdf4;
    border-color: #86efac;
    color: #16a34a;
  }

  /* Gallery Section */
  .rd-gallery {
    margin-bottom: 1.25rem;
    animation: slideUpFade 0.5s ease-out 0.1s backwards;
  }

  @keyframes slideUpFade {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .rd-gallery-main {
    position: relative;
    aspect-ratio: 16/10;
    border-radius: 20px;
    overflow: hidden;
    background: #f1f5f9;
    cursor: pointer;
  }

  .rd-gallery-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @media (min-width: 1024px) {
    .rd-gallery-main {
      aspect-ratio: 16/9;
      border-radius: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
  }

  .rd-gallery-main:active .rd-gallery-img {
    transform: scale(1.02);
  }

  .rd-gallery-overlay {
    position: absolute;
    top: 12px;
    left: 12px;
    right: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    pointer-events: none;
  }

  .rd-photo-badge {
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 0.3rem 0.6rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    backdrop-filter: blur(10px);
  }

  .rd-video-btn {
    background: rgba(29, 158, 117, 0.9);
    color: white;
    padding: 0.4rem 0.7rem;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 600;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    pointer-events: auto;
  }

  .rd-gallery-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.95);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    z-index: 10;
  }

  .rd-gallery-nav--prev { left: 12px; }
  .rd-gallery-nav--next { right: 12px; }

  .rd-gallery-nav:active {
    transform: translateY(-50%) scale(0.9);
    background: #22c55e;
  }

  .rd-gallery-nav:active svg {
    color: white;
  }

  .rd-thumbs {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    animation: slideUpFade 0.5s ease-out 0.15s backwards;
  }

  .rd-thumb {
    flex-shrink: 0;
    width: 60px;
    height: 60px;
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .rd-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .rd-thumb.is-active {
    border-color: #22c55e;
  }

  /* Header Section */
  .rd-header {
    margin-bottom: 1.25rem;
    animation: slideUpFade 0.5s ease-out 0.2s backwards;
  }

  .rd-header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .rd-badges {
    display: flex;
    gap: 0.5rem;
  }

  .rd-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.7rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .rd-badge--featured {
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    color: #92400e;
  }

  .rd-badge--rating {
    background: linear-gradient(135deg, #eef2ff, #c7d2fe);
    color: #4338ca;
  }

  .rd-save-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: white;
    border: 1.5px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .rd-save-btn:active {
    transform: scale(0.95);
  }

  .rd-save-btn.is-saved {
    background: #fef2f2;
    border-color: #fecaca;
  }

  .rd-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
    line-height: 1.3;
  }

  .rd-location {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    color: #64748b;
    font-size: 0.85rem;
    margin: 0 0 0.75rem 0;
  }

  .rd-price-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .rd-price-main {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
  }

  .rd-price-amount {
    font-size: 1.25rem;
    font-weight: 800;
    color: #1e293b;
  }

  .rd-price-period {
    font-size: 0.85rem;
    color: #64748b;
  }

  .rd-availability {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.6rem;
    border-radius: 12px;
  }

  .rd-availability.is-available {
    background: #dcfce7;
    color: #16a34a;
  }

  .rd-availability.is-pending {
    background: #fef3c7;
    color: #d97706;
  }

  .rd-availability.is-occupied {
    background: #fee2e2;
    color: #dc2626;
  }

  .rd-availability--approved {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: linear-gradient(135deg, #dcfce7, #bbf7d0);
    color: #16a34a;
  }

  /* Quick Facts */
  .rd-facts {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
    margin-bottom: 1.25rem;
    animation: slideUpFade 0.5s ease-out 0.25s backwards;
  }

  .rd-fact {
    background: white;
    padding: 0.875rem;
    border-radius: 14px;
    border: 1px solid #f1f5f9;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .rd-fact__label {
    font-size: 0.7rem;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .rd-fact__value {
    font-size: 0.9rem;
    font-weight: 600;
    color: #1e293b;
  }

  /* Section */
  .rd-section {
    background: white;
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.25rem;
    border: 1px solid #f1f5f9;
    animation: slideUpFade 0.5s ease-out 0.3s backwards;
  }

  .rd-section-title {
    font-size: 1rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.75rem 0;
  }

  .rd-description {
    font-size: 0.9rem;
    color: #64748b;
    line-height: 1.6;
    margin: 0;
  }

  /* Amenities */
  .rd-amenities {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .rd-amenity {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #f8fafc;
    border-radius: 12px;
    border: 1px solid #f1f5f9;
    transition: all 0.2s ease;
  }

  .rd-amenity:active {
    background: #f1f5f9;
    transform: scale(0.98);
  }

  .rd-amenity__icon {
    font-size: 1.25rem;
  }

  .rd-amenity__label {
    font-size: 0.8rem;
    color: #475569;
    font-weight: 500;
  }

  .rd-amenity.is-disabled {
    opacity: 0.5;
  }

  /* House Rules */
  .rd-rules {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .rd-rule {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: #f8fafc;
    border-radius: 12px;
  }

  .rd-rule.is-allowed {
    border: 1px solid #dcfce7;
  }

  .rd-rule.is-not-allowed {
    border: 1px solid #fee2e2;
  }

  .rd-rule__icon {
    flex-shrink: 0;
  }

  .rd-rule.is-allowed .rd-rule__icon {
    color: #16a34a;
  }

  .rd-rule.is-not-allowed .rd-rule__icon {
    color: #dc2626;
  }

  .rd-rule__label {
    font-size: 0.85rem;
    color: #475569;
  }

  /* Lister Card */
  .rd-lister {
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    border-radius: 20px;
    padding: 1.25rem;
    margin-bottom: 1.25rem;
    border: 1px solid #e2e8f0;
    animation: slideUpFade 0.5s ease-out 0.35s backwards;
  }

  .rd-lister__header {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    margin-bottom: 1rem;
  }

  .rd-lister__avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #22c55e, #16a34a);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.25rem;
    font-weight: 700;
  }

  .rd-lister__avatar--fallback {
    background: linear-gradient(135deg, #94a3b8, #64748b);
  }

  .rd-lister__info {
    flex: 1;
  }

  .rd-lister__name {
    font-size: 1rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.25rem 0;
  }

  .rd-lister__meta {
    font-size: 0.8rem;
    color: #64748b;
    margin: 0;
  }

  .rd-lister__verified {
    color: #22c55e;
  }

  .rd-lister__contacts {
    display: flex;
    gap: 0.5rem;
  }

  .rd-contact-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0.6rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 500;
    color: #475569;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .rd-contact-btn:active {
    background: #f8fafc;
    transform: scale(0.98);
  }

  .rd-contact-btn--whatsapp {
    background: #25d366;
    color: white;
    border-color: #25d366;
  }

  .rd-lister__locked {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border-radius: 12px;
  }

  .rd-lister__locked p {
    font-size: 0.8rem;
    color: #92400e;
    margin: 0;
  }

  /* Owner Section */
  .rd-owner {
    background: white;
    border-radius: 16px;
    padding: 1rem;
    margin-bottom: 1.25rem;
    border: 1px solid #f1f5f9;
    animation: slideUpFade 0.5s ease-out 0.4s backwards;
  }

  .rd-owner__title {
    font-size: 0.85rem;
    font-weight: 600;
    color: #64748b;
    margin: 0 0 0.5rem 0;
  }

  .rd-owner__name {
    font-size: 0.95rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
  }

  .rd-owner__phone {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    color: #22c55e;
    font-size: 0.85rem;
    font-weight: 500;
    text-decoration: none;
  }

  .rd-owner__locked {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8rem;
    color: #64748b;
  }

  /* Action Buttons */
  .rd-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
    animation: slideUpFade 0.5s ease-out 0.45s backwards;
  }

  .rd-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 1rem;
    border-radius: 14px;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .rd-btn--primary {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    color: white;
    box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);
  }

  .rd-btn--primary:active {
    transform: scale(0.96);
    box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
  }

  .rd-btn--primary.rd-btn--disabled {
    background: #94a3b8;
    cursor: not-allowed;
    box-shadow: none;
  }

  .rd-btn--secondary {
    background: white;
    color: #475569;
    border: 1.5px solid #e2e8f0;
  }

  .rd-btn--secondary:active {
    background: #f8fafc;
    transform: scale(0.96);
  }

  /* Safety Section */
  .rd-safety {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, #fefce8, #fef9c3);
    border-radius: 12px;
    border: 1px solid #fde047;
    margin-bottom: 1.25rem;
    animation: slideUpFade 0.5s ease-out 0.5s backwards;
  }

  .rd-safety__content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: #854d0e;
  }

  .rd-report-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: none;
    color: #854d0e;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .rd-report-btn:active {
    color: #dc2626;
  }
`;
