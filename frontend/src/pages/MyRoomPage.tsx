import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, PhoneCall, MessageCircle, CheckCircle2, MapPin, Share2, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { selectRows } from '../lib/supabase';

const PRIMARY = '#1D9E75';

type Booking = {
  id: string;
  listing_id: string;
  lister_id?: string;
  move_in_date?: string;
  duration_months?: number;
  status?: string;
  reference?: string;
};

type Listing = {
  id: string;
  title?: string;
  address?: string;
  district?: string;
  ward?: string;
  street?: string;
  room_type?: string;
  floor?: string;
  near_universities?: string[];
  lat?: number;
  lng?: number;
  price_monthly?: number;
  security_deposit?: number;
  utilities_included?: boolean;
  house_rules?: string[];
  amenities?: string[];
  lister_id?: string;
};

type Profile = {
  id: string;
  full_name?: string;
  phone?: string;
  verification_status?: string;
  role?: string;
};

type PaymentRecord = {
  id: string;
  amount: number;
  due_date?: string;
  status?: string;
  reference?: string;
  paid_at?: string;
};

const DEFAULT_RULES = [
  'Quiet hours after 10 PM.',
  'No smoking inside the property.',
  'Keep shared areas clean.',
  'Visitors allowed until 9 PM.',
  'Report maintenance issues promptly.'
];

function formatTZS(value?: number) {
  return `TZS ${Number(value || 0).toLocaleString('sw-TZ')}`;
}

function formatDate(value?: string) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return value;
  }
}

function distanceLabel(listing?: Listing) {
  if (!listing?.near_universities || listing.near_universities.length === 0) return '';
  return `${listing.near_universities[0]} nearby`;
}

