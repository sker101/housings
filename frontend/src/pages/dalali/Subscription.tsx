import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Building, PlusCircle, MessageSquare, DollarSign, CreditCard, CheckCircle } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import { SkeletonCard } from '../../components/SkeletonCard';
import { StatusPill } from '../../components/StatusPill';
import { useAuth } from '../../context/AuthContext';
import { selectRows } from '../../lib/supabase';
import { formatRenewal } from '../../utils/format';
import type { NavItem, Subscription } from '../../types';

const NAV: NavItem[] = [
  { label: 'Dashboard',    href: '/dalali/dashboard',      icon: <LayoutDashboard size={16} /> },
  { label: 'Properties',   href: '/dalali/properties',     icon: <Building size={16} /> },
  { label: 'Add Property', href: '/dalali/properties/new', icon: <PlusCircle size={16} /> },
  { label: 'Inquiries',    href: '/dalali/inquiries',      icon: <MessageSquare size={16} /> },
  { label: 'Earnings',     href: '/dalali/earnings',       icon: <DollarSign size={16} /> },
  { label: 'Subscription', href: '/dalali/subscription',   icon: <CreditCard size={16} /> },
];

const PLANS = [
  { id: 'basic',   name: 'Basic',      price: 'TZS 15,000/mo', features: ['Up to 5 properties', 'Basic inquiry inbox', 'Email support'] },
  { id: 'pro',     name: 'Pro',        price: 'TZS 35,000/mo', features: ['Up to 25 properties', 'Priority inbox', 'SMS alerts', 'Analytics'] },
  { id: 'premium', name: 'Premium',    price: 'TZS 65,000/mo', features: ['Unlimited properties', 'Featured listings', 'Dedicated support', 'Advanced analytics', 'Commission reduction'] },
];

export default function DalaliSubscription() {
  const { user, token } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.userId || !token) { setLoading(false); return; }
    selectRows('subscriptions', {
      select: 'id,user_id,plan,status,current_period_end,selcom_ref,created_at',
      filters: [{ column: 'user_id', op: 'eq', value: user.userId }],
      order: 'created_at.desc',
      limit: 1,
      accessToken: token,
    }).then((rows) => setSubscription(rows[0] as Subscription ?? null))
      .catch(() => setSubscription(null))
      .finally(() => setLoading(false));
  }, [user?.userId, token]);

  return (
    <>
      {/* Current plan banner */}
      {loading ? <SkeletonCard variant="kpi" count={1} /> : subscription ? (
        <div style={{
          background: 'linear-gradient(135deg, #1a1200, #2d2000)',
          border: '1px solid rgba(212,132,10,0.4)',
          borderRadius: 14,
          padding: '1.2rem',
          color: '#ffe8a0',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>Current Plan: {subscription.plan}</p>
            <p style={{ fontSize: '0.82rem', opacity: 0.75, marginTop: '0.2rem' }}>{formatRenewal(subscription.current_period_end)}</p>
            <StatusPill variant={subscription.status} size="sm" />
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--amber-light)', border: '1px solid rgba(212,132,10,0.3)', borderRadius: 14, padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: 600, color: '#6b3a0a' }}>No active subscription</p>
          <p style={{ fontSize: '0.84rem', color: '#8a4e10' }}>Choose a plan below to start listing properties.</p>
        </div>
      )}

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {PLANS.map((plan) => {
          const isCurrent = subscription?.plan?.toLowerCase() === plan.id;
          return (
            <div key={plan.id} style={{
              background: isCurrent ? 'linear-gradient(135deg, #1a1200, #2d2000)' : 'var(--surface)',
              border: isCurrent ? '2px solid var(--amber)' : '1px solid var(--border)',
              borderRadius: 16,
              padding: '1.2rem',
              color: isCurrent ? '#ffe8a0' : 'var(--ink)',
              position: 'relative',
            }}>
              {isCurrent && (
                <span style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', fontSize: '0.7rem', fontWeight: 700, background: 'var(--amber)', color: '#1a0e00', borderRadius: 99, padding: '0.15rem 0.5rem' }}>
                  CURRENT
                </span>
              )}
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{plan.name}</p>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: isCurrent ? 'var(--amber)' : 'var(--jade)', marginBottom: '0.75rem' }}>{plan.price}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem', display: 'grid', gap: '0.35rem' }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: isCurrent ? 0.9 : 1 }}>
                    <CheckCircle size={13} style={{ color: isCurrent ? 'var(--amber)' : 'var(--jade)', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
              {!isCurrent && (
                <button
                  className="btn btn--small"
                  style={{ width: '100%', background: 'var(--amber)', color: '#1a0e00' }}
                  onClick={() => alert('Selcom payment integration coming soon.')}
                >
                  Upgrade to {plan.name}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
