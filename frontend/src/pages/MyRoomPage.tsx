import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Reservation = {
  listingId: string;
  title?: string;
  priceMonthly?: number;
  months?: number;
  total?: number;
  reservedAt?: string;
};

export default function MyRoomPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [reservation, setReservation] = useState<Reservation | null>(null);

  const storageKey = useMemo(
    () => (user?.userId ? `myRoomReservation:${user.userId}` : 'myRoomReservation'),
    [user?.userId]
  );

  useEffect(() => {
    if (location.state && (location.state as any).listingId) {
      setReservation(location.state as Reservation);
      return;
    }
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setReservation(JSON.parse(stored));
      } catch {
        setReservation(null);
      }
    }
  }, [location.state, storageKey]);

  if (!reservation) {
    return (
      <div className="container section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h1 style={{ marginBottom: '0.6rem' }}>My Room</h1>
        <p className="muted" style={{ marginBottom: '1.2rem' }}>
          You haven&apos;t reserved a room yet. Browse listings to reserve one.
        </p>
        <Link to="/search" className="btn">
          Browse rooms
        </Link>
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
          boxShadow: '0 16px 38px rgba(20, 53, 34, 0.14)'
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: '0.4rem', fontSize: '1.6rem', fontWeight: 800 }}>
          My Reserved Room
        </h1>
        <p style={{ color: 'var(--mid)', marginTop: 0, marginBottom: '1rem' }}>
          This room is reserved for you. Access details and next steps below.
        </p>

        <div className="card" style={{ padding: '1rem', border: '1px solid var(--border)', background: '#f8faf9' }}>
          <p style={{ margin: 0, color: 'var(--mid)', fontSize: '0.9rem' }}>Room</p>
          <strong style={{ fontSize: '1.1rem', marginTop: '0.2rem', display: 'block' }}>
            {reservation.title || 'Reserved listing'}
          </strong>
          {reservation.priceMonthly ? (
            <p style={{ margin: '0.15rem 0', color: '#27500A', fontWeight: 700 }}>
              TZS {new Intl.NumberFormat('sw-TZ').format(reservation.priceMonthly)} / month
            </p>
          ) : null}
          <p style={{ margin: '0.15rem 0', color: 'var(--mid)' }}>
            Reserved on {reservation.reservedAt ? new Date(reservation.reservedAt).toLocaleDateString() : 'today'}
          </p>
        </div>

        <div className="card" style={{ padding: '1rem', border: '1px solid var(--border)', marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ color: 'var(--mid)' }}>Months</span>
            <strong>{reservation.months || 1}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ color: 'var(--mid)' }}>Total</span>
            <strong style={{ color: '#27500A' }}>
              TZS {new Intl.NumberFormat('sw-TZ').format(reservation.total || 0)}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          {reservation.listingId ? (
            <Link to={`/rooms/${reservation.listingId}`} className="btn btn--ghost" style={{ flex: 1, textAlign: 'center' }}>
              View room details
            </Link>
          ) : null}
          <button type="button" className="btn" style={{ flex: 1 }} onClick={() => navigate('/messages')}>
            Message landlord
          </button>
        </div>

        <p className="muted" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          Note: Room will be held for you. For production, backend should mark this listing as reserved and hide it from other users.
        </p>
      </section>
    </div>
  );
}
