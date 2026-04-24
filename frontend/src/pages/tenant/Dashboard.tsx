/**
 * TenantDashboard.tsx — iRent
 * KPIs: Active Lease, Days until Move-out, Referral Earnings
 * Features: Ward-based search, "Moving soon? List your room." CTA
 */

import { useState, useEffect, type ElementType, type CSSProperties } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Heart, Calendar, Zap, TrendingUp, Clock,
  ArrowRight, Sparkles, Search, MapPin, Gift, Home,
} from 'lucide-react';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { StatusPill } from '../../components/StatusPill';
import { useAuth } from '../../context/AuthContext';
import { useListings } from '../../hooks/useListings';
import { useActivityLog } from '../../hooks/useActivityLog';
import { profileCompletion, TZSFormat, formatDate } from '../../utils/format';
import { selectRows } from '../../lib/supabase';
import { fetchSavedListings } from '../../lib/listings';
import { logSignInOnce } from '../../lib/activity';
import ExitListingModal from '../../components/ExitListingModal';

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: ElementType; color: string;
}) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color } as CSSProperties}>
      <div className="kpi-icon-wrapper"><Icon size={20} /></div>
      <div className="kpi-content">
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">{value}</p>
        {sub && <p className="kpi-sub">{sub}</p>}
      </div>
    </div>
  );
}

// ── Ward quick-filter chips ──────────────────────────────────────
const POPULAR_WARDS = [
  'Msasani', 'Masaki', 'Upanga', 'Mikocheni',
  'Kariakoo', 'Sinza', 'Kinondoni', 'Mbezi',
];

interface ActiveLease {
  id: string;
  room_id: string;
  lease_end_date: string;
  days_remaining: number;
  renewal_decision: string | null;
}

