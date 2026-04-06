import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, List, PlusCircle, Users, BarChart2, MessageSquare, Zap, TrendingUp } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { SkeletonCard } from '../../components/SkeletonCard';
import { StatusPill } from '../../components/StatusPill';
import { InquiryCard } from '../../components/InquiryCard';
import { useAuth } from '../../context/AuthContext';
import { useListings } from '../../hooks/useListings';
import { useInquiries } from '../../hooks/useInquiries';
import { useBookings } from '../../hooks/useBookings';
import { useActivityLog } from '../../hooks/useActivityLog';
import { TZSFormat, formatDate } from '../../utils/format';
import toast from 'react-hot-toast';
import type { NavItem } from '../../types';

const NAV: NavItem[] = [
  { label: 'Dashboard',  href: '/landlord/dashboard',  icon: <LayoutDashboard size={16} /> },
  { label: 'Listings',   href: '/landlord/listings',   icon: <List size={16} /> },
  { label: 'Add Listing',href: '/landlord/listings/new',icon: <PlusCircle size={16} /> },
  { label: 'Inquiries',  href: '/landlord/inquiries',  icon: <MessageSquare size={16} /> },
  { label: 'Tenants',    href: '/landlord/tenants',    icon: <Users size={16} /> },
  { label: 'Analytics',  href: '/landlord/analytics',  icon: <BarChart2 size={16} /> },
];

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '1rem',
    }}>
      <p style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.65rem', fontWeight: 800, color: accent ?? 'var(--ink)', lineHeight: 1.15, margin: '0.25rem 0 0' }}>{value}</p>
      {sub && <p style={{ fontSize: '0.76rem', color: 'var(--mid)', marginTop: '0.15rem' }}>{sub}</p>}
    </div>
  );
}

export default function LandlordDashboard() {
  const { user, token, profile } = useAuth();
  const userId = user?.userId ?? null;

  const { listings, loading: listLoading } = useListings(token, { ownerId: userId ?? undefined });
  const { inquiries, loading: inqLoading, acceptInquiry, declineInquiry } = useInquiries('host', userId, token);
  const { bookings, loading: bookLoading, monthlyIncome } = useBookings('host', userId, token);
  const { events, loading: actLoading } = useActivityLog(userId, token);

  const activeListings = listings.filter((l) => l.status === 'active').length;
  const occupancyRate = listings.length > 0
    ? Math.round((activeListings / listings.length) * 100)
    : 0;
  const pendingInquiries = inquiries.filter((i) => i.status === 'pending');
  const avgRating = Number(profile?.avg_rating ?? 0).toFixed(1);

  const handleAccept = async (id: string) => {
    try { await acceptInquiry(id); toast.success('Inquiry accepted'); }
    catch { toast.error('Could not accept inquiry'); }
  };

  const handleDecline = async (id: string) => {
    try { await declineInquiry(id); toast.success('Inquiry declined'); }
    catch { toast.error('Could not decline inquiry'); }
  };

  return (
    <>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.3rem', color: 'var(--ink)' }}>
          {user?.fullName?.split(' ')[0] ?? 'Hi'}'s Properties
        </h2>
        <p style={{ color: 'var(--mid)', fontSize: '0.88rem' }}>Manage your listings, inquiries and income.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <KpiCard label="Monthly Income"   value={TZSFormat(monthlyIncome)} sub="paid bookings" accent="var(--jade)" />
        <KpiCard label="Occupancy Rate"   value={`${occupancyRate}%`}      sub={`${activeListings} active`} />
        <KpiCard label="Open Inquiries"   value={String(pendingInquiries.length)} sub="awaiting response" />
        <KpiCard label="Avg. Rating"      value={`${avgRating} ★`}         sub="from tenants" />
      </div>

      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1rem' }}>
              Inquiry Inbox {pendingInquiries.length > 0 && (
                <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', fontWeight: 700, background: 'var(--amber-light)', color: '#6b3a0a', borderRadius: 99, padding: '0.1rem 0.45rem' }}>
                  {pendingInquiries.length}
                </span>
              )}
            </h3>
            <Link to="/landlord/inquiries" style={{ fontSize: '0.82rem', color: 'var(--jade)', fontWeight: 600 }}>All →</Link>
          </div>
          {inqLoading ? (
            <div style={{ display: 'grid', gap: '0.6rem' }}><SkeletonCard variant="row" count={3} /></div>
          ) : pendingInquiries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
              <p style={{ color: 'var(--mid)' }}>No pending inquiries.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.7rem' }}>
              {pendingInquiries.slice(0, 5).map((inq) => (
                <InquiryCard
                  key={inq.id}
                  inquiry={inq}
                  view="host"
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1rem' }}>Listing Views</h3>
            <Link to="/landlord/listings" style={{ fontSize: '0.82rem', color: 'var(--jade)', fontWeight: 600 }}>Manage →</Link>
          </div>
          {listLoading ? (
            <SkeletonCard variant="kpi" count={3} />
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
              <p style={{ color: 'var(--mid)', marginBottom: '0.6rem' }}>No listings yet.</p>
              <Link to="/landlord/listings/new" className="btn btn--small">Add a listing</Link>
            </div>
          ) : (() => {
              const maxViews = Math.max(...listings.map((l) => l.views ?? 0), 1);
              return (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1rem', display: 'grid', gap: '0.6rem' }}>
                  {listings.slice(0, 6).map((l) => {
                    const pct = Math.round(((l.views ?? 0) / maxViews) * 100);
                    return (
                      <div key={l.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{l.title}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--mid)', flexShrink: 0 }}>{l.views ?? 0} views</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--jade)', borderRadius: 99, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
          })()}
        </section>

        <section>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1rem', marginBottom: '0.75rem' }}>Rent Tracker</h3>
          {bookLoading ? (
            <div style={{ display: 'grid', gap: '0.5rem' }}><SkeletonCard variant="row" count={3} /></div>
          ) : bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
              <p style={{ color: 'var(--mid)' }}>No bookings yet.</p>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: 'var(--cream)' }}>
                    {['Listing', 'Amount', 'Move-in', 'Status'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 700, color: 'var(--mid)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 8).map((b, idx) => (
                    <tr key={b.id} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 500 }}>{b.listing?.title ?? b.listing_id.slice(0, 8) + '…'}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{TZSFormat(b.amount)}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--mid)' }}>{b.move_in_date ? formatDate(b.move_in_date) : '—'}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}><StatusPill variant={b.payment_status} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1rem', marginBottom: '0.75rem' }}>Recent Activity</h3>
          {actLoading ? (
            <div style={{ display: 'grid', gap: '0.65rem' }}><SkeletonCard variant="activity" count={4} /></div>
          ) : events.length === 0 ? (
            <p style={{ color: 'var(--mid)', fontSize: '0.86rem' }}>No activity yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {events.map((ev) => (
                <div key={ev.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0.65rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--jade-muted)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Zap size={12} style={{ color: 'var(--jade)' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--ink)' }}>{ev.description}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--mid)', marginTop: '0.1rem' }}>{formatDate(ev.created_at)}</p>
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
