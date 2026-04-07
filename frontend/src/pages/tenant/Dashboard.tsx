import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Search, Heart, MessageCircle, Calendar, User, BookOpen, Zap } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { SkeletonCard } from '../../components/SkeletonCard';
import { StatusPill } from '../../components/StatusPill';
import { useAuth } from '../../context/AuthContext';
import { useListings } from '../../hooks/useListings';
import { useInquiries } from '../../hooks/useInquiries';
import { useBookings } from '../../hooks/useBookings';
import { useActivityLog } from '../../hooks/useActivityLog';
import { profileCompletion, TZSFormat, formatDate } from '../../utils/format';
import type { NavItem, Booking } from '../../types';

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/tenant/dashboard',  icon: <Home size={16} /> },
  { label: 'Search',    href: '/tenant/search',     icon: <Search size={16} /> },
  { label: 'Saved',     href: '/tenant/saved',      icon: <Heart size={16} /> },
  { label: 'Messages',  href: '/tenant/messages',   icon: <MessageCircle size={16} /> },
  { label: 'Bookings',  href: '/tenant/bookings',   icon: <Calendar size={16} /> },
  { label: 'Profile',   href: '/tenant/profile',    icon: <User size={16} /> },
];

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '1rem',
    }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.7rem', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.15, margin: '0.25rem 0 0' }}>{value}</p>
      {sub && <p style={{ fontSize: '0.78rem', color: 'var(--mid)', marginTop: '0.2rem' }}>{sub}</p>}
    </div>
  );
}

export default function TenantDashboard() {
  const { user, token, profile } = useAuth();
  const userId = user?.userId ?? null;

  const { listings: savedListings, loading: savedLoading } = useListings(token, { limit: 3 });
  const { inquiries, loading: inqLoading } = useInquiries('tenant', userId, token);
  const { bookings, loading: bookLoading } = useBookings('tenant', userId, token);
  const { events, loading: actLoading } = useActivityLog(userId, token);
  const navigate = useNavigate();

  const activeStay = useMemo(() => {
    // Check for a real booking in DB (approved or completed)
    return bookings.find(b => b.status === 'approved' || b.status === 'completed') || null;
  }, [bookings]);

  const completion = profileCompletion(profile as unknown as Record<string, unknown> | null);
  const activeInquiries = inquiries.filter((i) => i.status === 'pending').length;
  const activeBookings  = bookings.filter((b) => b.status === 'approved' || b.status === 'completed').length;

  return (
    <>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.3rem', color: 'var(--ink)' }}>
          Welcome back, {user?.fullName?.split(' ')[0] ?? 'there'} 👋
        </h2>
        <p style={{ color: 'var(--mid)', fontSize: '0.88rem' }}>Here's what's happening with your housing search.</p>
      </div>

      {activeStay && (
        <div style={{
          background: 'linear-gradient(135deg, #1D9E75 0%, #15805d 100%)',
          borderRadius: 16,
          padding: '1.25rem',
          marginBottom: '1.5rem',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 24px -6px rgba(29, 158, 117, 0.3)',
          transition: 'transform 0.2s ease',
          cursor: 'pointer'
        }} onClick={() => navigate('/my-room')}>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Your Active Stay
            </p>
            <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.2rem', fontWeight: 800 }}>My living space</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
              Move-in: {formatDate(activeStay.move_in_date)}
            </p>
          </div>
          <Link to="/my-room" style={{
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(4px)',
            color: '#fff',
            padding: '0.6rem 1.2rem',
            borderRadius: 10,
            fontSize: '0.85rem',
            fontWeight: 700,
            textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            Manage Room
          </Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <KpiCard label="Saved Rooms"     value={savedListings.length}  sub="listings saved" />
        <KpiCard label="Open Inquiries"  value={activeInquiries}        sub="pending responses" />
        <KpiCard label="Active Bookings" value={activeBookings}         sub="confirmed stays" />
        <KpiCard label="Profile"         value={`${completion.percent}%`} sub="complete" />
      </div>

      {completion.percent < 100 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <p style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--ink)' }}>Complete your profile</p>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--blue)' }}>{completion.percent}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginBottom: '0.7rem' }}>
            <div style={{ height: '100%', width: `${completion.percent}%`, background: 'var(--blue)', borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {completion.fields.map((f) => (
              <span key={f.key} style={{
                fontSize: '0.76rem',
                fontWeight: 600,
                padding: '0.2rem 0.55rem',
                borderRadius: 99,
                background: f.done ? 'var(--jade-muted)' : 'var(--cream)',
                color: f.done ? 'var(--jade)' : 'var(--mid)',
              }}>
                {f.done ? '✓ ' : ''}{f.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1rem' }}>Saved Rooms</h3>
            <Link to="/tenant/saved" style={{ fontSize: '0.82rem', color: 'var(--blue)', fontWeight: 600 }}>View all →</Link>
          </div>
          {savedLoading ? (
            <div style={{ display: 'grid', gap: '0.6rem' }}><SkeletonCard variant="row" count={3} /></div>
          ) : savedListings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--mid)', marginBottom: '0.6rem' }}>No saved rooms yet.</p>
              <Link to="/tenant/search" className="btn btn--small">Find rooms</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {savedListings.map((l) => (
                <Link key={l.id} to={`/listings/${l.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)' }}>{l.title}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--mid)' }}>{l.area ?? l.district} · {TZSFormat(l.price)}/mo</p>
                    </div>
                    <StatusPill variant={l.status} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1rem', marginBottom: '0.75rem' }}>Recent Activity</h3>
          {actLoading ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}><SkeletonCard variant="activity" count={5} /></div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--mid)' }}>No activity yet. Start by searching for a room!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              {events.map((ev) => (
                <div key={ev.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0.7rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e8eff8', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Zap size={13} style={{ color: 'var(--blue)' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--ink)' }}>{ev.description}</p>
                    <p style={{ fontSize: '0.76rem', color: 'var(--mid)', marginTop: '0.15rem' }}>{formatDate(ev.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