export default function TenantDashboard() {
  const { user, token, profile } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const userId = user?.userId ?? null;

  const [isVisible, setIsVisible]         = useState(false);
  const [activeLease, setActiveLease]     = useState<ActiveLease | null>(null);
  const [tenantId, setTenantId]           = useState<string | null>(null);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [pendingReferrals, setPendingReferrals] = useState(0);
  const [daysUntilRentDue, setDaysUntilRentDue] = useState<number | null>(null);
  const [nextPaymentDate, setNextPaymentDate] = useState<string | null>(null);
  const [retryCount, setRetryCount]       = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitSuccess, setExitSuccess]     = useState<string | null>(null);
  const [savedRooms, setSavedRooms]       = useState<any[]>([]);
  const [savedCount, setSavedCount]       = useState(0);
  const [savedLoading, setSavedLoading]   = useState(true);

  const isPaymentSuccess = location.search.includes('payment=success');

  useEffect(() => { setIsVisible(true); }, []);

  const { events, loading: actLoading } = useActivityLog(userId, token);

  // ── Fetch tenant record + active lease + referral earnings ──────
  useEffect(() => {
    if (!userId || !token) return;
    let mounted = true;
    async function fetchTenantData() {
      try {
        // Log sign-in once
        if (userId && token) {
          logSignInOnce(userId, token);
        }

        // Get tenant row
        const tenants = await selectRows('tenants', {
          select: 'id, referral_earnings_tzs',
          filters: [{ column: 'profile_id', op: 'eq', value: userId! }],
          accessToken: token!,
        });
        if (!mounted || !tenants.length) return;
        const tenant = tenants[0] as { id: string; referral_earnings_tzs: number };
        setTenantId(tenant.id);
        setReferralEarnings(tenant.referral_earnings_tzs ?? 0);

        // Get active lease
        const leases = await selectRows('tenant_leases', {
          select: 'id, room_id, lease_end_date, days_remaining, renewal_decision',
          filters: [
            { column: 'tenant_id', op: 'eq', value: tenant.id },
            { column: 'status',    op: 'eq', value: 'active' },
          ],
          order: 'created_at.desc',
          limit: 1,
          accessToken: token!,
        });
        if (mounted && leases.length) {
          setActiveLease(leases[0] as ActiveLease);
          
          // Fetch next payment due
          const payments = await selectRows('payments', {
            select: 'due_date',
            filters: [
              { column: 'status', op: 'neq', value: 'paid' },
              { column: 'due_date', op: 'gte', value: new Date().toISOString().split('T')[0] }
            ],
            order: 'due_date.asc',
            limit: 1,
            accessToken: token!
          });
          
          if (payments.length) {
            const rawDate = payments[0].due_date;
            setNextPaymentDate(rawDate);
            const dueDate = new Date(rawDate);
            const today = new Date();
            const diff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            setDaysUntilRentDue(diff);
          }
        } else if (mounted) {
          // If no active lease, check for a confirmed/paid booking
          const bookings = await selectRows('bookings', {
            select: 'id, move_in_date, status',
            filters: [
              { column: 'tenant_id', op: 'eq', value: tenant.id },
              { column: 'status', op: 'in', value: '(paid,confirmed,approved)' }
            ],
            order: 'created_at.desc',
            limit: 1,
            accessToken: token!
          });
          if (bookings.length) {
            const b = bookings[0];
            const isTodayOrPast = new Date(b.move_in_date) <= new Date();
            setActiveLease({
              id: b.id,
              room_id: '', // Not needed for KPI
              lease_end_date: b.move_in_date,
              days_remaining: 0, 
              renewal_decision: isTodayOrPast ? 'active' : 'incoming'
            });
          }
        }

        // Fetch Saved Listings (Resilient)
        setSavedLoading(true);
        const [saved, savedIds] = await Promise.all([
          fetchSavedListings(userId!, token!, { limit: 3 }).catch(() => []),
          selectRows('saved_listings', {
            select: 'count',
            filters: [{ column: 'tenant_id', op: 'eq', value: userId! }],
            accessToken: token!
          }).catch(() => [])
        ]);
        if (mounted) {
          setSavedRooms(saved);
          setSavedCount(savedIds?.[0]?.count ?? savedIds.length ?? 0);
          setSavedLoading(false);
          
          setReferralEarnings((tenant as any).referral_earnings_tzs || 0);
          setPendingReferrals(0);
        }
      } catch (err) {
        console.error('TenantDashboard: failed to fetch tenant data', err);
        if (mounted) setSavedLoading(false);
      }
    }
    fetchTenantData();
    return () => { mounted = false; };
  }, [userId, token, retryCount]);

  useEffect(() => {
    if (isPaymentSuccess && !activeLease && retryCount < 5) {
      const timer = setTimeout(() => setRetryCount(p => p + 1), 3000);
      return () => clearTimeout(timer);
    }
  }, [isPaymentSuccess, activeLease, retryCount]);

  const completion     = profileCompletion(profile as unknown as Record<string, unknown> | null);
  const firstName       = user?.fullName?.split(' ')[0] ?? 'there';

  const daysLeft = activeLease?.days_remaining ?? null;
  const daysLeftLabel = daysLeft == null
    ? '—'
    : daysLeft === 0
      ? 'Today!'
      : `${daysLeft} days`;

  const daysLeftColour = daysLeft == null
    ? '#22c55e'
    : daysLeft <= 7  ? '#ef4444'
    : daysLeft <= 30 ? '#f59e0b'
    : '#22c55e';

  const canListRoom =
    activeLease &&
    !exitSuccess &&
    activeLease.renewal_decision !== 'leaving' &&
    (daysLeft ?? 99) <= 60;

  function handleExitSuccess(newDate: string) {
    setShowExitModal(false);
    setExitSuccess(newDate);
    // Refresh lease data
    setRetryCount(p => p + 1);
  }

  return (
    <div className={`dashboard-container ${isVisible ? 'is-visible' : ''}`}>

      {/* ── Welcome header ─────────────────────────────────── */}
      <div className="dashboard-welcome" style={{ animationDelay: '0.05s' }}>
        <div className="welcome-content">
          <div className="welcome-badge">
            <Sparkles size={14} />
            <span>Tenant Dashboard — iRent</span>
          </div>
          <h1 className="welcome-title">
            {t('studentDashboard.welcomeBack', 'Welcome back')}, {firstName}{' '}
            <span className="wave-emoji">👋</span>
          </h1>
          <p className="welcome-subtitle">
            {t('studentDashboard.subtitle', "Here's everything you need to find your perfect stay")}
          </p>
        </div>
        <div className="welcome-actions">
          <Link to="/tenant/search" className="welcome-btn primary">
            <Search size={18} />
            {t('studentDashboard.findRooms', 'Find Rooms')}
          </Link>
        </div>
      </div>

      {/* ── Exit Listing success banner ─────────────────────── */}
      {exitSuccess && (
        <div style={{
          background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
          border: '1.5px solid #86efac', borderRadius: '14px',
          padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem',
          alignItems: 'center', marginBottom: '1.25rem',
        }}>
          <Gift size={22} color="#16a34a" />
          <div>
            <strong style={{ color: '#15803d', fontSize: '0.95rem' }}>
              Room listed! Your move-out date is set for {exitSuccess}.
            </strong>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#166534' }}>
              Your room now appears in search with a "Coming Soon" badge. If someone pre-books, you earn <strong>20,000 TZS</strong>.
            </p>
          </div>
        </div>
      )}

      {/* ── Active Lease card ───────────────────────────────── */}
      {activeLease && (
        <div
          className="active-stay-card"
          onClick={() => navigate('/my-room')}
          style={{ 
            animationDelay: '0.1s', 
            cursor: 'pointer', 
            position: 'relative',
            padding: '1.5rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
          role="presentation"
        >
          <div className="active-stay-content">
            <h3 className="active-stay-title" style={{ margin: 0 }}>
              {activeLease.renewal_decision === 'incoming' ? 'Incoming Move-in' : 'Your Current Room'}
            </h3>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {/* "Moving soon?" CTA */}
            {canListRoom && (
              <button
                onClick={e => { e.stopPropagation(); setShowExitModal(true); }}
                style={{
                  background: '#f0fdf4', border: '1.5px solid #86efac',
                  borderRadius: '10px', padding: '0.5rem 1rem',
                  fontSize: '0.85rem', fontWeight: 600, color: '#16a34a',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <Gift size={14} /> Moving soon?
              </button>
            )}
            
            <Link to="/my-room" className="active-stay-btn" onClick={e => e.stopPropagation()} style={{ margin: 0 }}>
              Manage Room <ArrowRight size={16} />
            </Link>
          </div>

        </div>
      )}

      {isPaymentSuccess && !activeLease && retryCount < 5 && (
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
          {t('studentDashboard.syncingPayment', 'Syncing your booking…')} ({retryCount}/5)
        </p>
      )}

      {/* ── KPI Grid ────────────────────────────────────────── */}
      <div className="kpi-grid">
        <KpiCard
          label="Active Lease"
          value={activeLease ? (activeLease.renewal_decision === 'incoming' ? 'Incoming' : 'Active') : 'None'}
          sub={activeLease 
            ? (activeLease.renewal_decision === 'incoming' 
                ? `Move-in: ${new Date(activeLease.lease_end_date).toLocaleDateString('sw-TZ')}`
                : (activeLease.renewal_decision === 'active' 
                   ? `Current Stay` 
                   : `Expires ${new Date(activeLease.lease_end_date).toLocaleDateString('sw-TZ')}`))
            : 'No current lease'}
          icon={Home}
          color="#22c55e"
        />
        <KpiCard
          label="Next Rent Due"
          value={nextPaymentDate ? new Date(nextPaymentDate).toLocaleDateString('sw-TZ') : (activeLease?.renewal_decision === 'incoming' ? '—' : 'None')}
          sub={daysUntilRentDue !== null ? (daysUntilRentDue <= 0 ? 'Due today!' : `${daysUntilRentDue} days remaining`) : (activeLease?.renewal_decision === 'incoming' ? 'Waiting for move-in' : 'No upcoming payments')}
          icon={Calendar}
          color={daysUntilRentDue !== null && daysUntilRentDue <= 5 ? '#ef4444' : '#22c55e'}
        />
        <KpiCard
          label="Referral Earnings"
          value={new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(referralEarnings)}
          sub={pendingReferrals > 0 ? `${TZSFormat(pendingReferrals)} pending rewards` : 'Lifetime referral rewards'}
          icon={Gift}
          color="#8b5cf6"
        />
        <KpiCard
          label={t('studentDashboard.savedRooms', 'Saved Rooms')}
          value={savedCount}
          sub={t('studentDashboard.listingsSaved', 'listings saved')}
          icon={Heart}
          color="#ef4444"
        />
      </div>

      {/* ── Profile completion ───────────────────────────────── */}
      {completion.percent < 100 && (
        <div className="profile-completion-card">
          <div className="completion-header">
            <div className="completion-title-group">
              <TrendingUp size={20} className="completion-icon" />
              <div>
                <h3 className="completion-title">
                  {t('studentDashboard.completeYourProfile', 'Complete your profile')}
                </h3>
                <p className="completion-subtitle">
                  {t('studentDashboard.completeProfileSubtitle', 'Finish setting up your profile to get better room recommendations')}
                </p>
              </div>
            </div>
            <span className="completion-percent">{completion.percent}%</span>
          </div>
          <div className="completion-progress">
            <div className="completion-progress-bar" style={{ width: `${completion.percent}%` }} />
          </div>
          <div className="completion-fields">
            {completion.fields.map(f => (
              <span key={f.key} className={`completion-field ${f.done ? 'done' : 'pending'}`}>
                {f.done ? <Sparkles size={12} /> : <Clock size={12} />}
                {f.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Ward filter chips ────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>
          🗺 Quick search by ward:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {POPULAR_WARDS.map(ward => (
            <button
              key={ward}
              onClick={() => navigate(`/tenant/search?ward=${encodeURIComponent(ward)}`)}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: '999px',
                border: '1.5px solid #e2e8f0', background: 'white',
                fontSize: '0.8rem', fontWeight: 600, color: '#475569',
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#22c55e';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.border = '1.5px solid #22c55e';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#475569';
                e.currentTarget.style.border = '1.5px solid #e2e8f0';
              }}
            >
              <MapPin size={11} style={{ marginRight: 4 }} />
              {ward}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content grid ────────────────────────────────────── */}
      <div className="dashboard-grid">
        {/* Saved Rooms */}
        <section className="dashboard-section">
          <div className="section-header">
            <div className="section-title-group">
              <div className="section-icon saved"><Heart size={18} /></div>
              <h3 className="section-title">{t('studentDashboard.savedRoomsTitle', 'Saved Rooms')}</h3>
            </div>
            <Link to="/tenant/saved" className="section-link">
              {t('studentDashboard.viewAll', 'View all')} →
            </Link>
          </div>
          {savedLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <LoadingSpinner size="medium" text="Loading…" />
            </div>
          ) : savedRooms.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏠</div>
              <p className="empty-text">{t('studentDashboard.noSavedRooms', 'No saved rooms yet')}</p>
              <Link to="/tenant/search" className="empty-btn">{t('studentDashboard.findRooms', 'Find rooms')}</Link>
            </div>
          ) : (
            <div className="saved-list">
              {savedRooms.map(item => {
                const l = item.listing;
                if (!l) return null;
                return (
                  <Link key={l.id} to={`/rooms/${l.id}`} className="saved-room-card">
                    <div className="saved-room-image">
                      {l.imageUrl ? (
                        <img src={l.imageUrl} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <MapPin size={20} />
                      )}
                    </div>
                    <div className="saved-room-info">
                      <p className="saved-room-title">{l.title}</p>
                      <p className="saved-room-location">
                        {l.ward || l.district} · {TZSFormat(l.priceMonthly)}/mo
                      </p>
                    </div>
                    <StatusPill variant="available" size="sm" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Activity */}
        <section className="dashboard-section">
          <div className="section-header">
            <div className="section-title-group">
              <div className="section-icon activity"><Zap size={18} /></div>
              <h3 className="section-title">{t('studentDashboard.recentActivity', 'Recent Activity')}</h3>
            </div>
          </div>
          {actLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <LoadingSpinner size="medium" text="Loading…" />
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚡</div>
              <p className="empty-text">
                {t('studentDashboard.noActivity', 'No activity yet. Start by searching for a room!')}
              </p>
              <Link to="/tenant/search" className="empty-btn">
                {t('studentDashboard.searchNow', 'Search now')}
              </Link>
            </div>
          ) : (
            <div className="activity-list">
              {events.map(ev => (
                <div key={ev.id} className="activity-item">
                  <div className="activity-icon-wrapper"><Zap size={14} /></div>
                  <div className="activity-content">
                    <p className="activity-description">{ev.description}</p>
                    <p className="activity-date">{formatDate(ev.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Exit Listing Modal ──────────────────────────────── */}
      {showExitModal && activeLease && tenantId && (
        <ExitListingModal
          leaseId={activeLease.id}
          roomTitle="Your Current Room"
          accessToken={token!}
          onSuccess={handleExitSuccess}
          onClose={() => setShowExitModal(false)}
        />
      )}
    </div>
  );
}