export default function MyRoomPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [landlord, setLandlord] = useState<Profile | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'payment' | 'contract'>('overview');

  // Reset photo index when photos change
  useEffect(() => {
    setActivePhotoIndex(0);
  }, [photos]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user?.userId || !token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');

        const bookingRows = await selectRows('bookings', {
          select: 'id,listing_id,lister_id,move_in_date,duration_months,status,reference,created_at',
          filters: [
            { column: 'tenant_id', op: 'eq', value: user.userId },
            { column: 'status', op: 'in', value: '(approved,completed)' }
          ],
          order: 'created_at.desc',
          limit: 1,
          accessToken: token
        });

        const active = bookingRows?.[0];
        // Fix for lister_id name mismatch if necessary - database says lister_id
        if (!active) {
          if (mounted) {
            setBooking(null);
            setListing(null);
            setPhotos([]);
          }
          return;
        }

        const listingRows = await selectRows('listings', {
          select: 'id,title,district,ward,street,room_type,floor,near_universities,lat,lng,price_monthly,security_deposit,utilities_included,house_rules,amenities,lister_id',
          filters: [{ column: 'id', op: 'eq', value: active.listing_id }],
          accessToken: token
        });

        const photoRows = await selectRows('listing_photos', {
          select: 'public_url,angle,position,is_cover,caption',
          filters: [{ column: 'listing_id', op: 'eq', value: active.listing_id }],
          order: 'position.asc',
          accessToken: token
        }).catch(() => []);

        const landlordRows = await selectRows('profiles', {
          select: 'id,full_name,phone,verification_status,role',
          filters: [{ column: 'id', op: 'eq', value: active.lister_id }],
          accessToken: token
        }).catch(() => []);

        const paymentRows = await selectRows('payment_records', {
          select: 'id,amount,due_date,status,reference,paid_at',
          filters: [{ column: 'booking_id', op: 'eq', value: active.id }],
          order: 'due_date.asc',
          accessToken: token
        }).catch(() => []);

        if (!mounted) return;
        setBooking(active);
        const listingRecord = listingRows?.[0] || null;
        setListing(listingRecord);
        const photoUrls = (photoRows || []).map((p: any) => p.public_url).filter(Boolean);
        setPhotos(photoUrls);
        setLandlord(landlordRows?.[0] || null);
        setPayments(paymentRows || []);
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to load your room');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [user?.userId, token]);

  const mainPayment = useMemo(() => payments[0], [payments]);
  const nextPayment = useMemo(() => payments.find((p) => p.status !== 'paid'), [payments]);

  const leaseEndDate = useMemo(() => {
    const moveIn = booking?.move_in_date;
    const months = booking?.duration_months || 0;
    if (!moveIn || !months) return null;
    const d = new Date(moveIn);
    d.setMonth(d.getMonth() + Number(months));
    return d;
  }, [booking]);

  const daysRemaining = useMemo(() => {
    if (!leaseEndDate) return null;
    const diff = leaseEndDate.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [leaseEndDate]);

  const leaseProgressPct = useMemo(() => {
    const moveIn = booking?.move_in_date;
    const months = booking?.duration_months || 0;
    if (!moveIn || !months || !leaseEndDate) return 0;
    const start = new Date(moveIn).getTime();
    const end = leaseEndDate.getTime();
    const now = Date.now();
    return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  }, [booking, leaseEndDate]);

  if (!user?.userId) {
    return (
      <div className="container section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p className="muted">Please log in to view your room.</p>
        <Link to="/login" className="btn">Login</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h1 style={{ marginBottom: '0.6rem' }}>My room</h1>
        <p className="muted" style={{ marginBottom: '1.2rem' }}>Loading your room details...</p>
      </div>
    );
  }

  // No active booking - show empty state
  if (!booking || !listing) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 200px)',
        padding: '2rem 1rem',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: 420,
          width: '100%',
          padding: '3rem 2.5rem',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          borderRadius: 24,
          border: '2px solid #bbf7d0',
          boxShadow: '0 8px 30px rgba(29,158,117,0.15)'
        }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#1D9E75',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            fontSize: '2rem',
            fontWeight: 700
          }}>
            🏠
          </div>
          <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.75rem', fontWeight: 800, color: '#111827' }}>
            No Room Reserved
          </h1>
          <p style={{ margin: '0 0 2rem', fontSize: '1rem', color: '#6b7280', lineHeight: 1.6 }}>
            You don't have an active room booking yet. Browse available rooms to find your perfect accommodation.
          </p>
          <Link
            to="/tenant/search"
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.875rem 2rem',
              background: 'linear-gradient(135deg, #1D9E75 0%, #15805d 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(29,158,117,0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            Browse Available Rooms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container section" style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 900 }}>

        {/* ── Green header banner ── */}
        <div style={{
          background: '#1D9E75', borderRadius: 16, padding: '1.25rem 1.5rem',
          marginBottom: '1rem', color: '#fff'
        }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#9FE1CB' }}>
            Hi {user?.fullName?.split(' ')[0] || 'there'} — your room is confirmed
          </p>
          <h1 style={{ margin: '0.25rem 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
            {listing?.title || 'Your reserved room'}
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#9FE1CB' }}>
            {[
              listing?.street || listing?.ward || listing?.district,
              distanceLabel(listing) || null,
              `Move-in: ${formatDate(booking?.move_in_date)}`
            ].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* ── 4-tab bar ── */}
        <div style={{ display: 'flex', gap: 0, marginBottom: '1rem', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
          {(['overview', 'contacts', 'payment', 'contract'] as const).map((tab) => {
            const labels: Record<string, string> = {
              overview: 'Overview', contacts: 'Contacts', payment: 'Payment', contract: 'Contract & Rules'
            };
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab as any)}
                style={{
                  padding: '0.6rem 1rem',
                  border: 'none',
                  background: 'transparent',
                  fontWeight: activeTab === tab ? 700 : 400,
                  color: activeTab === tab ? '#1D9E75' : 'var(--mid)',
                  borderBottom: activeTab === tab ? '2px solid #1D9E75' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {/* Photo Gallery - Hero Image */}
            <div style={{ borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
              <img
                src={photos?.[activePhotoIndex] || 'https://placehold.co/800x500/1D9E75/ffffff?text=CampusStay+TZ'}
                alt={listing?.title || 'Room'}
                style={{ width: '100%', height: 300, objectFit: 'cover', display: 'block' }}
              />
              {/* Photo counter badge */}
              {photos && photos.length > 0 && (
                <span style={{
                  position: 'absolute', bottom: 12, right: 12,
                  background: 'rgba(0, 0, 0, 0.8)', color: '#fff',
                  padding: '0.5rem 1rem', borderRadius: 999, fontSize: '0.85rem', fontWeight: 700
                }}>
                  {activePhotoIndex + 1} / {photos.length}
                </span>
              )}
              {/* Room type badge */}
              <span style={{
                position: 'absolute', top: 12, left: 12,
                background: '#1D9E75', color: '#fff',
                padding: '0.35rem 0.75rem', borderRadius: 999, fontSize: '0.82rem', fontWeight: 700
              }}>
                {listing?.room_type || 'Room'}
              </span>
            </div>

            {/* Thumbnail gallery - Grid */}
            {photos && photos.length > 1 && (
              <div style={{
                display: 'grid', gap: '0.5rem',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))'
              }}>
                {photos.map((photo, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    style={{
                      borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                      border: activePhotoIndex === idx ? '3px solid #1D9E75' : '3px solid transparent',
                      transition: 'transform 0.2s',
                      transform: activePhotoIndex === idx ? 'scale(0.95)' : 'scale(1)'
                    }}
                  >
                    <img
                      src={photo}
                      alt={`Photo ${idx + 1}`}
                      style={{
                        width: '100%', height: '100px',
                        objectFit: 'cover', display: 'block'
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ background: '#E8F6EF', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: '#085041' }}>{daysRemaining ?? '—'}</p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#0F6E56' }}>days remaining</p>
              </div>
              <div style={{ background: '#E8F6EF', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#085041' }}>
                  {leaseEndDate
                    ? leaseEndDate.toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#0F6E56' }}>lease ends</p>
              </div>
            </div>

            <div className="card" style={{ padding: '0.9rem', borderRadius: 12 }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--mid)' }}>Lease progress</p>
              <div style={{ background: 'var(--cream)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                <div style={{ background: '#1D9E75', width: `${leaseProgressPct}%`, height: '100%', borderRadius: 999 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--mid)' }}>{formatDate(booking?.move_in_date)}</span>
                <span style={{ fontSize: '0.78rem', color: '#1D9E75', fontWeight: 600 }}>
                  {booking?.duration_months || 0} month lease
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--mid)' }}>
                  {leaseEndDate ? formatDate(leaseEndDate.toISOString()) : '—'}
                </span>
              </div>
            </div>

            <div className="card" style={{ padding: '0.9rem', borderRadius: 12 }}>
              <p style={{ margin: '0 0 0.6rem', fontWeight: 700 }}>Room details</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '0.5rem' }}>
                <InfoRow label="Type" value={listing?.room_type || '—'} />
                <InfoRow label="Floor" value={listing?.floor || '—'} />
                <InfoRow label="Move-in" value={formatDate(booking?.move_in_date)} />
                <InfoRow label="Duration" value={`${booking?.duration_months || 0} months`} />
                <InfoRow label="Monthly rent" value={formatTZS(listing?.price_monthly)} />
                <InfoRow label="Security deposit" value={formatTZS(listing?.security_deposit)} />
                <InfoRow label="Utilities included" value={listing?.utilities_included ? 'Yes' : 'No'} />
                <InfoRow label="Near" value={listing?.near_universities?.[0] || '—'} />
                <InfoRow label="District / Ward" value={[listing?.district, listing?.ward].filter(Boolean).join(' / ') || '—'} />
                <InfoRow label="Full address" value={listing?.street || '—'} />
              </div>
            </div>

            {(listing?.amenities || []).length > 0 && (
              <div className="card" style={{ padding: '0.9rem', borderRadius: 12 }}>
                <p style={{ margin: '0 0 0.6rem', fontWeight: 700 }}>Amenities</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {(listing!.amenities || []).map((a) => (
                    <span key={a} style={{
                      padding: '0.3rem 0.65rem', borderRadius: 999,
                      background: '#eef6f3', color: '#1d4d39', fontWeight: 600, fontSize: '0.85rem'
                    }}>{a}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="card" style={{ padding: '0.9rem', borderRadius: 12 }}>
              <p style={{ margin: '0 0 0.6rem', fontWeight: 700 }}>Location</p>
              <div style={{
                background: '#E8F6EF', borderRadius: 10, padding: '0.75rem',
                marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}>
                <MapPin size={16} style={{ color: '#1D9E75', flexShrink: 0 }} />
                <span style={{ fontSize: '0.88rem', color: '#085041' }}>
                  {[listing?.street || listing?.ward, listing?.district].filter(Boolean).join(', ') || 'Dar es Salaam'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const label = encodeURIComponent(listing?.street || listing?.ward || 'Dar es Salaam');
                  const url = `https://maps.google.com/?q=${listing?.lat ?? ''},${listing?.lng ?? ''}&query=${label}`;
                  if (navigator.share) {
                    navigator.share({ title: listing?.title || 'My room location', url }).catch(() => {});
                  } else {
                    window.open(url, '_blank');
                  }
                }}
                style={{
                  width: '100%', background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '0.6rem', fontSize: '0.88rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  color: 'var(--ink)'
                }}
              >
                <Share2 size={14} /> Share location with friends
              </button>
            </div>
          </div>
        )}

        {/* ── CONTACTS TAB ── */}
        {activeTab === 'contacts' && (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div className="card" style={{ padding: '1rem', borderRadius: 14 }}>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: 'var(--mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {landlord?.role === 'dalali' ? 'Dalali (Broker)' : 'Landlord / Owner'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.9rem' }}>
                <Avatar name={landlord?.full_name || 'L'} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>{landlord?.full_name || '—'}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--mid)' }}>
                  {landlord?.role === 'dalali' ? 'Verified Dalali' : 'Property Owner'}
                  {landlord?.verification_status === 'APPROVED' && (
                    <span style={{ color: '#1D9E75', marginLeft: '0.4rem' }}>· Verified</span>
                  )}
                </p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--mid)' }}>Phone</span>
                {landlord?.phone
                  ? <a href={`tel:${landlord.phone}`} style={{ color: '#1D9E75', fontWeight: 600, textDecoration: 'none' }}>{landlord.phone}</a>
                  : <span style={{ color: 'var(--mid)' }}>—</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--mid)' }}>WhatsApp</span>
                {landlord?.phone
                  ? <a href={`https://wa.me/${landlord.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#1D9E75', fontWeight: 600, textDecoration: 'none' }}>Open WhatsApp</a>
                  : <span style={{ color: 'var(--mid)' }}>—</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              {landlord?.phone && (
                <a href={`tel:${landlord.phone}`} className="btn btn--ghost btn--small" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                  Call
                </a>
              )}
              <button type="button" className="btn btn--ghost btn--small" style={{ flex: 1 }} onClick={() => navigate('/messages')}>
                Message
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: '1rem', borderRadius: 14 }}>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: 'var(--mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CampusStay Support</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--mid)' }}>Helpline</span>
              <a href="tel:+255800000000" style={{ color: '#1D9E75', fontWeight: 600, textDecoration: 'none' }}>+255 800 000 000</a>
            </div>
          </div>
        </div>
        )}

        {/* ── PAYMENT TAB ── */}
        {activeTab === 'payment' && (
          <div className="card" style={{ padding: '1rem', borderRadius: 14, display: 'grid', gap: '0.9rem' }}>
            <div className="card" style={{ padding: '0.9rem', borderRadius: 12 }}>
              <p style={{ margin: 0, color: 'var(--mid)' }}>Payment summary</p>
              <Row label="Monthly rent" value={formatTZS(listing?.price_monthly)} />
              <Row label="Security deposit" value={formatTZS(listing?.security_deposit)} />
              <Row label="Platform fee" value={formatTZS(5000)} />
              <Row label="Total paid" value={formatTZS(mainPayment?.amount || listing?.price_monthly)} bold />
              <Row label="Booking reference" value={booking?.reference || mainPayment?.reference || '—'} />
            </div>
            <div className="card" style={{ padding: '0.9rem', borderRadius: 12 }}>
              <p style={{ margin: 0, color: 'var(--mid)' }}>Next payment</p>
              <Row label="Due date" value={formatDate(nextPayment?.due_date)} />
              <Row label="Amount" value={formatTZS(nextPayment?.amount)} />
              <Row label="Status" value={nextPayment?.status || 'Paid'} />
            </div>
            {(mainPayment?.reference) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ padding: '0.3rem 0.65rem', borderRadius: 999, background: '#eef2f7', color: '#4b5563', fontWeight: 700, fontSize: '0.85rem' }}>
                  Ref: {mainPayment.reference}
                </span>
                <button type="button" className="btn btn--ghost btn--small" onClick={() => window.print()}>
                  Download receipt
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CONTRACT TAB ── */}
        {activeTab === 'contract' && (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div className="card" style={{ padding: '1rem', borderRadius: 14 }}>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 700 }}>Tenancy Agreement</p>
              <div style={{ background: 'var(--cream)', borderRadius: 10, padding: '0.9rem', marginBottom: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <FileText size={16} style={{ color: '#1D9E75' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Rental Agreement</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--mid)', lineHeight: 1.6 }}>
                  Tenant: {user?.fullName || '—'}<br />
                  Landlord/Dalali: {landlord?.full_name || '—'}<br />
                  Period: {formatDate(booking?.move_in_date)} – {leaseEndDate ? formatDate(leaseEndDate.toISOString()) : '—'}
                </p>
              </div>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: 'var(--mid)', lineHeight: 1.5 }}>
                Your rental agreement is managed between you and your landlord/dalali. Contact CampusStay support if you need a certified copy.
              </p>
              <button type="button" className="btn btn--ghost btn--small" style={{ width: '100%' }} onClick={() => window.print()}>
                Print / Save as PDF
              </button>
            </div>

            <div className="card" style={{ padding: '1rem', borderRadius: 14 }}>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 700 }}>House rules</p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--mid)', display: 'grid', gap: '0.35rem' }}>
                {(listing?.house_rules && (Array.isArray(listing.house_rules) ? listing.house_rules.length > 0 : listing.house_rules)
                  ? (Array.isArray(listing.house_rules) ? listing.house_rules : [listing.house_rules])
                  : DEFAULT_RULES
                ).map((rule) => (
                  <li key={rule} style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{rule}</li>
                ))}
              </ul>
            </div>

            <div className="card" style={{ padding: '1rem', borderRadius: 14 }}>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} style={{ color: '#1D9E75' }} /> Emergency stats & contacts
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', background: '#FEF2F2', borderRadius: 10 }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#991B1B' }}>Fire/Police</p>
                  <strong style={{ fontSize: '1rem', color: '#991B1B' }}>112 / 999</strong>
                </div>
                <div style={{ padding: '0.75rem', background: '#F0F9FF', borderRadius: 10 }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#075985' }}>CS Support</p>
                  <strong style={{ fontSize: '1rem', color: '#075985' }}>+255 800 000</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold = false }: { label: string; value?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
      <span style={{ color: 'var(--mid)' }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 600 }}>{value || '—'}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ padding: '0.65rem', border: '1px solid var(--border)', borderRadius: 10 }}>
      <p style={{ margin: 0, color: 'var(--mid)', fontSize: '0.9rem' }}>{label}</p>
      <strong>{value || '—'}</strong>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'L';
  return (
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: '50%',
        background: '#eef6f3',
        color: PRIMARY,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      {initials}
    </div>
  );
}
