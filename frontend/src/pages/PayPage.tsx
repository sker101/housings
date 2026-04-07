import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { selectRows, insertRows, SUPABASE_URL } from '../lib/supabase';

export default function PayPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { token, user } = useAuth();

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

  const total = useMemo(() => {
    const price = Number(listing?.price_monthly || 0);
    return price * months;
  }, [listing?.price_monthly, months]);

  useEffect(() => {
    async function load() {
      if (!state?.listingId || listing?.lister_id) return;
      try {
        setLoading(true);
        const rows = await selectRows('listings', {
          select: 'id,title,price_monthly,available_from,district,ward,street,lister_id',
          filters: [{ column: 'id', op: 'eq', value: state.listingId }],
          accessToken: token
        });
        if (rows?.[0]) setListing(rows[0]);
      } catch (err: any) {
        setError(err.message || 'Unable to load listing');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [state?.listingId, listing?.title, token]);

  const handlePay = async () => {
    if (!listing?.id) {
      setError('Select a listing before paying.');
      return;
    }
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const reservation = {
        listingId: listing.id,
        title: listing.title,
        priceMonthly: listing.price_monthly,
        months,
        total,
        reservedAt: new Date().toISOString(),
        moveInDate,
        coverPhoto: state?.coverPhoto || null,
        address: listing.street || listing.ward || listing.district || '',
        reference: `LOCAL-${Date.now()}`
      };
      // 1. Check if an active booking already exists to avoid unique constraint violations
      const existing = await selectRows('bookings', {
        select: 'id',
        filters: [
          { column: 'tenant_id', op: 'eq', value: user.userId },
          { column: 'listing_id', op: 'eq', value: listing.id },
          { column: 'status', op: 'in', value: '(requested,approved)' }
        ],
        limit: 1,
        accessToken: token
      });

      let bookingId = existing?.[0]?.id;

      if (!bookingId) {
        const newBooking = await insertRows('bookings', {
          listing_id: listing.id,
          tenant_id: user.userId,
          lister_id: listing.lister_id,
          move_in_date: reservation.moveInDate,
          duration_months: months,
          status: gateway === 'azampay' ? 'requested' : 'approved',
          reference: reservation.reference
        }, { accessToken: token });
        bookingId = newBooking?.[0]?.id;
      } else {
        const { updateRows } = await import('../lib/supabase');
        // Update the existing booking reference if needed
        await updateRows('bookings', { 
            reference: reservation.reference,
            move_in_date: reservation.moveInDate,
            duration_months: months
        }, { 
            filters: [{ column: 'id', op: 'eq', value: bookingId }],
            accessToken: token 
        });
      }

      if (gateway === 'azampay' && bookingId) {
        // Call AzamPay Edge Function
        const { invokeFunction } = await import('../lib/supabase');
        const azamResponse = await invokeFunction('azampay-checkout', {
          bookingId,
          amount: total,
          name: user.fullName || 'CampusStay Tenant',
          email: user.email,
          phone: user.phone || '255700000000',
          months
        }, token);

        if (azamResponse?.success && azamResponse?.data?.url) {
           window.location.href = azamResponse.data.url;
           return;
        } else if (azamResponse?.checkout_url) {
           // Handle mock/redirect
           window.location.href = azamResponse.checkout_url;
           return;
        }
        throw new Error(azamResponse?.error || 'Failed to initiate AzamPay checkout');
      }

      setNotice('Payment successful! Your reservation has been recorded.');
      navigate('/my-room');
    } catch (err: any) {
      setError(err.message || 'Unable to start payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
                className={`btn btn--ghost ${gateway === 'azampay' ? 'is-active' : ''}`}
                onClick={() => setGateway('azampay')}
                style={{ minWidth: 120 }}
              >
                AzamPay (Sandbox)
              </button>
              <button
                type="button"
                className={`btn btn--ghost ${gateway === 'selcom' ? 'is-active' : ''}`}
                onClick={() => setGateway('selcom')}
                style={{ minWidth: 120 }}
              >
                Selcom
              </button>
            </div>
          </div>

          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span style={{ fontWeight: 600 }}>Months to reserve</span>
            <input
              type="number"
              min={1}
              max={12}
              value={months}
              onChange={(e) => setMonths(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
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
                <p style={{ margin: 0, color: 'var(--mid)' }}>Total to pay</p>
                <strong style={{ fontSize: '1.3rem', color: '#27500A' }}>
                  TZS {new Intl.NumberFormat('sw-TZ').format(total)}
                </strong>
              </div>
              <button className="btn" type="button" onClick={handlePay} disabled={loading}>
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
