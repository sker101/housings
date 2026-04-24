import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, MapPin, Share2, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { selectRows, insertRows } from '../lib/supabase';
import ListingMap from '../components/ListingMap';
import { mapListingRow } from '../lib/listings';

const PRIMARY = '#1D9E75';

type Booking = {
  id: string;
  listing_id: string;
  landlord_id?: string;
  move_in_date?: string;
  months_duration?: number;
  status?: string;
  reference?: string;
  platform_deposit_fee?: number;
  gateway_fee?: number;
  total_amount_due?: number;
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
  const [, setError] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [landlord, setLandlord] = useState<Profile | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'payment' | 'contract'>('overview');

  const [retryCount, setRetryCount] = useState(0);
  const isPaymentSuccess = location.search.includes('payment=success');

  // Reset photo index when photos change
  useEffect(() => {
    setActivePhotoIndex(0);
  }, [photos]);

  const loadData = async (isMounted: boolean) => {
    if (!user?.userId || !token) {
      setLoading(false);
      return;
    }

    try {
      if (retryCount === 0) setLoading(true);
      setError('');

      // 1. Get the real tenant_id for this profile (create if missing)
      let tenantRows = await selectRows('tenants', {
        select: 'id',
        filters: [{ column: 'profile_id', op: 'eq', value: user.userId }],
        limit: 1,
        accessToken: token
      });
      let realTenantId = tenantRows?.[0]?.id;
      
      // Auto-create tenant record if missing
      if (!realTenantId) {
        console.log('[MyRoom] Creating missing tenant record for:', user.userId);
        try {
          const { insertRows } = await import('../lib/supabase');
          const newTenant = await insertRows('tenants', {
            profile_id: user.userId,
            tenant_type: 'student'
          }, { accessToken: token });
          realTenantId = newTenant?.[0]?.id;
          console.log('[MyRoom] Created tenant record:', realTenantId);
        } catch (tenantErr) {
          console.warn('[MyRoom] Failed to create tenant record:', tenantErr);
        }
      }
      
      console.log('[MyRoom] Real Tenant ID:', realTenantId, 'User Profile ID:', user.userId);

      // 2. Fetch active booking or lease
      // Use the actual tenant record ID for queries (since booking was created with this ID)
      const tenantIdForQuery = realTenantId;
      
      if (!tenantIdForQuery) {
        console.log('[MyRoom] No tenant record, skipping booking fetch');
        setLoading(false);
        return;
      }
      
      console.log('[MyRoom] Fetching data for:', { realTenantId, profileId: user.userId });
      
      // Fetch bookings and leases separately to prevent one failure from blocking the other
      let bookingRows: any[] = [];
      let leaseRows: any[] = [];

      try {
        bookingRows = await selectRows('bookings', {
          select: 'id,listing_id,landlord_id,move_in_date,months_duration,status,created_at,platform_deposit_fee,gateway_fee,total_amount_due',
          or: `tenant_id.eq.${realTenantId},tenant_id.eq.${user.userId}`,
          filters: [
            { column: 'status', op: 'in', value: '(pending,requested,approved,confirmed,completed,disputed,paid,active)' }
          ],
          order: 'created_at.desc',
          limit: 1,
          accessToken: token
        });
        console.log('[MyRoom] Booking query result:', bookingRows);
      } catch (err) {
        console.warn('[MyRoom] Booking query failed:', err);
      }

      try {
        leaseRows = await selectRows('tenant_leases', {
          select: 'id,listing_id,landlord_id,status,created_at,platform_deposit_fee,gateway_fee,total_amount_due',
          or: `tenant_id.eq.${realTenantId},tenant_id.eq.${user.userId}`,
          filters: [
            { column: 'status', op: 'eq', value: 'active' }
          ],
          order: 'created_at.desc',
          limit: 1,
          accessToken: token
        });
        console.log('[MyRoom] Lease query result:', leaseRows);
      } catch (err) {
        console.warn('[MyRoom] Lease query failed:', err);
      }

      console.log('[MyRoom] Bookings found:', bookingRows?.length);
      console.log('[MyRoom] Leases found:', leaseRows?.length);

      let active = bookingRows?.[0];
      
      // If no active booking, check if it's already a lease
      if (!active && leaseRows?.[0]) {
        const lease = leaseRows[0];
        active = {
          ...lease,
          move_in_date: lease.move_in_date || lease.lease_start_date || lease.start_date,
          // map lease status to a booking-like status for UI
          status: 'confirmed' 
        };
      }

      if (!active) {
        if (isMounted) {
          setBooking(null);
          setListing(null);
          setPhotos([]);
          
          if (isPaymentSuccess && retryCount < 5) {
            setTimeout(() => {
              if (isMounted) setRetryCount(prev => prev + 1);
            }, 3000);
          }
        }
        return;
      }

      // SELF-HEALING: If redirect from AzamPay success or status is paid but room is still available
      const shouldOccupy = isPaymentSuccess || active.status === 'paid';
      
      if (shouldOccupy && (active.status === 'requested' || active.status === 'pending' || active.status === 'paid')) {
        console.log('[MyRoom] Self-healing active status:', active.status);
        const { updateRows } = await import('../lib/supabase');
        try {
          const updates: Promise<any>[] = [];
          
          if (active.status !== 'paid') {
            updates.push(updateRows('bookings', { status: 'paid' }, {
              filters: [{ column: 'id', op: 'eq', value: active.id }],
              accessToken: token
            }));
          }

          // Always try to mark the room as occupied to be safe
          updates.push(updateRows('listings', { vacancy_status: 'occupied' }, {
            filters: [{ column: 'id', op: 'eq', value: active.listing_id }],
            accessToken: token
          }));

          if (updates.length > 0) {
            await Promise.all(updates);
            active.status = 'paid'; // Optimistic update
            console.log('[MyRoom] Self-healing completed: status=paid, room=occupied');
          }
        } catch (healErr) {
          console.warn('[MyRoom] Self-healing background update failed (expected if already synced):', healErr);
        }
      }

      const [listingRows, photoRows, landlordRows, paymentRows] = await Promise.all([
        selectRows('listings', {
          select: 'id,title,district,ward,street,room_type,floor,near_universities,lat,lng,price_monthly,security_deposit,utilities_included,house_rules,amenities,lister_id',
          filters: [{ column: 'id', op: 'eq', value: active.listing_id }],
          accessToken: token
        }),
        selectRows('listing_photos', {
          select: 'public_url,angle,position,is_cover,caption',
          filters: [{ column: 'listing_id', op: 'eq', value: active.listing_id }],
          order: 'position.asc',
          accessToken: token
        }).catch(() => []),
        // Get landlord profile directly using landlord_id (which is the profile ID)
        selectRows('profiles', {
          select: 'id,full_name,phone,verification_status,role',
          filters: [{ column: 'id', op: 'eq', value: active.landlord_id }],
          accessToken: token
        }).catch(() => []),
        selectRows('payment_records', {
          select: 'id,amount,due_date,status,reference,paid_at',
          filters: [{ column: 'booking_id', op: 'eq', value: active.id }],
          order: 'due_date.asc',
          accessToken: token
        }).catch(() => [])
      ]);

      if (!isMounted) return;

      const listingData = listingRows?.[0];
      if (listingData) {
        const mapped = mapListingRow(listingData, photoRows || []);
        setListing(mapped);
        setPhotos(mapped.photos.map((p: any) => p.public_url || p).filter(Boolean));
        if (mapped.photos.length === 0 && mapped.imageUrl) {
          setPhotos([mapped.imageUrl]);
        }
      } else {
        setListing(null);
        setPhotos([]);
      }
      
      setBooking(active);
      setLandlord(landlordRows?.[0] || null);
      setPayments(paymentRows || []);
    } catch (err: any) {
      if (isMounted) {
        setError(err.message || 'Failed to load your room');
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    loadData(mounted);
    return () => { mounted = false; };
  }, [user?.userId, token, retryCount]);

  const mainPayment = useMemo(() => payments[0], [payments]);
  const nextPayment = useMemo(() => payments.find((p) => p.status !== 'paid'), [payments]);

  const leaseEndDate = useMemo(() => {
    const moveIn = booking?.move_in_date;
    const months = booking?.months_duration || 0;
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
    const months = booking?.months_duration || 0;
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
        <Link to="/auth/login" className="btn">Login</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h1 style={{ marginBottom: '0.6rem' }}>My room</h1>
        <div style={{
          height: 48, width: 48, border: '4px solid #eef6f3', borderTop: '4px solid #1D9E75',
          borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem'
        }} />
        <p className="muted">
          {isPaymentSuccess ? 'Confirming your payment with AzamPay...' : 'Loading your room details...'}
        </p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h1 style={{ marginBottom: '0.6rem' }}>My room</h1>
        <p className="muted" style={{ marginBottom: '1.2rem' }}>You don&apos;t have an active booking yet.</p>
        <Link to="/tenant/search" className="btn">Browse rooms</Link>
        {isPaymentSuccess && (
          <div style={{ marginTop: '1.5rem', background: '#eef6f3', padding: '1rem', borderRadius: 12 }}>
            <p style={{ color: '#085041', margin: 0, fontSize: '0.9rem' }}>
              Just paid? It might take a few moments for AzamPay to notify our system.
            </p>
            <button
              onClick={() => setRetryCount(prev => prev + 1)}
              style={{ background: 'none', border: 'none', color: '#1D9E75', fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem' }}
            >
              Refresh now
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container section">

      {/* ── Room Header & Content ── */}

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

        {/* ── Pending Payment Banner ── */}
        {(booking?.status === 'requested' || booking?.status === 'pending') && (
          <div style={{
            background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 12, 
            padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
          }}>
            <div style={{
              height: 24, width: 24, border: '3px solid #FDE68A', borderTop: '3px solid #D97706',
              borderRadius: '50%', animation: 'spin 1s linear infinite'
            }} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#92400E', fontSize: '0.9rem' }}>
                Payment confirmation pending
              </p>
              <p style={{ margin: 0, color: '#B45309', fontSize: '0.82rem' }}>
                We're waiting for AzamPay to confirm your transaction. This page will update automatically.
              </p>
              <button 
                onClick={() => {
                   setLoading(true);
                   setRetryCount(prev => prev + 1);
                }}
                style={{
                  marginTop: '0.5rem',
                  background: '#D97706',
                  color: 'white',
                  border: 'none',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Refresh Status
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`s-${i}`} style={{ height: 120, borderRadius: 12, background: 'var(--cream)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : (
          <>
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
                <div style={{ borderRadius: 14, overflow: 'hidden', position: 'relative', background: '#f5f5f0' }}>
                  <img
                    src={photos?.[activePhotoIndex] || (listing as any)?.imageUrl || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80'}
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
                      {booking?.months_duration || 0} month lease
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
                    <InfoRow label="Duration" value={`${booking?.months_duration || 0} months`} />
                    <InfoRow label="Monthly rent" value={formatTZS(listing?.price_monthly)} />
                    <InfoRow label="Security deposit" value={formatTZS(listing?.security_deposit)} />
                    <InfoRow label="Utilities included" value={listing?.utilities_included ? 'Yes' : 'No'} />
                    <InfoRow 
                      label="Near" 
                      value={(() => {
                        const near: any = listing?.near_universities;
                        if (Array.isArray(near)) return near[0] || '—';
                        if (typeof near === 'string') return (near as string).replace(/[{}]/g, '').split(',')[0] || '—';
                        return '—';
                      })()} 
                    />
                    <InfoRow label="District / Ward" value={[listing?.district, listing?.ward].filter(Boolean).join(' / ') || '—'} />
                    <InfoRow label="Full address" value={listing?.street || '—'} />
                  </div>
                </div>

                {(() => {
                  const rawAm: any = listing?.amenities;
                  let amList: string[] = [];
                  
                  if (Array.isArray(rawAm)) {
                    amList = rawAm;
                  } else if (rawAm && typeof rawAm === 'object') {
                    // Handle JSON object { wifi: true, water: false }
                    amList = Object.entries(rawAm)
                      .filter(([_key, val]) => val === true || val === 'true')
                      .map(([key]) => key);
                  } else if (typeof rawAm === 'string') {
                    if (rawAm.trim().startsWith('{') || rawAm.trim().startsWith('[')) {
                      try {
                        const parsed = JSON.parse(rawAm);
                        if (Array.isArray(parsed)) {
                          amList = parsed;
                        } else if (parsed && typeof parsed === 'object') {
                          amList = Object.entries(parsed)
                            .filter(([_key, val]) => val === true || val === 'true')
                            .map(([key]) => key);
                        }
                      } catch {
                        amList = (rawAm as string).replace(/[{}"[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean);
                      }
                    } else {
                      amList = (rawAm as string).replace(/[{}"[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean);
                    }
                  }

                  // Map for amenities to emojis
                  const amenityIcons: Record<string, string> = {
                    wifi: '📶',
                    water: '🚰',
                    electricity: '⚡',
                    generator: '🔋',
                    security: '🛡️',
                    parking: '🚗',
                    furnished: '🛋️',
                    kitchen: '🍳',
                    privateBathroom: '🚿',
                    sharedBathroom: '🚽',
                    laundry: '🧺',
                    tv: '📺',
                    ac: '❄️',
                    fan: '🌬️',
                    balcony: '🌅',
                    cctv: '📹',
                    cleaningService: '🧹',
                    rooftopAccess: '🌇'
                  };

                  // Cleanup labels: wifi -> Wifi, privateBathroom -> Private Bathroom
                  const formatLabel = (s: string) => {
                    const key = s.split(':')[0].trim();
                    const icon = amenityIcons[key] || '🔹';
                    const clean = key
                      .replace(/([A-Z])/g, ' $1') // space before caps
                      .trim();
                    const label = clean.charAt(0).toUpperCase() + clean.slice(1);
                    return `${icon} ${label}`;
                  };

                  if (amList.length === 0) return null;

                  return (
                    <div className="card" style={{ padding: '0.9rem', borderRadius: 12 }}>
                      <p style={{ margin: '0 0 0.6rem', fontWeight: 700 }}>Amenities</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {amList.map((a) => (
                          <span key={a} style={{
                            padding: '0.3rem 0.65rem', borderRadius: 999,
                            background: '#eef6f3', color: '#1d4d39', fontWeight: 600, fontSize: '0.85rem'
                          }}>
                            {formatLabel(a)}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="card" style={{ padding: '0.9rem', borderRadius: 12 }}>
                  <p style={{ margin: '0 0 0.6rem', fontWeight: 700 }}>Location</p>
                  
                  {/* Interactive Mapbox Satellite Map */}
                  <div style={{ 
                    height: '240px', 
                    borderRadius: '12px', 
                    overflow: 'hidden', 
                    marginBottom: '1rem',
                    border: '1px solid var(--border)' 
                  }}>
                    {listing && (
                      <ListingMap 
                        listings={[{
                          ...listing,
                          lat: listing.lat,
                          lng: listing.lng,
                          title: listing.title || 'Your Room',
                          priceMonthly: listing.price_monthly
                        }]} 
                        onMarkerSelect={() => {}} 
                      />
                    )}
                  </div>

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
                    onClick={async () => {
                      const label = encodeURIComponent(listing?.street || listing?.ward || 'Dar es Salaam');
                      const url = `https://maps.google.com/?q=${listing?.lat ?? ''},${listing?.lng ?? ''}&query=${label}`;
                      let shareType: 'native' | 'link' = 'link';
                      if (navigator.share) {
                        shareType = 'native';
                        try {
                          await navigator.share({ title: listing?.title || 'My room location', url });
                        } catch { /* user cancelled */ }
                      } else {
                        window.open(url, '_blank');
                      }
                      // Track the share in DB
                      try {
                        await insertRows('location_shares', {
                          tenant_id: user?.userId,
                          listing_id: listing?.id || booking?.listing_id,
                          share_type: shareType,
                        }, { accessToken: token });
                      } catch (shareErr) {
                        console.warn('Could not record share:', shareErr);
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

                  {/* WhatsApp share shortcut */}
                  <button
                    type="button"
                    onClick={async () => {
                      const label = listing?.street || listing?.ward || 'Dar es Salaam';
                      const mapsUrl = `https://maps.google.com/?q=${listing?.lat ?? ''},${listing?.lng ?? ''}`;
                      const text = encodeURIComponent(`📍 My room at ${listing?.title || 'iRent'}: ${label}\n${mapsUrl}`);
                      window.open(`https://wa.me/?text=${text}`, '_blank');
                      try {
                        await insertRows('location_shares', {
                          tenant_id: user?.userId,
                          listing_id: listing?.id || booking?.listing_id,
                          share_type: 'whatsapp',
                        }, { accessToken: token });
                      } catch { /* ignore */ }
                    }}
                    style={{
                      width: '100%', background: '#25D366', border: 'none',
                      borderRadius: 10, padding: '0.6rem', fontSize: '0.88rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      color: '#fff', fontWeight: 600, marginTop: '0.4rem'
                    }}
                  >
                    Share via WhatsApp
                  </button>
                </div>

                {/* ── Referral Card ── */}
                <div className="card" style={{ padding: '0.9rem', borderRadius: 12, background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1.5px solid #86efac' }}>
                  <p style={{ margin: '0 0 0.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🎁 Refer a friend to iRent</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534', lineHeight: 1.5 }}>
                    Share your referral link with friends. When they book a room, you earn <strong>TZS 5,000</strong> in rewards!
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      const referralLink = `${window.location.origin}/auth/signup?ref=${user?.userId?.slice(0, 8)}`;
                      if (navigator.clipboard) {
                        await navigator.clipboard.writeText(referralLink);
                        alert('Referral link copied!');
                      } else {
                        prompt('Copy your referral link:', referralLink);
                      }
                    }}
                    style={{
                      marginTop: '0.6rem', background: '#16a34a', color: '#fff', border: 'none',
                      borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Copy referral link
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
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: 'var(--mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>iRent Support</p>
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
                  <Row label="Platform deposit fee" value={formatTZS(booking?.platform_deposit_fee)} />
                  <Row label="Gateway transaction fee" value={formatTZS(booking?.gateway_fee)} />
                  <Row label="Total due today" value={formatTZS(booking?.total_amount_due)} bold />
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
                    Your rental agreement is managed between you and your landlord/dalali. Contact iRent support if you need a certified copy.
                  </p>
                  <button type="button" className="btn btn--ghost btn--small" style={{ width: '100%' }} onClick={() => window.print()}>
                    Print / Save as PDF
                  </button>

                  <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #fee2e2' }}>
                    <p style={{ fontSize: '0.85rem', color: '#b91c1c', marginBottom: '0.75rem', fontWeight: 600 }}>Termination</p>
                    <button 
                      type="button" 
                      className="btn btn--ghost btn--small" 
                      style={{ width: '100%', color: '#b91c1c', borderColor: '#fecaca' }}
                      onClick={async () => {
                        if (!booking?.id || !listing?.id || !token) return;
                        if (!window.confirm('Are you sure you want to vacate this room? This will make the room available for others to book.')) return;
                        
                        try {
                          const { updateRows } = await import('../lib/supabase');
                          await Promise.all([
                            updateRows('bookings', { status: 'completed' }, {
                              filters: [{ column: 'id', op: 'eq', value: booking.id }],
                              accessToken: token
                            }),
                            updateRows('listings', { vacancy_status: 'available' }, {
                              filters: [{ column: 'id', op: 'eq', value: listing.id }],
                              accessToken: token
                            })
                          ]);
                          window.location.reload();
                        } catch (err: any) {
                          alert('Failed to vacate: ' + err.message);
                        }
                      }}
                    >
                      Vacate room
                    </button>
                  </div>
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
          </>
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
