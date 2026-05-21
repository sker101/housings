import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, MapPin, Share2, FileText, LayoutDashboard, ChevronRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { selectRows, insertRows } from '../lib/supabase';
import ListingMap from '../components/ListingMap';
import { mapListingRow } from '../lib/listings';

const PRIMARY = '#16a34a';

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
  listerId?: string;
  imageUrl?: string;
  photos: any[];
};

type Profile = {
  id: string;
  full_name?: string;
  business_name?: string;
  email?: string;
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
  const [isDashboardActive, setIsDashboardActive] = useState(false);
  const [showVacateReview, setShowVacateReview] = useState(false);
  const [vacateAgreed, setVacateAgreed] = useState(false);
  const [vacateBusy, setVacateBusy] = useState(false);
  const [moveOutNotice, setMoveOutNotice] = useState<any>(null);
  const [intendedMoveOutDate, setIntendedMoveOutDate] = useState(new Date().toISOString().split('T')[0]);

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

      const [listingRows, photoRows, paymentRows, noticeRows] = await Promise.all([
        selectRows('listings', {
          select: '*',
          filters: [{ column: 'id', op: 'eq', value: active.listing_id }],
          accessToken: token
        }),
        selectRows('listing_photos', {
          select: 'public_url,angle,position,is_cover,caption',
          filters: [{ column: 'listing_id', op: 'eq', value: active.listing_id }],
          order: 'position.asc',
          accessToken: token
        }).catch(() => []),
        selectRows('payment_records', {
          select: 'id,amount,due_date,status,reference,paid_at',
          filters: [{ column: 'booking_id', op: 'eq', value: active.id }],
          order: 'due_date.asc',
          accessToken: token
        }).catch(() => []),
        selectRows('move_out_notices', {
          select: '*',
          filters: [{ column: 'booking_id', op: 'eq', value: active.id }],
          limit: 1,
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
      setPayments(paymentRows || []);
      setMoveOutNotice(noticeRows?.[0] || null);

      // FETCH CORRECT LANDLORD/LISTER INFO
      // We prioritize the lister from the listing record to ensure we show the person who posted it
      const listerId = listingData?.lister_id || active.landlord_id;
      if (listerId) {
        const landlordRows = await selectRows('profiles', {
          select: 'id,full_name,business_name,email,phone,verification_status,role',
          filters: [{ column: 'id', op: 'eq', value: listerId }],
          accessToken: token
        }).catch(() => []);
        
        let foundLandlord = landlordRows?.[0];
        if (!foundLandlord && listingData) {
          foundLandlord = {
            id: listerId,
            full_name: listingData.owner_name || 'Property Owner',
            phone: listingData.owner_phone,
            email: listingData.owner_email || listingData.email,
            role: 'landlord'
          };
        }
        setLandlord(foundLandlord || null);
      } else {
        setLandlord(null);
      }
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

  // Derive effective monthly rent from booking's actual paid amounts
  // (listing.price_monthly can be 0 if landlord didn't enter it correctly)
  const effectiveMonthlyRent = useMemo(() => {
    const listed = listing?.price_monthly || 0;
    if (listed > 0) return listed;
    // Back-calculate: total = monthlyRent * months + platformDeposit + gatewayFee
    const total = booking?.total_amount_due || 0;
    const deposit = booking?.platform_deposit_fee || 0;
    const gateway = booking?.gateway_fee || 0;
    const months = booking?.months_duration || 1;
    const rentTotal = total - deposit - gateway;
    return rentTotal > 0 ? Math.round(rentTotal / months) : 0;
  }, [listing, booking]);

  const computedFees = useMemo(() => {
    const months = booking?.months_duration || 1;
    const rentTotal = effectiveMonthlyRent * months;
    const deposit = Math.round(effectiveMonthlyRent * 0.35);
    const subtotal = rentTotal + deposit;
    const gateway = Math.round(subtotal * 0.035);
    const total = subtotal + gateway;
    return { rentTotal, deposit, gateway, total };
  }, [effectiveMonthlyRent, booking?.months_duration]);

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
          height: 48, width: 48, border: '4px solid #eef6f3', borderTop: '4px solid #16a34a',
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
              style={{ background: 'none', border: 'none', color: '#16a34a', fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem' }}
            >
              Refresh now
            </button>
          </div>
        )}
      </div>
    );
  }
  return (
    <>
      {/* Breadcrumb Header */}
      <header style={{background:'white',borderRadius:'12px',padding:'1rem 1.25rem',margin:'1rem 1rem 0',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',display:'flex',alignItems:'center'}}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid #e2e8f0',
            background: 'white',
            cursor: 'pointer',
            color: '#64748b',
            marginRight: '0.75rem',
            transition: 'all 0.2s',
            padding: 0
          }}
          title="Go Back"
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#16a34a';
            e.currentTarget.style.color = '#16a34a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <nav style={{display:'flex',alignItems:'center',gap:'0.5rem',fontSize:'0.9rem'}}>
          <Link 
            to="/tenant/dashboard" 
            className={`topbar-action-btn ${isDashboardActive ? 'is-active' : ''}`}
            onClick={() => setIsDashboardActive(true)}
            style={{display:'flex',alignItems:'center',gap:'0.35rem',color:'#64748b',textDecoration:'none',padding:'4px 8px',background:'transparent',border:'none',borderRadius:'8px'}}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
          <ChevronRight size={16} style={{color:'#cbd5e1'}} />
          <span style={{color:'#1e293b',fontWeight:600}}>My Room</span>
        </nav>
      </header>

      <div className="container section" style={{paddingTop:0}}>
      {/* ── Room Header & Content ── */}

      <div style={{ width: '100%', maxWidth: 900 }}>

        {/* ── Green header banner ── */}
        <div style={{
          background: '#16a34a', borderRadius: 16, padding: '1.25rem 1.5rem',
          marginBottom: '1rem', color: '#fff', marginLeft: '0.75rem', marginRight: '0.75rem'
        }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#86efac' }}>
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
                      color: activeTab === tab ? '#16a34a' : 'var(--mid)',
                      borderBottom: activeTab === tab ? '2px solid #16a34a' : '2px solid transparent',
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
                <div style={{ borderRadius: 14, overflow: 'hidden', position: 'relative', background: '#f5f5f0', marginLeft: '0.75rem', marginRight: '0.75rem' }}>
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
                    background: '#16a34a', color: '#fff',
                    padding: '0.35rem 0.75rem', borderRadius: 999, fontSize: '0.82rem', fontWeight: 700
                  }}>
                    {listing?.room_type || 'Room'}
                  </span>
                </div>

                {/* Thumbnail gallery - Grid */}
                {photos && photos.length > 1 && (
                  <div style={{
                    display: 'grid', gap: '0.5rem',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    marginLeft: '0.75rem',
                    marginRight: '0.75rem'
                  }}>
                    {photos.map((photo, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActivePhotoIndex(idx)}
                        style={{
                          borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                          border: activePhotoIndex === idx ? '3px solid #16a34a' : '3px solid transparent',
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginLeft: '0.75rem', marginRight: '0.75rem' }}>
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

                <div className="card" style={{ padding: '0.9rem', borderRadius: 12, marginLeft: '0.75rem', marginRight: '0.75rem' }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--mid)' }}>Lease progress</p>
                  <div style={{ background: 'var(--cream)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                    <div style={{ background: '#16a34a', width: `${leaseProgressPct}%`, height: '100%', borderRadius: 999 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--mid)' }}>{formatDate(booking?.move_in_date)}</span>
                    <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
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
                    <MapPin size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
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
                <div className="card" style={{ padding: '0.9rem', borderRadius: 12, background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1.5px solid #86efac', marginLeft: '0.75rem', marginRight: '0.75rem' }}>
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
                    <Avatar name={landlord?.full_name || landlord?.business_name || (landlord?.email ? landlord.email.split('@')[0] : 'Landlord')} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700 }}>{landlord?.full_name || landlord?.business_name || (landlord?.email ? landlord.email.split('@')[0] : 'Landlord')}</p>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--mid)' }}>
                        {landlord?.role === 'dalali' ? 'Verified Dalali' : 'Property Owner'}
                        {landlord?.verification_status === 'APPROVED' && (
                          <span style={{ color: '#16a34a', marginLeft: '0.4rem' }}>· Verified</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--mid)' }}>Phone</span>
                      {landlord?.phone
                        ? <a href={`tel:${landlord.phone}`} style={{ color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>{landlord.phone}</a>
                        : <span style={{ color: 'var(--mid)' }}>—</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--mid)' }}>WhatsApp</span>
                      {landlord?.phone
                        ? <a href={`https://wa.me/${landlord.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>Open WhatsApp</a>
                        : <span style={{ color: 'var(--mid)' }}>—</span>}
                    </div>
                  </div>
                  {(!booking || !['paid', 'confirmed', 'active', 'approved', 'completed'].includes(booking.status)) ? (
                    <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.8rem', color: '#9a3412', background: '#fff7ed', padding: '0.5rem', borderRadius: 8, border: '1px solid #fed7aa', width: '100%', textAlign: 'center', lineHeight: 1.4 }}>
                      🔒 Contact information and chats are unlocked after payment is completed.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <span style={{ fontWeight: 600 }}>
                        Landlord: {landlord?.full_name || landlord?.business_name || (landlord?.email ? landlord.email.split('@')[0] : 'Landlord')}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {landlord?.phone && (
                          <a href={`tel:${landlord.phone}`} className="btn btn--ghost btn--small" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                            Call
                          </a>
                        )}
                        <button 
                          type="button" 
                          className="btn btn--ghost btn--small" 
                          style={{ flex: 1 }} 
                          onClick={async () => {
                            const targetLandlordId = landlord?.id || listing?.listerId || listing?.lister_id || booking?.landlord_id;
                            if (!user?.userId || !targetLandlordId || !listing?.id || !token) {
                              alert('Unable to start chat. Missing user or landlord data.');
                              return;
                            }
                            try {
                              const { rpc } = await import('../lib/supabase');
                              const result = await rpc('start_conversation', {
                                p_listing_id: listing.id,
                                p_tenant_id: user.userId,
                                p_landlord_id: targetLandlordId
                              }, token);

                              const conversationId = result?.conversation_id;

                              if (conversationId) {
                                navigate(`/messages/${conversationId}`);
                              } else {
                                alert('Unable to create conversation.');
                              }
                            } catch (err: any) {
                              console.error('Error starting conversation:', err);
                              alert('An error occurred while starting the chat: ' + (err.message || String(err)));
                            }
                          }}
                        >
                          Message
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="card" style={{ padding: '1rem', borderRadius: 14 }}>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: 'var(--mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>iRent Support</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--mid)' }}>Helpline</span>
                    <a href="tel:+255800000000" style={{ color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>+255 800 000 000</a>
                  </div>
                </div>
              </div>
            )}

            {/* ── PAYMENT TAB ── */}
            {activeTab === 'payment' && (
              <div style={{ display: 'grid', gap: '0.9rem' }}>

                {/* ── Full Payment Analysis ── */}
                <div className="card" style={{ padding: '1.1rem', borderRadius: 14 }}>
                  <p style={{ margin: '0 0 0.9rem', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    💳 Payment Analysis
                  </p>

                  {/* Monthly rent row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--mid)', fontSize: '0.88rem' }}>Monthly rent</span>
                    <span style={{ fontWeight: 600 }}>{formatTZS(effectiveMonthlyRent)}</span>
                  </div>

                  {/* Lease duration */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--mid)', fontSize: '0.88rem' }}>Lease duration</span>
                    <span style={{ fontWeight: 600 }}>{booking?.months_duration || 0} month{(booking?.months_duration || 0) !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Total rent over lease */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--mid)', fontSize: '0.88rem' }}>Total rent ({booking?.months_duration || 0} months)</span>
                    <span style={{ fontWeight: 600 }}>{formatTZS(effectiveMonthlyRent * (booking?.months_duration || 0))}</span>
                  </div>

                  {/* Fees — Strictly calculated to match the UI explanations */}
                  {(() => {
                    const { deposit, gateway, total } = computedFees;
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                          <div>
                            <span style={{ color: 'var(--mid)', fontSize: '0.88rem' }}>Platform deposit fee</span>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--mid)', fontStyle: 'italic' }}>35% of 1 month's rent · one-time · refundable on lease completion</p>
                          </div>
                          <span style={{ fontWeight: 600 }}>{formatTZS(deposit)}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                          <div>
                            <span style={{ color: 'var(--mid)', fontSize: '0.88rem' }}>Gateway transaction fee</span>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--mid)', fontStyle: 'italic' }}>3.5% of total amount transacted (AzamPay)</p>
                          </div>
                          <span style={{ fontWeight: 600 }}>{formatTZS(gateway)}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', marginTop: '0.5rem', background: '#eef6f3', borderRadius: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#085041' }}>Total paid at move-in</span>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#16a34a' }}>{formatTZS(total)}</span>
                        </div>
                      </>
                    );
                  })()}

                  {booking?.reference && (
                    <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ padding: '0.25rem 0.6rem', borderRadius: 999, background: '#eef2f7', color: '#4b5563', fontWeight: 700, fontSize: '0.8rem' }}>
                        Ref: {booking.reference}
                      </span>
                      <button type="button" className="btn btn--ghost btn--small" style={{ fontSize: '0.8rem' }} onClick={() => window.print()}>
                        Download receipt
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Next Payment ── */}
                <div className="card" style={{ padding: '1.1rem', borderRadius: 14 }}>
                  <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    📅 Next Payment
                  </p>
                  {nextPayment ? (
                    <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 10, padding: '0.9rem' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400E', fontWeight: 600 }}>Due on</p>
                      <p style={{ margin: '0.3rem 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#B45309' }}>
                        {formatDate(nextPayment.due_date)}
                      </p>
                    </div>
                  ) : (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '0.9rem', textAlign: 'center' }}>
                      <p style={{ margin: 0, color: '#166534', fontWeight: 600, fontSize: '0.9rem' }}>✅ All payments are up to date</p>
                      {leaseEndDate && (
                        <p style={{ margin: '0.3rem 0 0', color: '#4ade80', fontSize: '0.82rem' }}>
                          Lease ends: {formatDate(leaseEndDate.toISOString())}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Payment History ── */}
                {payments.length > 0 && (
                  <div className="card" style={{ padding: '1.1rem', borderRadius: 14 }}>
                    <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.95rem' }}>📋 Payment History</p>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {payments.map((p, i) => (
                        <div key={p.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '0.6rem 0.75rem', borderRadius: 8,
                          background: p.status === 'paid' ? '#f0fdf4' : '#FFFBEB',
                          border: `1px solid ${p.status === 'paid' ? '#86efac' : '#FEF3C7'}`
                        }}>
                          <div>
                            <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>
                              Payment #{i + 1}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--mid)' }}>
                              Due: {formatDate(p.due_date)}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem' }}>{formatTZS(p.amount)}</p>
                            <span style={{
                              fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem',
                              borderRadius: 999, textTransform: 'uppercase',
                              background: p.status === 'paid' ? '#dcfce7' : '#fef9c3',
                              color: p.status === 'paid' ? '#166534' : '#854d0e'
                            }}>
                              {p.status || 'pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── CONTRACT TAB ── */}
            {activeTab === 'contract' && (
              <div style={{ display: 'grid', gap: '0.9rem' }}>

                {/* ── Full Tenancy Agreement ── */}
                <div className="card" style={{ padding: '1.25rem', borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                    <FileText size={20} style={{ color: '#16a34a' }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Tenancy Agreement</p>
                  </div>

                  <div id="printable-contract" style={{
                    background: '#fff', border: '1.5px solid #d1d5db',
                    borderRadius: 10, padding: '1.25rem', lineHeight: 1.85,
                    fontSize: '0.82rem', color: '#1e293b', fontFamily: 'Georgia, serif'
                  }}>
                    <style>
                      {`
                        @media print {
                          body * { visibility: hidden; }
                          #printable-contract, #printable-contract * { visibility: visible; }
                          #printable-contract {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            border: none !important;
                            padding: 0 !important;
                          }
                          .no-print { display: none !important; }
                        }
                      `}
                    </style>
                    <p style={{ textAlign: 'center', fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>TENANCY AGREEMENT</p>
                    <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.76rem', marginBottom: '1.25rem' }}>iRent Platform — Digital Rental Contract</p>

                    <p><strong>PARTIES</strong></p>
                    <p style={{ paddingLeft: '1rem', marginBottom: '1rem' }}>
                      <strong>Landlord/Dalali:</strong> {landlord?.full_name || landlord?.business_name || (landlord?.email ? landlord.email.split('@')[0] : 'Landlord')}<br />
                      <strong>Landlord Phone:</strong> {landlord?.phone || 'Contact via iRent messaging'}<br />
                      <strong>Tenant:</strong> {user?.fullName || '—'}<br />
                      <strong>Property:</strong> {listing?.title || '—'} ({listing?.room_type || 'Residential Room'})<br />
                      <strong>Address:</strong> {[listing?.street, listing?.ward, listing?.district].filter(Boolean).join(', ') || 'Dar es Salaam'}<br />
                      <strong>Monthly Rent:</strong> {formatTZS(effectiveMonthlyRent)}<br />
                      <strong>Lease Start:</strong> {formatDate(booking?.move_in_date)}<br />
                      <strong>Lease End:</strong> {leaseEndDate ? formatDate(leaseEndDate.toISOString()) : '—'}<br />
                      <strong>Duration:</strong> {booking?.months_duration || 0} month(s)<br />
                      <strong>Reference:</strong> {booking?.reference || '—'}
                    </p>

                    <p><strong>1. RENT PAYMENT</strong><br />
                    The tenant agrees to pay {formatTZS(effectiveMonthlyRent)} per month, due on the same date as the move-in date each month. Late payments may attract a penalty as agreed with the landlord.</p>

                    <p><strong>2. PLATFORM FEES</strong><br />
                    A platform deposit of {formatTZS(computedFees.deposit)} and gateway processing fee of {formatTZS(computedFees.gateway)} were charged at booking. Total paid at move-in: {formatTZS(computedFees.total)}.</p>

                    <p><strong>3. OBLIGATIONS &amp; HOUSE RULES</strong><br />
                    The tenant shall maintain the property in good condition and report maintenance issues promptly to the landlord. The tenant explicitly agrees to adhere to the following house rules:
                    </p>
                    <ul style={{ marginTop: '0.25rem', paddingLeft: '1.5rem', marginBottom: '1rem', lineHeight: 1.6 }}>
                      {(() => {
                        const raw: any = listing?.house_rules;
                        let rules: string[] = [];
                        if (Array.isArray(raw) && raw.length > 0) rules = raw;
                        else if (typeof raw === 'string' && raw.trim()) {
                          rules = raw.split(/\n|;/).map((s: string) => s.trim()).filter(Boolean);
                        }
                        if (rules.length === 0) rules = DEFAULT_RULES;
                        return rules.map((rule, idx) => (
                          <li key={idx} style={{ marginBottom: '0.25rem' }}>{rule}</li>
                        ));
                      })()}
                    </ul>

                    <p><strong>4. TERMINATION &amp; REFUND POLICY</strong><br />
                    {(listing as any)?.termination_policy
                      ? (listing as any).termination_policy
                      : 'Either party may terminate with adequate notice. Early termination by the tenant may result in forfeiture of the platform deposit. Unused monthly rent for full months may be refunded at the landlord\'s discretion after outstanding dues are settled.'
                    }
                    </p>
                    <ul style={{ marginTop: '0.25rem', paddingLeft: '1.5rem', marginBottom: '1rem', lineHeight: 1.6 }}>
                      <li style={{ marginBottom: '0.25rem' }}><strong>Notice period:</strong> {(listing as any)?.notice_period_days || 30} days written notice required before vacating.</li>
                      <li style={{ marginBottom: '0.25rem' }}><strong>Refund on early exit:</strong> {(listing as any)?.refund_percent > 0 ? `${(listing as any).refund_percent}% of unused prepaid rent is refunded.` : 'No automatic refund — subject to landlord discretion after deducting outstanding dues.'}</li>
                      <li style={{ marginBottom: '0.25rem' }}><strong>Platform deposit:</strong> Non-refundable once tenancy has started.</li>
                    </ul>

                    <p><strong>5. GOVERNING LAW</strong><br />
                    Governed by the laws of the United Republic of Tanzania. Disputes shall be resolved through the Tanzania Rent Restriction Tribunal.</p>

                    {/* SIGNATURE SECTION */}
                    <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', gap: '2rem' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, marginBottom: '2.5rem' }}>Tenant Signature</p>
                        <div style={{ borderBottom: '1px solid #1e293b', width: '100%', marginBottom: '0.5rem' }}></div>
                        <p style={{ margin: '0 0 0.5rem' }}>Name: <strong>{user?.fullName || '____________________'}</strong></p>
                        <p style={{ margin: 0 }}>Date: ____________________</p>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, marginBottom: '2.5rem' }}>Landlord Signature</p>
                        <div style={{ borderBottom: '1px solid #1e293b', width: '100%', marginBottom: '0.5rem' }}></div>
                        <p style={{ margin: '0 0 0.5rem' }}>Name: <strong>{landlord?.full_name || landlord?.business_name || (landlord?.email ? landlord.email.split('@')[0] : '____________________')}</strong></p>
                        <p style={{ margin: 0 }}>Date: ____________________</p>
                      </div>
                    </div>

                    <p style={{ marginTop: '3rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem', fontSize: '0.73rem', color: '#94a3b8' }}>
                      Generated by iRent · {new Date().toLocaleDateString('en-TZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    style={{ width: '100%', marginTop: '0.9rem' }}
                    onClick={() => window.print()}
                  >
                    📥 Download / Print Agreement PDF
                  </button>
                </div>

                {/* ── House Rules ── */}
                <div className="card" style={{ padding: '1.1rem', borderRadius: 14 }}>
                  <p style={{ margin: '0 0 0.9rem', fontWeight: 700, fontSize: '0.95rem' }}>🏠 House Rules &amp; Conditions</p>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {(() => {
                      const raw: any = listing?.house_rules;
                      let rules: string[] = [];
                      if (Array.isArray(raw) && raw.length > 0) rules = raw;
                      else if (typeof raw === 'string' && raw.trim()) {
                        rules = raw.split(/\n|;/).map((s: string) => s.trim()).filter(Boolean);
                      }
                      if (rules.length === 0) rules = DEFAULT_RULES;
                      return rules.map((rule, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start', padding: '0.5rem 0.65rem', background: '#f8fafc', borderRadius: 8 }}>
                          <CheckCircle2 size={14} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                          <span style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.5 }}>{rule}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* ── Termination Policy + Vacate Flow ── */}
                <div className="card" style={{ padding: '1.1rem', borderRadius: 14, border: '1px solid #fecaca' }}>
                  <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.95rem', color: '#b91c1c' }}>⚠️ Contract Termination</p>

                  <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.6rem', background: '#fef2f2', padding: '0.6rem 0.75rem', borderRadius: 8 }}>
                      <span>📌</span>
                      <span style={{ fontSize: '0.84rem', color: '#7f1d1d', lineHeight: 1.5 }}>
                        <strong>Notice period:</strong> {(listing as any)?.notice_period_days || 30} days written notice required before vacating.
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', background: '#fef2f2', padding: '0.6rem 0.75rem', borderRadius: 8 }}>
                      <span>💰</span>
                      <span style={{ fontSize: '0.84rem', color: '#7f1d1d', lineHeight: 1.5 }}>
                        <strong>Refund on early exit:</strong> {(listing as any)?.refund_percent > 0
                          ? `${(listing as any).refund_percent}% of unused prepaid rent is refunded.`
                          : 'No automatic refund — subject to landlord discretion after deducting outstanding dues.'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', background: '#fef2f2', padding: '0.6rem 0.75rem', borderRadius: 8 }}>
                      <span>🔒</span>
                      <span style={{ fontSize: '0.84rem', color: '#7f1d1d', lineHeight: 1.5 }}>
                        <strong>Platform deposit:</strong> Non-refundable once tenancy has started.
                      </span>
                    </div>
                    {(listing as any)?.termination_policy && (
                      <div style={{ display: 'flex', gap: '0.6rem', background: '#fef2f2', padding: '0.6rem 0.75rem', borderRadius: 8 }}>
                        <span>📋</span>
                        <span style={{ fontSize: '0.84rem', color: '#7f1d1d', lineHeight: 1.5 }}>
                          <strong>Landlord policy:</strong> {(listing as any).termination_policy}
                        </span>
                      </div>
                    )}
                  </div>

                  {moveOutNotice && !showVacateReview ? (
                    <div style={{ background: '#ecfdf5', border: '1px solid #10b981', borderRadius: 10, padding: '1rem' }}>
                      <p style={{ margin: '0 0 0.5rem', fontWeight: 700, color: '#047857', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        Move-Out Notice Submitted
                        <button 
                          onClick={() => {
                            setIntendedMoveOutDate(moveOutNotice.intended_move_out_date);
                            setShowVacateReview(true);
                          }}
                          style={{ 
                            background: '#d1fae5', 
                            border: '1px solid #10b981', 
                            color: '#047857', 
                            fontWeight: 600, 
                            fontSize: '0.75rem', 
                            padding: '0.3rem 0.6rem',
                            borderRadius: '20px',
                            cursor: 'pointer', 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}
                        >
                          ✏️ Edit Date
                        </button>
                      </p>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#065f46', lineHeight: 1.5 }}>
                        You have notified the landlord that you intend to vacate on <strong>{new Date(moveOutNotice.intended_move_out_date).toLocaleDateString()}</strong>.
                        The landlord will review and confirm this request to end the tenancy and repost the room.
                      </p>
                    </div>
                  ) : !showVacateReview ? (
                    <button
                      type="button"
                      style={{
                        width: '100%', padding: '0.75rem',
                        background: 'transparent', border: '1.5px solid #fecaca',
                        borderRadius: 10, color: '#b91c1c', fontWeight: 600,
                        fontSize: '0.88rem', cursor: 'pointer'
                      }}
                      onClick={() => setShowVacateReview(true)}
                    >
                      Vacate Room (Terminate Contract)
                    </button>
                  ) : (
                    <div style={{ background: '#fff7ed', border: '1.5px solid #fdba74', borderRadius: 10, padding: '1rem' }}>
                      <p style={{ margin: '0 0 0.6rem', fontWeight: 700, color: '#9a3412', fontSize: '0.9rem' }}>
                        {moveOutNotice ? '✏️ Edit Move-Out Date' : '⚠️ Submit Move-Out Notice'}
                      </p>
                      <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: '#7c2d12', lineHeight: 1.6 }}>
                        Planning to move out? You can <strong>earn a cash reward</strong> by notifying us early so we can start looking for the next tenant!
                        Please specify your exact move-out date below. The landlord will be notified to confirm.
                      </p>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#7c2d12', marginBottom: '0.3rem' }}>Intended Move-Out Date</label>
                        <input 
                          type="date" 
                          value={intendedMoveOutDate}
                          onChange={e => setIntendedMoveOutDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #fca5a5', fontSize: '0.9rem' }}
                        />
                      </div>

                      <label style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                        cursor: 'pointer', marginBottom: '0.9rem',
                        background: '#fff', border: '1.5px solid #fca5a5',
                        borderRadius: 8, padding: '0.75rem'
                      }}>
                        <input
                          type="checkbox"
                          checked={vacateAgreed}
                          onChange={e => setVacateAgreed(e.target.checked)}
                          style={{ width: 18, height: 18, flexShrink: 0, marginTop: '1px', accentColor: '#b91c1c', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.82rem', color: '#7c2d12', lineHeight: 1.55 }}>
                          I confirm that I intend to vacate the property on the selected date. I understand the landlord will be notified to approve the termination.
                        </span>
                      </label>
                      <div style={{ display: 'flex', gap: '0.6rem' }}>
                        <button
                          type="button"
                          style={{ flex: 1, padding: '0.6rem', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem' }}
                          onClick={() => { setShowVacateReview(false); setVacateAgreed(false); }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!vacateAgreed || vacateBusy || !intendedMoveOutDate}
                          style={{
                            flex: 1, padding: '0.6rem',
                            background: vacateAgreed ? '#b91c1c' : '#fca5a5',
                            border: 'none', borderRadius: 8, color: '#fff',
                            fontWeight: 700, fontSize: '0.85rem',
                            cursor: vacateAgreed && !vacateBusy ? 'pointer' : 'not-allowed'
                          }}
                          onClick={async () => {
                            if (!booking?.id || !listing?.id || !token) return;
                            setVacateBusy(true);
                            try {
                              const { insertRows, updateRows } = await import('../lib/supabase');
                              
                              if (moveOutNotice) {
                                await updateRows('move_out_notices', {
                                  intended_move_out_date: intendedMoveOutDate,
                                  status: 'pending'
                                }, {
                                  filters: [{ column: 'id', op: 'eq', value: moveOutNotice.id }],
                                  accessToken: token
                                });
                                await insertRows('notifications', {
                                  user_id: landlord?.id || listing.listerId,
                                  title: 'Updated Move-Out Notice',
                                  body: `${user.fullName || 'Your tenant'} updated their intended move-out date for ${listing.title} to ${new Date(intendedMoveOutDate).toLocaleDateString()}.`,
                                  type: 'system',
                                  is_read: false
                                }, { accessToken: token });
                              } else {
                                await insertRows('move_out_notices', {
                                  booking_id: booking.id,
                                  tenant_id: user.userId,
                                  landlord_id: landlord?.id || listing.listerId,
                                  // property_id is intentionally omitted — it references the properties
                                  // table and the listing.id here is a room ID, not a property ID.
                                  // The approve_move_out_and_reward RPC resolves the listing via booking_id.
                                  intended_move_out_date: intendedMoveOutDate,
                                  status: 'pending'
                                }, { accessToken: token });

                                await insertRows('notifications', {
                                  user_id: landlord?.id || listing.listerId,
                                  title: 'Tenant Move-Out Notice',
                                  body: `${user.fullName || 'Your tenant'} intends to vacate ${listing.title} on ${new Date(intendedMoveOutDate).toLocaleDateString()}. Please review this request.`,
                                  type: 'system',
                                  is_read: false
                                }, { accessToken: token });
                              }

                              window.location.reload();
                            } catch (err: any) {
                              alert('Failed to submit notice: ' + err.message);
                              setVacateBusy(false);
                            }
                          }}
                        >
                          {vacateBusy ? 'Submitting…' : (moveOutNotice ? 'Update Notice' : 'Submit Notice')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Emergency */}
                <div className="card" style={{ padding: '1rem', borderRadius: 14 }}>
                  <p style={{ margin: '0 0 0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={18} style={{ color: '#16a34a' }} /> Emergency Contacts
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', background: '#FEF2F2', borderRadius: 10 }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#991B1B' }}>Fire / Police</p>
                      <strong style={{ fontSize: '1rem', color: '#991B1B' }}>112 / 999</strong>
                    </div>
                    <div style={{ padding: '0.75rem', background: '#F0F9FF', borderRadius: 10 }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#075985' }}>iRent Support</p>
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
    </>
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
