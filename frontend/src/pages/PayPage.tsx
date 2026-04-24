import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { selectRows, upsertRows } from '../lib/supabase';
import { calculateTenantPayment, formatTZS } from '../lib/paymentCalculations';
import { getPaymentProvider } from '../lib/payments/factory';
import { PaymentBreakdownComponent } from '../components/PaymentBreakdown';

export default function PayPage() {
  const location = useLocation();
  const { token, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: location } });
    }
  }, [isAuthenticated, navigate, location]);

  const state = location.state as {
    listingId?: string;
    price?: number;
    title?: string;
    availableFrom?: string;
    coverPhoto?: string | null;
    address?: string;
    listerId?: string;
  } | undefined;

  const [listing, setListing] = useState<any>(
    state?.listingId
      ? {
          id: state.listingId,
          title: state.title,
          price_monthly: state.price,
          available_from: state.availableFrom,
          address: state.address,
          lister_id: state.listerId
        }
      : null
  );
  const [months, setMonths] = useState(1);
  const [moveInDate, setMoveInDate] = useState(() => {
    const today = new Date();
    // Use ISO date part only YYYY-MM-DD
    return today.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [gateway, setGateway] = useState<'selcom' | 'azampay'>('azampay');

  const breakdown = useMemo(() => {
    const monthlyPrice = Number(listing?.price_monthly || 0);
    return calculateTenantPayment(monthlyPrice, months);
  }, [listing?.price_monthly, months]);

  const [isConfirmed, setIsConfirmed] = useState(false);

  const handlePay = async () => {
    if (!isConfirmed) return;
    if (!listing?.id) {
      setError('Select a listing before paying.');
      return;
    }
    if (!user) {
      setError('You must be logged in to make a payment.');
      return;
    }
    
    // 0. ENFORCE PROFILE COMPLETION
    if (!user.phone || user.phone === '') {
        setError('Please complete your profile with a genuine phone number before making a payment.');
        setNotice('Redirecting to profile in 3 seconds...');
        setTimeout(() => navigate('/profile'), 3000);
        return;
    }

    setError('');
    setNotice('');
    setLoading(true);
    
    try {
      const reference = `PAY-${Date.now()}-${user.userId.substring(0, 5)}`;

      console.log('[Pay] Listing data:', { id: listing?.id, lister_id: listing?.lister_id, title: listing?.title });

      // 1. Resolve Role-based IDs
      // Use lister_id directly from listing - it's the landlord/dalali profile ID
      const landlordId = listing.lister_id;
      
      console.log('[Pay] User ID:', user.userId);
      console.log('[Pay] Landlord ID from listing:', landlordId);
      console.log('[Pay] Listing data:', listing);
      
      if (!landlordId) {
          throw new Error('Unable to identify the property lister. Please try again.');
      }
      
      // 1a. Verify listing exists and get actual lister_id from database
      const listingCheck = await selectRows('listings', {
        select: 'id,lister_id',
        filters: [
          { column: 'id', op: 'eq', value: listing.id }
        ],
        limit: 1,
        accessToken: token
      });
      
      if (!listingCheck || listingCheck.length === 0) {
        throw new Error('Listing not found in database.');
      }
      
      const actualListerId = listingCheck[0].lister_id;
      console.log('[Pay] Actual lister_id from DB:', actualListerId);
      
      // Use the actual lister_id from database to ensure RLS passes
      const verifiedLandlordId = actualListerId || landlordId;
      if (actualListerId && actualListerId !== landlordId) {
        console.warn('[Pay] Lister ID mismatch. Using DB value:', actualListerId);
      }
      
      // Get or create tenant record - we need the actual tenant ID (not profile ID)
      let tenantRows = await selectRows('tenants', {
        select: 'id',
        filters: [{ column: 'profile_id', op: 'eq', value: user.userId }],
        limit: 1,
        accessToken: token
      });
      
      let realTenantId = tenantRows?.[0]?.id;
      console.log('[Pay] Tenant record found:', realTenantId || 'No');
      
      if (!realTenantId) {
          // Create tenant record if missing
          console.log('[Pay] Creating tenant record for:', user.userId);
          const newTenant = await upsertRows('tenants', { 
            profile_id: user.userId, 
            tenant_type: 'student'
          }, { accessToken: token });
          realTenantId = newTenant?.[0]?.id;
          console.log('[Pay] Created tenant record:', realTenantId);
      }
      
      if (!realTenantId) {
        throw new Error('Unable to create tenant record. Please try again.');
      }
      
      // Use the actual tenant record ID for the booking (FK constraint requires this)
      const tenantIdForBooking = realTenantId;

      // 2. Create/Update Booking with fee data
      const existing = await selectRows('bookings', {
        select: 'id',
        filters: [
          { column: 'tenant_id', op: 'eq', value: tenantIdForBooking },
          { column: 'listing_id', op: 'eq', value: listing.id },
          { column: 'status', op: 'in', value: '(pending,confirmed)' }
        ],
        limit: 1,
        accessToken: token
      });

      let bookingId = existing?.[0]?.id;

      if (!bookingId) {
        const bookingData = {
          listing_id: listing.id,
          tenant_id: tenantIdForBooking,
          landlord_id: verifiedLandlordId,
          move_in_date: moveInDate,
          months_duration: months,
          total_tzs: breakdown.totalDue,
          platform_deposit_fee: breakdown.platformDepositFee,
          gateway_fee: breakdown.gatewayFee,
          total_amount_due: breakdown.totalDue,
          status: 'pending',
          reference: reference,
          notes: `Reservation for ${listing.title} including platform deposit fee`
        };
        console.log('[Pay] Creating booking with data:', bookingData);
        
        try {
          // Direct insert - RLS is disabled
          const newBooking = await upsertRows('bookings', bookingData, { accessToken: token });
          bookingId = newBooking?.[0]?.id;
        } catch (bookingErr: any) {
          console.error('[Pay] Booking creation failed:', bookingErr);
          console.error('[Pay] Error details:', bookingErr.message || bookingErr);
          console.error('[Pay] Full error object:', JSON.stringify(bookingErr, null, 2));
          throw new Error(`Booking creation failed: ${bookingErr.message || bookingErr.error || 'Database error'}`);
        }
        if (!bookingId) throw new Error('Failed to create booking record.');
      }

      // 3. Initiate Payment using Provider Abstraction
      const provider = getPaymentProvider(token || '');
      const response = await provider.initiatePayment({
        amount: breakdown.totalDue,
        reference: reference,
        customerName: user.fullName,
        customerEmail: user.email,
        customerPhone: user.phone,
        metadata: {
          bookingId,
          listingId: listing.id,
          breakdown: breakdown
        }
      });

      if (response.success) {
        if (response.checkoutUrl) {
          window.location.href = response.checkoutUrl;
        } else {
          setSuccessData({ reference: reference, amount: breakdown.totalDue });
        }
      } else {
        throw new Error(response.error || 'Payment failed to initiate.');
      }
    } catch (err: any) {
      console.error('[Pay] Payment error:', err);
      setError(err.message || 'Unable to start payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const [successData, setSuccessData] = useState<{ reference: string; amount: number } | null>(null);

  if (successData) {
    return (
      <div className="container section" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ maxWidth: 450, width: '100%', textAlign: 'center', padding: '3rem 2rem', borderRadius: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
          <div style={{ background: 'var(--jade)', color: 'white', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <ShieldCheck size={48} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Payment Confirmed!</h1>
          <p style={{ color: 'var(--mid)', marginBottom: '2rem' }}>
            Your room has been reserved. You can now view your room details and lease in your dashboard.
          </p>
          
          <div style={{ background: 'var(--cream)', padding: '1.25rem', borderRadius: 16, marginBottom: '2rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--mid)', fontSize: '0.9rem' }}>Reference</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{successData.reference}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--mid)', fontSize: '0.9rem' }}>Amount Paid</span>
              <span style={{ fontWeight: 700 }}>{formatTZS(successData.amount)}</span>
            </div>
          </div>

          <button className="btn" style={{ width: '100%' }} onClick={() => navigate('/my-room?payment=success')}>
            Go to My Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container section" style={{ display: 'flex', justifyContent: 'center' }}>
      <section
        className="card"
        style={{
          maxWidth: 720,
          width: '100%',
          borderRadius: 18,
          padding: '1.75rem',
          boxShadow: '0 18px 42px rgba(12, 40, 22, 0.16)'
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: '0.4rem', fontSize: '1.6rem', fontWeight: 800 }}>
          Reserve & Pay
        </h1>
        <p style={{ color: 'var(--mid)', marginTop: 0, marginBottom: '1rem' }}>
          Confirm the room and reserve it by paying the listed monthly rate.
        </p>

        {error ? <p className="error-text">{error}</p> : null}
        {notice ? <p className="success-text">{notice}</p> : null}

        <div style={{ display: 'grid', gap: '0.85rem' }}>
          <div className="card" style={{ padding: '1rem', border: '1px solid var(--border)', background: '#f9faf9' }}>
            <p style={{ margin: 0, color: 'var(--mid)', fontSize: '0.9rem' }}>Selected room</p>
            <strong style={{ display: 'block', fontSize: '1.05rem', marginTop: '0.15rem' }}>
              {listing?.title || 'Loading...'}
            </strong>
            <p style={{ margin: '0.2rem 0', color: '#27500A', fontWeight: 700 }}>
              TZS {new Intl.NumberFormat('sw-TZ').format(Number(listing?.price_monthly || 0))} / month
            </p>
          </div>

          <PaymentBreakdownComponent 
            breakdown={breakdown} 
            months={months}
            onConfirm={(confirmed) => setIsConfirmed(confirmed)} 
          />

          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span style={{ fontWeight: 600 }}>Months to reserve</span>
            <input
              type="number"
              min={1}
              max={12}
              value={months || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setMonths(0);
                  return;
                }
                const n = parseInt(val, 10);
                if (!isNaN(n)) {
                  setMonths(Math.max(0, Math.min(12, n)));
                }
              }}
              onBlur={() => {
                if (!months || months < 1) setMonths(1);
              }}
              style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '1rem' }}
            />
          </label>

          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span style={{ fontWeight: 600 }}>Preferred move-in date</span>
            <input
              type="date"
              value={moveInDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setMoveInDate(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border)' }}
            />
          </label>

            <div
              className="card"
              style={{
                padding: '1rem',
                border: '1px solid var(--border)',
                background: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <p style={{ margin: 0, color: 'var(--mid)' }}>Grand Total</p>
                <strong style={{ fontSize: '1.3rem', color: '#27500A' }}>
                  {formatTZS(breakdown.totalDue)}
                </strong>
              </div>
              <button 
                className="btn" 
                type="button" 
                onClick={handlePay} 
                disabled={loading || !isConfirmed}
                style={{ opacity: (loading || !isConfirmed) ? 0.6 : 1 }}
              >
                {loading ? 'Processing...' : 'Pay now'}
              </button>
            </div>

          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => navigate(-1)}
          >
            Go back
          </button>
        </div>
      </section>
    </div>
  );
}
