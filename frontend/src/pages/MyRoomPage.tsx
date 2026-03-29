import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, PhoneCall, MessageCircle, CheckCircle2 } from 'lucide-react';
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
  room_type?: string;
  floor?: string;
  near_universities?: string[];
  lat?: number;
  lng?: number;
  price_monthly?: number;
  security_deposit?: number;
  house_rules?: string[];
  amenities?: string[];
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
  const [landlord, setLandlord] = useState<Profile | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'payment' | 'rules'>('overview');
  const [localReservation, setLocalReservation] = useState<any>(null);

  useEffect(() => {
    // Load any reservation passed via navigation state or stored locally up front
    if ((location.state as any)?.listingId) {
      setLocalReservation(location.state);
    } else {
      const stored = localStorage.getItem(user?.userId ? `myRoomReservation:${user.userId}` : 'myRoomReservation');
      if (stored) {
        try {
          setLocalReservation(JSON.parse(stored));
        } catch {
          setLocalReservation(null);
        }
      }
    }
  }, [location.state, user?.userId]);

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
            { column: 'status', op: 'in', value: '(approved,reserved,paid)' }
          ],
          order: 'created_at.desc',
          limit: 1,
          accessToken: token
        });

        const active = bookingRows?.[0];
        if (!active) {
          if (mounted) {
            setBooking(null);
            setListing(null);
            setPhotos([]);
          }
          return;
        }

        const listingRows = await selectRows('listings', {
          select: 'id,title,address,district,ward,room_type,floor,near_universities,lat,lng,price_monthly,security_deposit,house_rules,amenities',
          filters: [{ column: 'id', op: 'eq', value: active.listing_id }],
          accessToken: token
        });

        const photoRows = await selectRows('listing_photos', {
          select: 'url',
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
        setListing(listingRows?.[0] || null);
        setPhotos((photoRows || []).map((p: any) => p.url));
        setLandlord(landlordRows?.[0] || null);
        setPayments(paymentRows || []);
        setLocalReservation(null);
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to load your room');
          // fallback to local reservation if available
          const stored = localStorage.getItem(user?.userId ? `myRoomReservation:${user.userId}` : 'myRoomReservation');
          if (stored) {
            try {
              setLocalReservation(JSON.parse(stored));
            } catch {
              setLocalReservation(null);
            }
          }
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

  if (!user?.userId) {
    return (
      <div className="container section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p className="muted">Please log in to view your room.</p>
        <Link to="/login" className="btn">Login</Link>
      </div>
    );
  }

  if (!loading && !booking && !localReservation) {
    return (
      <div className="container section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h1 style={{ marginBottom: '0.6rem' }}>My room</h1>
        <p className="muted" style={{ marginBottom: '1.2rem' }}>You don&apos;t have an active booking yet.</p>
        <Link to="/search" className="btn">Browse rooms</Link>
      </div>
    );
  }

  return (
    <div className="container section" style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 900 }}>
        <header style={{ marginBottom: '0.75rem' }}>
          <p style={{ margin: 0, color: 'var(--mid)' }}>Hi {user?.fullName?.split(' ')[0] || 'there'},</p>
          <h1 style={{ margin: '0.2rem 0', fontSize: '1.6rem', fontWeight: 800 }}>My room</h1>
        </header>

        {loading ? (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`s-${i}`} style={{ height: 120, borderRadius: 12, background: 'var(--cream)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : (
          <>
            <div
              style={{
                background: '#E8F6EF',
                border: `1px solid ${PRIMARY}33`,
                color: PRIMARY,
                padding: '0.9rem 1rem',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginBottom: '0.9rem'
              }}
            >
              <CheckCircle2 size={22} />
              <div>
                <strong>Payment confirmed</strong>
                <p style={{ margin: 0, color: '#245b46' }}>
                  Move-in: {formatDate(booking?.move_in_date || localReservation?.moveInDate)}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto' }}>
              {(['overview', 'payment', 'rules'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '0.55rem 0.9rem',
                    borderRadius: 10,
                    border: `1px solid ${activeTab === tab ? PRIMARY : 'var(--border)'}`,
                    background: activeTab === tab ? PRIMARY : '#fff',
                    color: activeTab === tab ? '#fff' : 'var(--ink)',
                    fontWeight: 700,
                    minWidth: 110
                  }}
                >
                  {tab === 'overview' ? 'Overview' : tab === 'payment' ? 'Payment' : 'House rules'}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="card" style={{ padding: '1rem', borderRadius: 14 }}>
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: '0.9rem' }}>
                  <img
                    src={photos?.[0] || localReservation?.coverPhoto || 'https://placehold.co/800x450/1D9E75/ffffff?text=CampusStay+TZ'}
                    alt={listing?.title || localReservation?.title || 'Room photo'}
                    style={{ width: '100%', height: 220, objectFit: 'cover' }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      background: PRIMARY,
                      color: '#fff',
                      padding: '0.25rem 0.65rem',
                      borderRadius: 999,
                      fontWeight: 700,
                      fontSize: '0.8rem'
                    }}
                  >
                    {listing?.room_type || localReservation?.roomType || 'Room'}
                  </span>
                </div>

                <h2 style={{ margin: '0 0 0.2rem' }}>{listing?.title || localReservation?.title || 'Reserved room'}</h2>
                <p style={{ margin: 0, color: 'var(--mid)' }}>
                  {listing?.address || localReservation?.address || listing?.ward || listing?.district || 'Address pending'}
                  {distanceLabel(listing) ? ` • ${distanceLabel(listing)}` : ''}
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
                    gap: '0.6rem',
                    marginTop: '0.8rem'
                  }}
                >
                  <InfoRow label="Room type" value={listing?.room_type || localReservation?.roomType || '—'} />
                  <InfoRow label="Floor" value={listing?.floor || '—'} />
                  <InfoRow label="Move-in" value={formatDate(booking?.move_in_date || localReservation?.moveInDate)} />
                  <InfoRow label="Lease" value={`${booking?.duration_months || localReservation?.months || 0} months`} />
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <p style={{ margin: '0 0 0.4rem', fontWeight: 700 }}>Amenities</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {(listing?.amenities || []).map((a) => (
                      <span
                        key={a}
                        style={{
                          padding: '0.3rem 0.65rem',
                          borderRadius: 999,
                          background: '#eef6f3',
                          color: '#1d4d39',
                          fontWeight: 600,
                          fontSize: '0.88rem'
                        }}
                      >
                        {a}
                      </span>
                    ))}
                    {(listing?.amenities || []).length === 0 ? (
                      <span className="muted">No amenities listed.</span>
                    ) : null}
                  </div>
                </div>

                <div className="card" style={{ marginTop: '1rem', padding: '0.9rem', borderRadius: 12 }}>
                  <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    <Avatar name={landlord?.full_name || 'Landlord'} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700 }}>
                        {landlord?.full_name || 'Dalali / Landlord'}{' '}
                        {landlord?.verification_status === 'APPROVED' ? (
                          <span style={{ color: PRIMARY, fontSize: '0.85rem' }}>• Verified</span>
                        ) : null}
                      </p>
                      <p style={{ margin: 0, color: 'var(--mid)' }}>{landlord?.role || 'Dalali'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {landlord?.phone ? (
                        <a className="btn btn--ghost btn--small" href={`tel:${landlord.phone}`}>Call</a>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn--ghost btn--small"
                        onClick={() => navigate('/messages')}
                      >
                        Message
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="card" style={{ padding: '1rem', borderRadius: 14, display: 'grid', gap: '0.9rem' }}>
                <div className="card" style={{ padding: '0.9rem', borderRadius: 12 }}>
                  <p style={{ margin: 0, color: 'var(--mid)' }}>Payment summary</p>
                  <Row label="Monthly rent" value={formatTZS(listing?.price_monthly || localReservation?.priceMonthly)} />
                  <Row label="Security deposit" value={formatTZS(listing?.security_deposit)} />
                  <Row label="Platform fee" value={formatTZS(5000)} />
                  <Row label="Total paid" value={formatTZS(mainPayment?.amount || localReservation?.total || listing?.price_monthly)} bold />
                </div>

                <div className="card" style={{ padding: '0.9rem', borderRadius: 12 }}>
                  <p style={{ margin: 0, color: 'var(--mid)' }}>Next payment</p>
                  <Row label="Due date" value={formatDate(nextPayment?.due_date)} />
                  <Row label="Amount" value={formatTZS(nextPayment?.amount)} />
                  <Row label="Status" value={nextPayment?.status || 'Paid'} />
                </div>

                {mainPayment?.reference ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: 999,
                        background: '#eef2f7',
                        color: '#4b5563',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}
                    >
                      Ref: {mainPayment.reference}
                    </span>
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => window.print()}
                    >
                      Download receipt
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {activeTab === 'rules' && (
              <div className="card" style={{ padding: '1rem', borderRadius: 14, display: 'grid', gap: '0.9rem' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700 }}>House rules</p>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', color: 'var(--mid)' }}>
                    {(listing?.house_rules && listing.house_rules.length > 0 ? listing.house_rules : DEFAULT_RULES).map((rule) => (
                      <li key={rule} style={{ marginBottom: '0.35rem' }}>{rule}</li>
                    ))}
                  </ul>
                </div>

                <div className="card" style={{ padding: '0.9rem', borderRadius: 12, background: '#f8faf9' }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>Emergency contacts</p>
                  <Row label="Caretaker" value={landlord?.phone || '—'} />
                  <Row label="Landlord/Dalali" value={landlord?.phone || '—'} />
                  <Row label="CampusStay support" value="+255 700 000 000" />
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
