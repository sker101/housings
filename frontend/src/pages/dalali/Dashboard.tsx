import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Building, PlusCircle, MessageSquare, DollarSign, CreditCard, Zap } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { SkeletonCard } from '../../components/SkeletonCard';
import { StatusPill } from '../../components/StatusPill';
import { InquiryCard } from '../../components/InquiryCard';
import { useAuth } from '../../context/AuthContext';
import { useListings } from '../../hooks/useListings';
import { useInquiries } from '../../hooks/useInquiries';
import { useBookings } from '../../hooks/useBookings';
import { useActivityLog } from '../../hooks/useActivityLog';
import { selectRows } from '../../lib/supabase';
import { TZSFormat, formatRenewal, formatDate } from '../../utils/format';
import type { NavItem, Subscription } from '../../types';
import toast from 'react-hot-toast';

const NAV: NavItem[] = [
  { label: 'Dashboard',    href: '/dalali/dashboard',   icon: <LayoutDashboard size={16} /> },
  { label: 'Properties',   href: '/dalali/properties',  icon: <Building size={16} /> },
  { label: 'Add Property', href: '/dalali/properties/new', icon: <PlusCircle size={16} /> },
  { label: 'Inquiries',    href: '/dalali/inquiries',   icon: <MessageSquare size={16} /> },
  { label: 'Earnings',     href: '/dalali/earnings',    icon: <DollarSign size={16} /> },
  { label: 'Subscription', href: '/dalali/subscription',icon: <CreditCard size={16} /> },
];

const COMMISSION_RATE = 0.05;

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1rem' }}>
      <p style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.65rem', fontWeight: 800, color: accent ?? 'var(--ink)', lineHeight: 1.15, margin: '0.25rem 0 0' }}>{value}</p>
      {sub && <p style={{ fontSize: '0.76rem', color: 'var(--mid)', marginTop: '0.15rem' }}>{sub}</p>}
    </div>
  );
}

export default function DalaliDashboard() {
  const { user, token } = useAuth();
  const userId = user?.userId ?? null;

  const { listings, loading: listLoading } = useListings(token, { ownerId: userId ?? undefined });
  const { inquiries, loading: inqLoading, acceptInquiry, declineInquiry } = useInquiries('host', userId, token);
  const { bookings, loading: bookLoading, monthlyIncome } = useBookings('host', userId, token);
  const { events, loading: actLoading } = useActivityLog(userId, token);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  useEffect(() => {
    if (!userId || !token) { setSubLoading(false); return; }
    selectRows('subscriptions', {
      select: 'id,user_id,plan,status,current_period_end,selcom_ref,created_at',
      filters: [{ column: 'user_id', op: 'eq', value: userId }],
      order: 'created_at.desc',
      limit: 1,
      accessToken: token,
    }).then((rows) => setSubscription(rows[0] as Subscription ?? null))
      .catch(() => setSubscription(null))
      .finally(() => setSubLoading(false));
  }, [userId, token]);

  const activeListings = listings.filter((l) => l.status === 'active').length;
  const pendingInquiries = inquiries.filter((i) => i.status === 'pending');
  const paidAmount = bookings.filter((b) => b.payment_status === 'paid').reduce((s, b) => s + Number(b.amount ?? 0), 0);
  const totalCommission = paidAmount * COMMISSION_RATE;

  const handleAccept = async (id: string) => {
    try { await acceptInquiry(id); toast.success('Inquiry accepted'); }
    catch { toast.error('Could not accept inquiry'); }
  };
  const handleDecline = async (id: string) => {
    try { await declineInquiry(id); toast.success('Inquiry declined'); }
    catch { toast.error('Could not decline inquiry'); }
  };

  return (
    <DashboardLayout
      role="dalali"
      accentColor="var(--amber)"
      navItems={NAV}
      pageTitle="Dalali Dashboard"
      upgradeCTA={{ label: '⬆ Upgrade Plan', href: '/dalali/subscription' }}
    >
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.3rem' }}>
          {user?.fullName?.split(' ')[0] ?? 'Hi'}'s Broker Hub
        </h2>
        <p style={{ color: 'var(--mid)', fontSize: '0.88rem' }}>Manage your properties, commissions and subscription.</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <KpiCard label="Monthly Income"    value={TZSFormat(monthlyIncome)} sub="paid bookings" accent="var(--amber)" />
        <KpiCard label="Commission Earned" value={TZSFormat(totalCommission)} sub="5% of payments" />
        <KpiCard label="Active Properties" value={String(activeListings)} sub={`of ${listings.length} total`} />
        <KpiCard label="Open Inquiries"    value={String(pendingInquiries.length)} sub="awaiting response" />
      </div>

      <div style={{ display: 'grid', gap: '1.25rem' }}>

        {/* Subscription Card */}
        <section>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1rem', marginBottom: '0.75rem' }}>Subscription</h3>
          {subLoading ? <SkeletonCard variant="kpi" count={1} /> : (
            <div style={{
              background: subscription ? 'linear-gradient(135deg, #1a1200, #2d2000)' : 'var(--surface)',
              border: `1px solid ${subscription ? 'rgba(212,132,10,0.4)' : 'var(--border)'}`,
              borderRadius: 14,
              padding: '1rem',
              color: subscription ? '#ffe8a0' : 'var(--ink)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}>
              {subscription ? (
                <>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '1.05rem' }}>{subscription.plan} Plan</p>
                    <p style={{ fontSize: '0.82rem', opacity: 0.75, marginTop: '0.2rem' }}>
                      {formatRenewal(subscription.current_period_end)}
                    </p>
                    <StatusPill variant={subscription.status} size="sm" />
                  </div>
                  <Link to="/dalali/subscription" className="btn btn--small" style={{ background: 'var(--amber)', color: '#1a0e00' }}>
                    Manage
                  </Link>
                </>
              ) : (
                <>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>No active subscription</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--mid)', marginTop: '0.2rem' }}>Upgrade to list unlimited properties.</p>
                  </div>
                  <Link to="/dalali/subscription" className="btn btn--small">Upgrade</Link>
                </>
              )}
            </div>
          )}
        </section>

        {/* Inquiry Inbox */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1rem' }}>Inquiry Inbox</h3>
            <Link to="/dalali/inquiries" style={{ fontSize: '0.82rem', color: 'var(--amber)', fontWeight: 600 }}>All →</Link>
          </div>
          {inqLoading ? <div style={{ display: 'grid', gap: '0.6rem' }}><SkeletonCard variant="row" count={3} /></div>
          : pendingInquiries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
              <p style={{ color: 'var(--mid)' }}>No pending inquiries.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.7rem' }}>
              {pendingInquiries.slice(0, 4).map((i) => (
                <InquiryCard key={i.id} inquiry={i} view="host" onAccept={handleAccept} onDecline={handleDecline} />
              ))}
            </div>
          )}
        </section>

        {/* Activity Feed */}
        <section>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1rem', marginBottom: '0.75rem' }}>Recent Activity</h3>
          {actLoading ? <div style={{ display: 'grid', gap: '0.6rem' }}><SkeletonCard variant="activity" count={4} /></div>
          : events.length === 0 ? (
            <p style={{ color: 'var(--mid)', fontSize: '0.86rem' }}>No activity recorded yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {events.map((ev) => (
                <div key={ev.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0.65rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--amber-light)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Zap size={12} style={{ color: 'var(--amber)' }} />
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
    </DashboardLayout>
  );
}
