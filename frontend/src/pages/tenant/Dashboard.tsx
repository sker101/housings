/**
 * TenantDashboard.tsx — iRent
 * KPIs: Active Lease, Days until Move-out, Referral Earnings
 * Features: Ward-based search, "Moving soon? List your room." CTA
 */

import { useState, useEffect, type ElementType, type CSSProperties } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, Heart, CreditCard, UserCircle2, ShieldCheck,
  Building2, Calendar, Wallet, Bookmark, ChevronRight,
  Gift, Home, Filter, X, Clock, CheckCircle2, AlertCircle,
  Building, TrendingUpIcon, Activity, MapPin, HelpCircle as Help,
  FileText as File, MessageSquare as Message, Mail as Email, Star
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

// ── Mobile-First Stat Card Component ────────────────────────────
function StatCard({ 
  label, 
  value, 
  sub, 
  icon: Icon, 
  color, 
  delay = 0,
  onClick 
}: {
  label: string; 
  value: string | number; 
  sub?: string;
  icon: ElementType; 
  color: string;
  delay?: number;
  onClick?: () => void;
}) {
  return (
    <div 
      className="stat-card-mobile" 
      style={{ 
        '--card-color': color,
        '--delay': `${delay}ms`
      } as CSSProperties}
      onClick={onClick}
    >
      <div className="stat-icon-bg" style={{ background: `${color}15` }}>
        <Icon size={18} color={color} />
      </div>
      <div className="stat-content">
        <p className="stat-label">{label}</p>
        <p className="stat-value" style={{ color }}>{value}</p>
        {sub && <p className="stat-sub">{sub}</p>}
      </div>
    </div>
  );
}

