import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, MessageCircle, Calendar, User, Zap, TrendingUp, Clock, ArrowRight, Sparkles, Search, MapPin } from 'lucide-react';
import { LoadingSpinner, DashboardSkeleton } from '../../components/LoadingSpinner';
import { StatusPill } from '../../components/StatusPill';
import { useAuth } from '../../context/AuthContext';
import { useListings } from '../../hooks/useListings';
import { useInquiries } from '../../hooks/useInquiries';
import { useBookings } from '../../hooks/useBookings';
import { useActivityLog } from '../../hooks/useActivityLog';
import { profileCompletion, TZSFormat, formatDate } from '../../utils/format';
import type { Booking } from '../../types';

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color } as React.CSSProperties}>
      <div className="kpi-icon-wrapper"><Icon size={20} /></div>
      <div className="kpi-content">
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">{value}</p>
        {sub && <p className="kpi-sub">{sub}</p>}
      </div>
    </div>
  );
}

export default function TenantDashboard() {
  const { user, token, profile } = useAuth();
  const { t } = useTranslation();
  const userId = user?.userId ?? null;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const { listings: savedListings, loading: savedLoading } = useListings(token, { limit: 3 });
  const { inquiries, loading: inqLoading } = useInquiries('tenant', userId, token);
  const { bookings, loading: bookLoading } = useBookings('tenant', userId, token);
  const { events, loading: actLoading } = useActivityLog(userId, token);
  const navigate = useNavigate();

  const activeStay = useMemo(() => {
    return bookings.find(b => b.status === 'approved' || b.status === 'completed') || null;
  }, [bookings]);

  const completion = profileCompletion(profile as unknown as Record<string, unknown> | null);
  const activeInquiries = inquiries.filter((i) => i.status === 'pending').length;
  const activeBookings = bookings.filter((b) => b.status === 'approved' || b.status === 'completed').length;

  const firstName = user?.fullName?.split(' ')[0] ?? 'there';

  return (
    <div className={`dashboard-container ${isVisible ? 'is-visible' : ''}`}>
      {/* Welcome Section */}
      <div className="dashboard-welcome" style={{ animationDelay: '0.05s' }}>
        <div className="welcome-content">
          <div className="welcome-badge">
            <Sparkles size={14} />
            <span>{t('studentDashboard.title', 'Student Dashboard')}</span>
          </div>
          <h1 className="welcome-title">
            {t('studentDashboard.welcomeBack', 'Welcome back')}, {firstName} <span className="wave-emoji">👋</span>
          </h1>
          <p className="welcome-subtitle">{t('studentDashboard.subtitle', "Here's everything you need to find your perfect stay")}</p>
        </div>
        <div className="welcome-actions">
          <Link to="/tenant/search" className="welcome-btn primary">
            <Search size={18} />
            {t('studentDashboard.findRooms', 'Find Rooms')}
          </Link>
        </div>
      </div>

      {/* Active Stay Card */}
      {activeStay && (
        <div className="active-stay-card" onClick={() => navigate('/my-room')} style={{ animationDelay: '0.1s' }}>
          <div className="active-stay-content">
            <div className="active-stay-badge">{t('studentDashboard.currentStay', 'Current Stay')}</div>
            <h3 className="active-stay-title">{t('studentDashboard.myLivingSpace', 'My Living Space')}</h3>
            <div className="active-stay-details">
              <span className="active-stay-date">
                <Calendar size={14} />
                {t('studentDashboard.moveIn', 'Move-in')}: {formatDate(activeStay.move_in_date)}
              </span>
              <span className="active-stay-status">{t('studentDashboard.active', 'Active')}</span>
            </div>
          </div>
          <Link to="/my-room" className="active-stay-btn">
            {t('studentDashboard.manageRoom', 'Manage Room')}
            <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard label={t('studentDashboard.savedRooms', 'Saved Rooms')} value={savedListings.length} sub={t('studentDashboard.listingsSaved', 'listings saved')} icon={Heart} color="#ef4444" />
        <KpiCard label={t('studentDashboard.openInquiries', 'Open Inquiries')} value={activeInquiries} sub={t('studentDashboard.pendingResponses', 'pending responses')} icon={MessageCircle} color="#f59e0b" />
        <KpiCard label={t('studentDashboard.activeBookings', 'Active Bookings')} value={activeBookings} sub={t('studentDashboard.confirmedStays', 'confirmed stays')} icon={Calendar} color="#1D9E75" />
        <KpiCard label={t('studentDashboard.profileCompletion', 'Profile Completion')} value={`${completion.percent}%`} sub={completion.percent === 100 ? t('studentDashboard.allDone', 'All done!') : t('studentDashboard.complete', 'complete')} icon={User} color="#10b981" />
      </div>

      {/* Profile Completion */}
      {completion.percent < 100 && (
        <div className="profile-completion-card">
          <div className="completion-header">
            <div className="completion-title-group">
              <TrendingUp size={20} className="completion-icon" />
              <div>
                <h3 className="completion-title">{t('studentDashboard.completeYourProfile', 'Complete your profile')}</h3>
                <p className="completion-subtitle">{t('studentDashboard.completeProfileSubtitle', 'Finish setting up your profile to get better room recommendations')}</p>
              </div>
            </div>
            <span className="completion-percent">{completion.percent}%</span>
          </div>
          <div className="completion-progress">
            <div className="completion-progress-bar" style={{ width: `${completion.percent}%` }} />
          </div>
          <div className="completion-fields">
            {completion.fields.map((f) => (
              <span key={f.key} className={`completion-field ${f.done ? 'done' : 'pending'}`}>
                {f.done ? <Sparkles size={12} /> : <Clock size={12} />}
                {f.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Saved Rooms Section */}
        <section className="dashboard-section">
          <div className="section-header">
            <div className="section-title-group">
              <div className="section-icon saved"><Heart size={18} /></div>
              <h3 className="section-title">{t('studentDashboard.savedRoomsTitle', 'Saved Rooms')}</h3>
            </div>
            <Link to="/tenant/saved" className="section-link">{t('studentDashboard.viewAll', 'View all')} →</Link>
          </div>
          {savedLoading ? (
            <div className="saved-list" style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <LoadingSpinner size="medium" text={t('common.loading', 'Loading...')} />
            </div>
          ) : savedListings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏠</div>
              <p className="empty-text">{t('studentDashboard.noSavedRooms', 'No saved rooms yet')}</p>
              <Link to="/tenant/search" className="empty-btn">{t('studentDashboard.findRooms', 'Find rooms')}</Link>
            </div>
          ) : (
            <div className="saved-list">
              {savedListings.map((l) => (
                <Link key={l.id} to={`/listings/${l.id}`} className="saved-room-card">
                  <div className="saved-room-image">
                    <MapPin size={20} />
                  </div>
                  <div className="saved-room-info">
                    <p className="saved-room-title">{l.title}</p>
                    <p className="saved-room-location">{l.area ?? l.district} · {TZSFormat(l.price)}/mo</p>
                  </div>
                  <StatusPill variant={l.status} size="sm" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Activity Section */}
        <section className="dashboard-section">
          <div className="section-header">
            <div className="section-title-group">
              <div className="section-icon activity"><Zap size={18} /></div>
              <h3 className="section-title">{t('studentDashboard.recentActivity', 'Recent Activity')}</h3>
            </div>
          </div>
          {actLoading ? (
            <div className="activity-list" style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <LoadingSpinner size="medium" text={t('common.loading', 'Loading...')} />
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚡</div>
              <p className="empty-text">{t('studentDashboard.noActivity', 'No activity yet. Start by searching for a room!')}</p>
              <Link to="/tenant/search" className="empty-btn">{t('studentDashboard.searchNow', 'Search now')}</Link>
            </div>
          ) : (
            <div className="activity-list">
              {events.map((ev) => (
                <div key={ev.id} className="activity-item">
                  <div className="activity-icon-wrapper">
                    <Zap size={14} />
                  </div>
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
    </div>
  );
}
