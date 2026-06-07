import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Home, AlertTriangle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { selectRows, upsertRows, updateRows, insertRows, rpc } from '../lib/supabase';
import { calculateTenantPayment, formatTZS } from '../lib/paymentCalculations';
import { getPaymentProvider } from '../lib/payments/factory';
import { PaymentBreakdownComponent } from '../components/PaymentBreakdown';

export default function PayPage() {
  const location = useLocation();
  const { token, user, isAuthenticated, refreshMe } = useAuth();
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
    listerType?: string;
    elecType?: string | null;
    elecCost?: number;
    waterType?: string | null;
    waterCost?: number;
    wasteCost?: number | null;
  } | undefined;

  const [listing, setListing] = useState<any>(
    state?.listingId
      ? {
          id: state.listingId,
          title: state.title,
          price_monthly: state.price,
          available_from: state.availableFrom,
          address: state.address,
          lister_id: state.listerId,
          elec_type: state.elecType,
          elec_cost: state.elecCost,
          water_type: state.waterType,
          water_cost: state.waterCost,
          waste_cost: state.wasteCost,
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
  const [phone, setPhone] = useState(user?.phone || '');

  // ── One room per tenant check ──────────────────────────────────────────────
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [checkingBooking, setCheckingBooking] = useState(true);

  useEffect(() => {
    async function checkExistingRoom() {
      if (!user?.userId || !token) { setCheckingBooking(false); return; }
      try {
        // First try the RPC helper
        const rows = await rpc('get_tenant_active_booking', { p_profile_id: user.userId }, token);
        if (rows && rows.length > 0) {
          setActiveBooking(rows[0]);
        }
      } catch {
        // Fallback: direct query if RPC not yet deployed
        try {
          const tenantRows = await selectRows('tenants', {
            select: 'id',
            filters: [{ column: 'profile_id', op: 'eq', value: user.userId }],
            limit: 1, accessToken: token,
          });
          const tenantId = tenantRows?.[0]?.id;
          if (tenantId) {
            const bookings = await selectRows('bookings', {
              select: 'id,listing_id,status,move_in_date',
              filters: [
                { column: 'tenant_id', op: 'eq', value: tenantId },
                { column: 'status', op: 'in', value: "(pending,confirmed,approved,paid)" },
              ],
              order: 'created_at.desc',
              limit: 1, accessToken: token,
            });
            if (bookings?.length > 0) setActiveBooking(bookings[0]);
          }
        } catch { /* silent */ }
      } finally {
        setCheckingBooking(false);
      }
    }
    checkExistingRoom();
  }, [user?.userId, token]);

  const breakdown = useMemo(() => {
    const monthlyPrice = Number(listing?.price_monthly || 0);
    return calculateTenantPayment(monthlyPrice, months);
  }, [listing?.price_monthly, months]);

  const [isConfirmed, setIsConfirmed] = useState(false);

  const handlePay = async () => {
    console.log('[Pay] handlePay called. isConfirmed:', isConfirmed);
    if (!isConfirmed) {
      setError('Please confirm that you have read the breakdown.');
      return;
    }
    if (!listing?.id) {
      setError('Select a listing before paying.');
      return;
    }
    if (!user) {
      setError('You must be logged in to make a payment.');
      return;
    }
    // Double-safety: enforce one room per tenant at payment time too
    if (activeBooking) {
      setError('You already have an active room booking. You cannot reserve another room until you move out.');
      return;
    }
    
    // 0. ENFORCE PHONE NUMBER & AUTO-SAVE TO PROFILE
    const effectivePhone = user.phone || phone;
    if (!effectivePhone || effectivePhone.trim() === '') {
        setError('Please enter your phone number to receive the payment prompt.');
        setNotice('Enter a valid mobile money number (e.g. 07XXXXXXXX)');
        return;
    }

    setError('');
    setNotice('');
    setLoading(true);
    
    try {
      // Auto-save phone to profile if it was missing or different
      if ((!user.phone || user.phone === '') && phone) {
        try {
            await updateRows('profiles', { phone }, {
                filters: [{ column: 'id', op: 'eq', value: user.userId }],
                accessToken: token || ''
            });
            console.log('[Pay] Phone number saved to profile:', phone);
            refreshMe().catch(err => console.warn('[Pay] refreshMe failed:', err));
        } catch (saveErr) {
            console.warn('[Pay] Failed to save phone to profile (non-critical):', saveErr);
        }
      }

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
      console.log('[Pay] Actual lister_id (profile) from DB:', actualListerId);
      
      // 1b. Resolve the landlord_id (foreign key to landlords table)
      let realLandlordId = null;
      try {
        const landlordRows = await selectRows('landlords', {
          select: 'id',
          filters: [{ column: 'profile_id', op: 'eq', value: actualListerId || landlordId }],
          limit: 1,
          accessToken: token
        });
        
        if (landlordRows && landlordRows.length > 0) {
          realLandlordId = landlordRows[0].id;
          console.log('[Pay] Resolved real landlord_id:', realLandlordId);
        } else {
          console.log('[Pay] Landlord record missing, creating self-healing landlord for:', actualListerId);
          const newLandlord = await insertRows('landlords', {
            profile_id: actualListerId || landlordId,
            subscription_tier: 'starter',
            identity_verified: true,
            property_verified: true
          }, { accessToken: token });
          realLandlordId = newLandlord?.[0]?.id;
          console.log('[Pay] Created self-healing landlord record:', realLandlordId);
        }
      } catch (err) {
        console.error('[Pay] Failed to resolve landlord_id:', err);
        realLandlordId = actualListerId || landlordId;
      }
      
      const verifiedLandlordId = realLandlordId;
      
      // Get or create tenant record - we need the actual tenant ID (not profile ID)
      // 1. ENSURE PROFILE EXISTS (Self-healing for broken triggers)
      let profileRows = await selectRows('profiles', {
          select: 'id',
          filters: [{ column: 'id', op: 'eq', value: user.userId }],
          limit: 1,
          accessToken: token
      });

      if (!profileRows || profileRows.length === 0) {
          console.log('[Pay] Profile missing, creating self-healing profile for:', user.userId);
          await insertRows('profiles', {
              id: user.userId,
              full_name: user.fullName || 'New User',
              role: user.role || 'tenant',
              roles: user.roles || ['tenant'],
              phone: effectivePhone,
              verification_status: 'pending'
          }, { accessToken: token });
          console.log('[Pay] Self-healing profile created.');
      }

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
          const newTenant = await insertRows('tenants', { 
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
        console.log('[Pay][V2-NULL-FIX] Creating booking with data:', bookingData);
        
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
      const provider = getPaymentProvider(token || '', gateway);
      const response = await provider.initiatePayment({
        amount: breakdown.totalDue,
        reference: reference,
        customerName: user.fullName,
        customerEmail: user.email,
        customerPhone: effectivePhone,
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

  // ── Blocked: tenant already has a room ─────────────────────────────────────
  if (!checkingBooking && activeBooking) {
    return (
      <div className="container section" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ maxWidth: 440, width: '100%', textAlign: 'center', padding: '3rem 2rem', borderRadius: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
          <div style={{ background: '#fef3c7', color: '#d97706', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Home size={40} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem' }}>Una Chumba Tayari</h1>
          <p style={{ color: 'var(--mid)', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
            Akaunti yako ina uhifadhi wa chumba ambacho bado ni hai.
            Hauwezi kuhifadhi chumba kingine bila kuondoka kwanza.
          </p>
          {activeBooking.listing_title && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chumba chako cha sasa</p>
              <p style={{ margin: '4px 0 0', fontWeight: 700, color: '#111827' }}>{activeBooking.listing_title}</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600, textTransform: 'capitalize' }}>
                Hali: {activeBooking.status}
              </p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn" style={{ width: '100%' }} onClick={() => navigate('/my-room')}>
              <Home size={16} style={{ marginRight: 8 }} />
              Angalia Chumba Changu
            </button>
            <button className="btn btn--ghost" style={{ width: '100%' }} onClick={() => navigate(-1)}>
              Rudi Nyuma
            </button>
          </div>
          <p style={{ margin: '1.25rem 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>
            Unataka kuhamia? Tuma notisi ya kuondoka kutoka kwa dashibodi yako.
          </p>
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

          <div className="card" style={{ padding: '1rem', border: '1px solid var(--border)', background: '#fff' }}>
            <p style={{ margin: 0, color: 'var(--mid)', fontWeight: 600 }}>Payment method</p>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn ${gateway === 'azampay' ? '' : 'btn--ghost'}`}
                onClick={() => setGateway('azampay')}
                style={{ minWidth: 120, border: gateway === 'azampay' ? '2px solid var(--jade)' : '1px solid var(--border)' }}
              >
                AzamPay
              </button>
              <button
                type="button"
                className={`btn ${gateway === 'selcom' ? '' : 'btn--ghost'}`}
                onClick={() => setGateway('selcom')}
                style={{ minWidth: 120, border: gateway === 'selcom' ? '2px solid var(--jade)' : '1px solid var(--border)' }}
              >
                Selcom
              </button>
            </div>
          </div>

          {!user?.phone && (
            <div className="card" style={{ padding: '1rem', border: '1px solid var(--border)', background: '#fff' }}>
              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ fontWeight: 600 }}>Phone number (for mobile money prompt)</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 07XXXXXXXX"
                  style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '1rem' }}
                />
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--mid)' }}>
                  This number will be used to send the payment push prompt to your phone.
                </p>
              </label>
            </div>
          )}

          <PaymentBreakdownComponent 
            breakdown={breakdown} 
            months={months}
            elecType={listing?.elec_type || listing?.elecType || null}
            elecCost={Number(listing?.elec_cost ?? listing?.elecCost ?? 0)}
            waterType={listing?.water_type || listing?.waterType || null}
            waterCost={Number(listing?.water_cost ?? listing?.waterCost ?? 0)}
            wasteCost={Number(listing?.waste_cost ?? listing?.wasteCost ?? 0)}
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
