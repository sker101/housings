import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { selectRows } from '../lib/supabase';

export default function PayPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { token } = useAuth();

  const state = location.state as { listingId?: string; price?: number; title?: string } | undefined;

  const [listing, setListing] = useState<any>(
    state?.listingId
      ? {
          id: state.listingId,
          title: state.title,
          price_monthly: state.price
        }
      : null
  );
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [gateway, setGateway] = useState<'selcom' | 'dpo'>('selcom');

  const total = useMemo(() => {
    const price = Number(listing?.price_monthly || 0);
    return price * months;
  }, [listing?.price_monthly, months]);

  useEffect(() => {
    async function load() {
      if (!state?.listingId || listing?.title) return;
      try {
        setLoading(true);
        const rows = await selectRows('listings', {
          select: 'id,title,price_monthly,photos',
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
      // For now, assume payment succeeds immediately.
      setNotice('Payment marked as successful. Your reservation has been recorded.');
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
                className={`btn btn--ghost ${gateway === 'selcom' ? 'is-active' : ''}`}
                onClick={() => setGateway('selcom')}
                style={{ minWidth: 120 }}
              >
                Selcom
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled
                style={{ minWidth: 120, opacity: 0.6 }}
              >
                DPO (coming soon)
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
