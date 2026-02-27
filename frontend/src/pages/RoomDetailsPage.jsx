import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchListingById, toggleSavedListing } from '../lib/listings';
import { insertRows, invokeFunction, selectRows, updateRows } from '../lib/supabase';

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

function humanize(value) {
  if (!value) {
    return 'Not specified';
  }

  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function RoomDetailsPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { user, token, isAuthenticated } = useAuth();

  const [listing, setListing] = useState(null);
  const [listerProfile, setListerProfile] = useState(null);
  const [heroImage, setHeroImage] = useState('');
  const [saved, setSaved] = useState(false);
  const [openInquiry, setOpenInquiry] = useState(false);
  const [moveInDate, setMoveInDate] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadListing() {
      if (!roomId) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const payload = await fetchListingById(roomId, token);
        if (!mounted) {
          return;
        }

        setListing(payload.listing);
        setListerProfile(payload.listerProfile);
        setHeroImage(payload.listing.imageUrl);

        invokeFunction('increment-view', { listingId: payload.listing.id }, token).catch(() => {
          // Best-effort analytics update.
        });
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setListing(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadListing();

    return () => {
      mounted = false;
    };
  }, [roomId, token]);

  useEffect(() => {
    let mounted = true;

    async function loadSavedState() {
      if (!listing?.id || !user?.userId || !token) {
        setSaved(false);
        return;
      }

      try {
        const rows = await selectRows('saved_listings', {
          select: 'tenant_id,listing_id',
          filters: [
            { column: 'tenant_id', op: 'eq', value: user.userId },
            { column: 'listing_id', op: 'eq', value: listing.id }
          ],
          limit: 1,
          accessToken: token
        });

        if (mounted) {
          setSaved(rows.length > 0);
        }
      } catch {
        if (mounted) {
          setSaved(false);
        }
      }
    }

    loadSavedState();

    return () => {
      mounted = false;
    };
  }, [listing?.id, user?.userId, token]);

  const amenities = useMemo(() => {
    if (!listing?.amenities || typeof listing.amenities !== 'object') {
      return [];
    }

    return Object.entries(listing.amenities)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => humanize(key));
  }, [listing?.amenities]);

  const handleToggleSave = async () => {
    if (!listing) {
      return;
    }

    if (!isAuthenticated || !user?.userId) {
      navigate('/login', { state: { from: { pathname: `/rooms/${listing.id}` } } });
      return;
    }

    try {
      const nextSaved = await toggleSavedListing({
        tenantId: user.userId,
        listingId: listing.id,
        accessToken: token
      });
      setSaved(nextSaved);
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

    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await navigator.clipboard.writeText(window.location.href);
    setError('Link copied to clipboard.');
  };

  const submitInquiry = async (event) => {
    event.preventDefault();

    if (!listing || !user?.userId || !token) {
      navigate('/login');
      return;
    }

    if (!message.trim()) {
      setError('Inquiry message is required.');
      return;
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
          body: message.trim()
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

      navigate(`/messages/${conversationId}`);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="container section">
        <p className="muted">Loading listing...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container section">
        <section className="card">
          <h1>Listing unavailable</h1>
          <p className="error-text">{error || 'This listing is not available.'}</p>
          <Link className="btn" to="/search">
            Back to search
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="container section room-page">
      <section className="room-hero card">
        <div className="room-hero__gallery">
          <img src={heroImage || listing.imageUrl} alt={listing.title} className="room-hero__image" />
          <div className="room-hero__thumbs">
            {listing.photos.map((photo) => (
              <button
                type="button"
                key={photo.id}
                className={`room-thumb ${heroImage === photo.public_url ? 'is-active' : ''}`}
                onClick={() => setHeroImage(photo.public_url)}
              >
                <img src={photo.public_url} alt={photo.angle || 'Listing photo'} loading="lazy" />
              </button>
            ))}
          </div>
        </div>

        <div className="room-hero__content">
          <h1>{listing.title}</h1>
          <p className="room-hero__location">{listing.location}</p>
          <p className="room-price">{formatPrice(listing.priceMonthly)}</p>

          <div className="room-chip-row">
            <span className="room-chip">{humanize(listing.roomType)}</span>
            <span className="room-chip">{humanize(listing.genderPreference)}</span>
            <span className="room-chip">{humanize(listing.vacancyStatus)}</span>
            <span className="room-chip">Available from {formatDate(listing.availableFrom)}</span>
          </div>

          <p>{listing.description}</p>

          <section className="card room-lister-card">
            <h2>Lister</h2>
            <p>{listerProfile?.full_name || 'Verified lister'}</p>
            <p className="muted">
              Verification: {humanize(listerProfile?.verification_status || 'pending')}
            </p>
          </section>

          <div className="room-actions">
            <button type="button" className={`btn btn--ghost ${saved ? 'is-saved' : ''}`} onClick={handleToggleSave}>
              {saved ? 'Saved' : 'Save'}
            </button>
            <button type="button" className="btn" onClick={() => setOpenInquiry(true)}>
              Inquire
            </button>
            <button type="button" className="btn btn--ghost" onClick={handleShare}>
              Share
            </button>
          </div>
        </div>
      </section>

      <section className="card room-sections">
        <article>
          <h2>Amenities</h2>
          {amenities.length > 0 ? (
            <div className="room-chip-row">
              {amenities.map((item) => (
                <span key={item} className="room-chip">
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">No amenities listed.</p>
          )}
        </article>

        <article>
          <h2>House rules</h2>
          <p>{listing.houseRules || 'No house rules provided.'}</p>
        </article>

        <article>
          <h2>Location</h2>
          <p>{listing.location}</p>
          {listing.lat && listing.lng ? (
            <a
              href={`https://maps.google.com/?q=${listing.lat},${listing.lng}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn--ghost btn--small"
            >
              Open map pin
            </a>
          ) : null}
        </article>
      </section>

      {openInquiry ? (
        <section className="sheet-backdrop" onClick={() => setOpenInquiry(false)}>
          <article className="sheet" onClick={(event) => event.stopPropagation()}>
            <h2>Send Inquiry</h2>
            <form onSubmit={submitInquiry}>
              <label>
                Move-in date
                <input
                  type="date"
                  value={moveInDate}
                  onChange={(event) => setMoveInDate(event.target.value)}
                />
              </label>

              <label>
                Message
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Hi, I am interested in this listing..."
                  required
                />
              </label>

              <div className="sheet__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setOpenInquiry(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Send
                </button>
              </div>
            </form>
          </article>
        </section>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}

      <div className="sticky-cta">
        <button type="button" className="btn btn--ghost" onClick={handleToggleSave}>
          {saved ? 'Saved' : 'Save'}
        </button>
        <button type="button" className="btn" onClick={() => setOpenInquiry(true)}>
          Inquire
        </button>
      </div>
    </div>
  );
}
