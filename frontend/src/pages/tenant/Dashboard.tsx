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
  const [retryCount, setRetryCount]       = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitSuccess, setExitSuccess]     = useState<string | null>(null);

  const isPaymentSuccess = location.search.includes('payment=success');

  useEffect(() => { setIsVisible(true); }, []);

  const { listings: savedListings, loading: savedLoading } = useListings(token, { limit: 3 });
  const { events, loading: actLoading } = useActivityLog(userId, token);

  // ── Fetch tenant record + active lease + referral earnings ──────
  useEffect(() => {
    if (!userId || !token) return;
    let mounted = true;
    async function fetchTenantData() {
      try {
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
        }
      } catch (err) {
        console.error('TenantDashboard: failed to fetch tenant data', err);
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
          style={{ animationDelay: '0.1s', cursor: 'pointer', position: 'relative' }}
          role="presentation"
        >
          <div className="active-stay-content">
            <div className="active-stay-badge">
              <Home size={12} style={{ marginRight: 4 }} />
              Active Lease
            </div>
            <h3 className="active-stay-title">Your Current Room</h3>
            <div className="active-stay-details">
              <span className="active-stay-date">
                <Calendar size={14} />
                Move-out: {new Date(activeLease.lease_end_date).toLocaleDateString('sw-TZ')}
              </span>
              <span style={{
                background: daysLeftColour + '20',
                color:      daysLeftColour,
                padding: '2px 10px', borderRadius: '999px',
                fontWeight: 700, fontSize: '0.8rem',
              }}>
                {daysLeftLabel} remaining
              </span>
            </div>
          </div>
          <Link to="/my-room" className="active-stay-btn" onClick={e => e.stopPropagation()}>
            Manage Room <ArrowRight size={16} />
          </Link>

          {/* "Moving soon?" CTA */}
          {canListRoom && (
            <button
              onClick={e => { e.stopPropagation(); setShowExitModal(true); }}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: '#f0fdf4', border: '1.5px solid #86efac',
                borderRadius: '10px', padding: '0.4rem 0.75rem',
                fontSize: '0.78rem', fontWeight: 600, color: '#16a34a',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <Gift size={13} /> Moving soon? List your room
            </button>
          )}
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
          value={activeLease ? 'Active' : 'None'}
          sub={activeLease ? `Expires ${new Date(activeLease.lease_end_date).toLocaleDateString('sw-TZ')}` : 'No current lease'}
          icon={Home}
          color="#22c55e"
        />
        <KpiCard
          label="Days until Move-out"
          value={daysLeftLabel}
          sub={daysLeft != null && daysLeft <= 30 ? '⚠ Renew or list your room' : 'Lease in good standing'}
          icon={Calendar}
          color={daysLeftColour}
        />
        <KpiCard
          label="iRent Referral Earnings"
          value={new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(referralEarnings)}
          sub="Lifetime referral rewards"
          icon={Gift}
          color="#8b5cf6"
        />
        <KpiCard
          label={t('studentDashboard.savedRooms', 'Saved Rooms')}
          value={savedListings.length}
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
          ) : savedListings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏠</div>
              <p className="empty-text">{t('studentDashboard.noSavedRooms', 'No saved rooms yet')}</p>
              <Link to="/tenant/search" className="empty-btn">{t('studentDashboard.findRooms', 'Find rooms')}</Link>
            </div>
          ) : (
            <div className="saved-list">
              {savedListings.map(l => (
                <Link key={l.id} to={`/listings/${l.id}`} className="saved-room-card">
                  <div className="saved-room-image"><MapPin size={20} /></div>
                  <div className="saved-room-info">
                    <p className="saved-room-title">{l.title}</p>
                    <p className="saved-room-location">
                      {l.area ?? l.district} · {TZSFormat(l.price)}/mo
                    </p>
                  </div>
                  <StatusPill variant={l.status} size="sm" />
                </Link>
              ))}
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