// ── Quick Action Button Component ──────────────────────────────
function QuickAction({ 
  icon: Icon, 
  label, 
  color, 
  delay = 0,
  onClick 
}: {
  icon: ElementType;
  label: string;
  color: string;
  delay?: number;
  onClick?: () => void;
}) {
  return (
    <button 
      className="quick-action-btn"
      style={{ '--delay': `${delay}ms` } as CSSProperties}
      onClick={onClick}
    >
      <div className="quick-icon" style={{ background: color }}>
        <Icon size={16} color="white" />
      </div>
      <span className="quick-label">{label}</span>
    </button>
  );
}

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
        if (!mounted) return;
        
        if (tenants.length) {
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
        }

        // Fetch Saved Listings (Resilient) - fetch even if tenant record doesn't exist
        setSavedLoading(true);
        try {
          const savedListings = await Promise.race([
            fetchSavedListings(userId!, token!, { limit: 3 }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
          ]) as any[];
          console.log('Saved listings fetched:', savedListings);
          
          const savedCountResult = await Promise.race([
            selectRows('saved_listings', {
              select: 'count',
              filters: [{ column: 'tenant_id', op: 'eq', value: userId! }],
              accessToken: token!
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);
          console.log('Saved count:', savedCountResult);
          
          if (mounted) {
            setSavedRooms(savedListings || []);
            setSavedCount(savedCountResult?.[0]?.count ?? savedCountResult.length ?? 0);
            setSavedLoading(false);
          }
        } catch (savedErr) {
          console.error('TenantDashboard: failed to fetch saved listings', savedErr);
          if (mounted) {
            setSavedRooms([]);
            setSavedCount(0);
            setSavedLoading(false);
          }
        }
      } catch (err) {
        console.error('TenantDashboard: failed to fetch tenant data', err);
        if (mounted) {
          setSavedLoading(false);
          setSavedRooms([]);
          setSavedCount(0);
        }
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
    <div className={`dashboard-mobile ${isVisible ? 'is-visible' : ''}`}>
      <style>{mobileDashboardStyles}</style>

      {/* ── Header Greeting ─────────────────────────────────── */}
      <header className="dashboard-header">
        <div className="greeting-section">
          <p className="greeting-label">Welcome,</p>
          <h1 className="user-name">{firstName}</h1>
        </div>
        <button 
          className="profile-btn"
          onClick={() => navigate('/tenant/profile')}
        >
          <span className="profile-initials">
            {firstName ? firstName.slice(0, 2).toUpperCase() : 'U'}
          </span>
        </button>
      </header>

      {/* ── Stats Cards ────────────────────────────────────── */}
      <section className="stats-section">
        <h2 className="section-heading">Overview</h2>
        <div className="stats-grid">
          <StatCard
            label="Lease"
            value={activeLease ? (activeLease.renewal_decision === 'incoming' ? 'Incoming' : 'Active') : 'None'}
            sub={activeLease 
              ? (activeLease.renewal_decision === 'incoming' 
                  ? `Move-in: ${new Date(activeLease.lease_end_date).toLocaleDateString('sw-TZ')}`
                  : (activeLease.renewal_decision === 'active' 
                     ? 'Current Stay' 
                     : `Expires ${new Date(activeLease.lease_end_date).toLocaleDateString('sw-TZ')}`))
              : 'No lease'}
            icon={Home}
            color="#22c55e"
            delay={100}
            onClick={() => activeLease && navigate('/my-room')}
          />
          <StatCard
            label="Rent Due"
            value={nextPaymentDate ? new Date(nextPaymentDate).toLocaleDateString('sw-TZ') : (activeLease?.renewal_decision === 'incoming' ? '—' : 'None')}
            sub={daysUntilRentDue !== null ? (daysUntilRentDue <= 0 ? 'Due today!' : `${daysUntilRentDue} days left`) : (activeLease?.renewal_decision === 'incoming' ? 'Waiting' : 'No payments')}
            icon={Calendar}
            color={daysUntilRentDue !== null && daysUntilRentDue <= 5 ? '#ef4444' : '#22c55e'}
            delay={200}
          />
          <StatCard
            label="Earnings"
            value={new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(referralEarnings)}
            sub={pendingReferrals > 0 ? `${TZSFormat(pendingReferrals)} pending` : 'Referral rewards'}
            icon={Wallet}
            color="#8b5cf6"
            delay={300}
          />
          <StatCard
            label="Activity"
            value={events.length}
            sub={events.length === 1 ? 'recent event' : 'recent events'}
            icon={Activity}
            color="#3b82f6"
            delay={400}
            onClick={() => navigate('/tenant/activity')}
          />
        </div>
      </section>

      {/* ── Active Room Card ───────────────────────────────── */}
      {activeLease && (
        <section className="active-room-section" style={{ animationDelay: '200ms' }}>
          <div className="section-header-row">
            <h2 className="section-heading">Your Room</h2>
            <Link to="/my-room" className="view-all-link">
              Manage <ChevronRight size={16} />
            </Link>
          </div>
          <div 
            className="active-room-card"
            onClick={() => navigate('/my-room')}
          >
            <div className="room-status-badge">
              {activeLease.renewal_decision === 'incoming' ? 'Incoming' : 'Active'}
            </div>
            <h3 className="room-title">
              {activeLease.renewal_decision === 'incoming' ? 'Upcoming Move-in' : 'Current Stay'}
            </h3>
            <p className="room-date">
              {activeLease.renewal_decision === 'incoming' 
                ? `Move-in: ${new Date(activeLease.lease_end_date).toLocaleDateString('sw-TZ')}`
                : `Lease ends: ${new Date(activeLease.lease_end_date).toLocaleDateString('sw-TZ')}`}
            </p>
            {canListRoom && (
              <button
                className="exit-list-btn"
                onClick={e => { e.stopPropagation(); setShowExitModal(true); }}
              >
                <Gift size={14} /> Moving soon?
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── Saved Rooms Preview ─────────────────────────────── */}
      <section className="saved-preview-section" style={{ animationDelay: '300ms' }}>
        <div className="section-header-row">
          <h2 className="section-heading">Saved Rooms</h2>
          {savedCount > 0 && (
            <Link to="/tenant/saved" className="view-all-link">
              See all <ChevronRight size={16} />
            </Link>
          )}
        </div>
        
        {savedLoading ? (
          <div className="loading-state">
            <LoadingSpinner size="small" />
          </div>
        ) : savedRooms.length === 0 ? (
          <div className="empty-card" onClick={() => navigate('/listings')}>
            <div className="empty-icon-wrapper">
              <Heart size={32} className="empty-icon" />
            </div>
            <p className="empty-text">No saved rooms yet</p>
            <span className="empty-action">Browse listings →</span>
          </div>
        ) : (
          <div className="saved-rooms-scroll">
            {savedRooms.slice(0, 3).map((item, index) => {
              const l = item.listing;
              if (!l) return null;
              return (
                <Link 
                  key={l.id} 
                  to={`/rooms/${l.id}`} 
                  className="saved-room-preview"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="room-thumb">
                    {l.imageUrl ? (
                      <img src={l.imageUrl} alt={l.title} />
                    ) : (
                      <Building2 size={20} />
                    )}
                    {l.rating && (
                      <div className="preview-rating">
                        <Star size={12} fill="#f59e0b" color="#f59e0b" />
                        <span>{l.rating}</span>
                      </div>
                    )}
                  </div>
                  <div className="room-preview-info">
                    <p className="preview-title">{l.title}</p>
                    {l.location && (
                      <p className="preview-location">
                        <MapPin size={12} />
                        <span>{l.location}</span>
                      </p>
                    )}
                    <p className="preview-price">
                      {TZSFormat(l.priceMonthly)}
                      <span className="preview-price-unit">/mo</span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Profile Completion ─────────────────────────────── */}
      {completion.percent < 100 && (
        <section className="profile-completion-section" style={{ animationDelay: '400ms' }}>
          <div className="completion-card">
            <div className="completion-header">
              <ShieldCheck size={20} color="#22c55e" />
              <span className="completion-percent">{completion.percent}%</span>
            </div>
            <p className="completion-text">Complete your profile</p>
            <div className="completion-bar">
              <div className="completion-fill" style={{ width: `${completion.percent}%` }} />
            </div>
            <button 
              className="completion-btn"
              onClick={() => navigate('/tenant/profile')}
            >
              Complete Now
            </button>
          </div>
        </section>
      )}

      {/* ── Footer Links ───────────────────────────────────── */}
      <section className="footer-links-section" style={{ animationDelay: '500ms' }}>
        <div className="footer-links-grid">
          <button 
            className="footer-link-item"
            onClick={() => navigate('/help')}
          >
            <Help size={18} />
            <span>Help Centre</span>
          </button>
          <button 
            className="footer-link-item"
            onClick={() => navigate('/terms')}
          >
            <File size={18} />
            <span>Terms & Privacy</span>
          </button>
          <button 
            className="footer-link-item"
            onClick={() => navigate('/faqs')}
          >
            <Message size={18} />
            <span>FAQs</span>
          </button>
          <button 
            className="footer-link-item"
            onClick={() => navigate('/contact')}
          >
            <Email size={18} />
            <span>Contact Us</span>
          </button>
        </div>
      </section>

      {/* ── Exit Listing Modal ─────────────────────────────── */}
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

// ── Mobile Dashboard Styles ────────────────────────────────────
const mobileDashboardStyles = `
  .dashboard-mobile {
    padding: 0.75rem;
    max-width: 100%;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .dashboard-mobile.is-visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* Header */
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.25rem 1rem;
    animation: slideInDown 0.5s ease-out;
  }

  @keyframes slideInDown {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .greeting-section {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .greeting-label {
    font-size: 0.85rem;
    color: #65a30d;
    font-weight: 500;
    margin: 0;
  }

  .user-name {
    font-size: 1.5rem;
    font-weight: 700;
    color: #166534;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .profile-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
    color: #22c55e;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(34, 197, 94, 0.15);
  }

  .profile-btn:active {
    transform: scale(0.95);
    box-shadow: 0 1px 4px rgba(34, 197, 94, 0.2);
  }

  .profile-initials {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 1rem;
    font-weight: 700;
    color: #16a34a;
    letter-spacing: 0.05em;
  }

  /* Quick Actions */
  .quick-actions {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0;
    margin-bottom: 1rem;
  }

  .quick-action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.25rem;
    border: none;
    background: transparent;
    cursor: pointer;
    animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
    animation-delay: var(--delay, 0ms);
  }

  @keyframes popIn {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }

  .quick-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .quick-action-btn:active .quick-icon {
    transform: scale(0.92);
  }

  .quick-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: #475569;
  }

  /* Section Styles */
  .section-heading {
    font-size: 1rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.75rem 0;
  }

  .section-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .view-all-link {
    font-size: 0.8rem;
    font-weight: 600;
    color: #22c55e;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    transition: opacity 0.2s;
  }

  .view-all-link:active {
    opacity: 0.6;
  }

  /* Stats Section */
  .stats-section {
    margin-bottom: 1.25rem;
    animation: fadeInUp 0.5s ease-out;
    animation-delay: 0.1s;
    animation-fill-mode: backwards;
  }

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .stat-card-mobile {
    background: white;
    border-radius: 16px;
    padding: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    animation: slideInUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
    animation-delay: var(--delay, 0ms);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .stat-card-mobile:active {
    transform: scale(0.98);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }

  @keyframes slideInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .stat-icon-bg {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-label {
    font-size: 0.7rem;
    color: #64748b;
    font-weight: 500;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .stat-value {
    font-size: 0.95rem;
    font-weight: 700;
    margin: 0;
  }

  .stat-sub {
    font-size: 0.7rem;
    color: #94a3b8;
    margin: 0;
  }

  /* Active Room Section */
  .active-room-section {
    margin-bottom: 1.25rem;
    animation: fadeInUp 0.5s ease-out backwards;
    animation-delay: 0.2s;
  }

  .active-room-card {
    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
    border-radius: 20px;
    padding: 1.25rem;
    position: relative;
    border: 1px solid rgba(34, 197, 94, 0.2);
    cursor: pointer;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .active-room-card:active {
    transform: scale(0.98);
  }

  .room-status-badge {
    display: inline-block;
    background: #22c55e;
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.25rem 0.6rem;
    border-radius: 20px;
    margin-bottom: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .room-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: #166534;
    margin: 0 0 0.5rem 0;
  }

  .room-date {
    font-size: 0.8rem;
    color: #65a30d;
    margin: 0;
  }

  .exit-list-btn {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    background: white;
    border: 1.5px solid #86efac;
    border-radius: 10px;
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #16a34a;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    transition: all 0.2s ease;
  }

  .exit-list-btn:active {
    transform: scale(0.95);
    background: #f0fdf4;
  }

  /* Saved Rooms Section */
  .saved-preview-section {
    margin-bottom: 1.25rem;
    animation: fadeInUp 0.5s ease-out backwards;
    animation-delay: 0.3s;
  }

  .saved-rooms-scroll {
    display: flex;
    gap: 0.75rem;
    overflow-x: auto;
    padding: 0.25rem 0.25rem 0.5rem;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .saved-rooms-scroll::-webkit-scrollbar {
    display: none;
  }

  .saved-room-preview {
    flex-shrink: 0;
    width: 160px;
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    text-decoration: none;
    animation: slideInRight 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
    animation-delay: var(--delay, 0ms);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    border: 1px solid #f1f5f9;
  }

  .saved-room-preview:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
    border-color: #e2e8f0;
  }

  .saved-room-preview:active {
    transform: scale(0.96);
    transition: transform 0.15s ease;
  }

  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .room-thumb {
    width: 100%;
    height: 100px;
    background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    overflow: hidden;
    position: relative;
  }

  .room-thumb::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40%;
    background: linear-gradient(to top, rgba(0,0,0,0.3), transparent);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .saved-room-preview:hover .room-thumb::after {
    opacity: 1;
  }

  .room-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }

  .saved-room-preview:hover .room-thumb img {
    transform: scale(1.08);
  }

  .room-preview-info {
    padding: 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .preview-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 0.35rem 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
  }

  .preview-location {
    font-size: 0.7rem;
    color: #64748b;
    margin: 0 0 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .preview-location svg {
    flex-shrink: 0;
  }

  .preview-price {
    font-size: 0.8rem;
    color: #16a34a;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
  }

  .preview-price-unit {
    font-size: 0.65rem;
    color: #94a3b8;
    font-weight: 500;
  }

  .preview-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    background: rgba(22, 163, 74, 0.9);
    color: white;
    font-size: 0.65rem;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 12px;
    backdrop-filter: blur(4px);
    z-index: 1;
  }

  .preview-rating {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(255, 255, 255, 0.95);
    color: #f59e0b;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 3px;
    backdrop-filter: blur(4px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    z-index: 1;
  }

  .preview-rating svg {
    fill: #f59e0b;
    color: #f59e0b;
  }

  /* Desktop styles */
  @media (min-width: 768px) {
    .saved-room-preview {
      width: 200px;
    }

    .room-thumb {
      height: 120px;
    }

    .room-preview-info {
      padding: 1rem;
    }

    .preview-title {
      font-size: 0.95rem;
      margin-bottom: 0.4rem;
    }

    .preview-location {
      font-size: 0.75rem;
      margin-bottom: 0.625rem;
    }

    .preview-price {
      font-size: 0.9rem;
    }

    .preview-price-unit {
      font-size: 0.7rem;
    }

    .preview-badge {
      font-size: 0.7rem;
      padding: 4px 10px;
    }

    .preview-rating {
      font-size: 0.75rem;
      padding: 4px 10px;
    }
  }

  /* Empty Card */
  .empty-card {
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    border-radius: 16px;
    padding: 1.5rem;
    text-align: center;
    cursor: pointer;
    border: 2px dashed #cbd5e1;
    transition: all 0.3s ease;
  }

  .empty-card:active {
    transform: scale(0.98);
    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
    border-color: #86efac;
  }

  .empty-icon-wrapper {
    width: 64px;
    height: 64px;
    margin: 0 auto 1rem;
    background: linear-gradient(135deg, #e5e7eb, #d1d5db);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .empty-icon {
    color: #6b7280;
  }

  .empty-icon-large {
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }

  .empty-text {
    font-size: 0.85rem;
    font-weight: 600;
    color: #475569;
    margin: 0 0 0.5rem 0;
  }

  .empty-action {
    font-size: 0.75rem;
    color: #22c55e;
    font-weight: 600;
  }

  /* Profile Completion */
  .profile-completion-section {
    margin-bottom: 1.25rem;
    animation: fadeInUp 0.5s ease-out backwards;
    animation-delay: 0.4s;
  }

  .completion-card {
    background: white;
    border-radius: 16px;
    padding: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .completion-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .completion-percent {
    font-size: 1.25rem;
    font-weight: 800;
    color: #22c55e;
  }

  .completion-text {
    font-size: 0.85rem;
    font-weight: 600;
    color: #475569;
    margin: 0;
  }

  .completion-bar {
    height: 6px;
    background: #e2e8f0;
    border-radius: 3px;
    overflow: hidden;
  }

  .completion-fill {
    height: 100%;
    background: linear-gradient(90deg, #22c55e, #16a34a);
    border-radius: 3px;
    transition: width 0.5s ease;
  }

  .completion-btn {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 0.5rem;
  }

  .completion-btn:active {
    transform: scale(0.96);
    box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
  }

  /* Footer Links */
  .footer-links-section {
    margin-bottom: 0;
    animation: fadeInUp 0.5s ease-out backwards;
    animation-delay: 0.5s;
  }

  .footer-links-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .footer-link-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 500;
    color: #475569;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .footer-link-item:active {
    transform: scale(0.96);
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  .footer-link-item svg {
    color: #64748b;
  }

  /* Wards Section */
  .wards-section {
    margin-bottom: 1.25rem;
    animation: fadeInUp 0.5s ease-out backwards;
    animation-delay: 0.5s;
  }

  .wards-scroll {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding: 0.25rem 0.25rem 0.5rem;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .wards-scroll::-webkit-scrollbar {
    display: none;
  }

  .ward-chip {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.6rem 1rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
    animation-delay: var(--delay, 0ms);
    transition: all 0.2s ease;
  }

  .ward-chip:active {
    transform: scale(0.95);
    background: #f0fdf4;
    border-color: #86efac;
    color: #16a34a;
  }

  /* Loading State */
  .loading-state {
    display: flex;
    justify-content: center;
    padding: 2rem;
  }
`;
