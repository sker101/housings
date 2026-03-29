import { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { APP_ROLE } from '../lib/roles';
import { selectRows, updateRows } from '../lib/supabase';
import LandlordSidebar from './LandlordSidebar';
import StudentSidebar from './StudentSidebar';
import AdminSidebar from './AdminSidebar';
import { Menu } from 'lucide-react';

export default function Layout({ children }) {
  const { user, token, isAuthenticated, logout, networkError, setNetworkError } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [sosMode, setSosMode] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const [activeListings, setActiveListings] = useState(0);
  const [tenantCount, setTenantCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [activeBookings, setActiveBookings] = useState(0);
  const [occupancyRate, setOccupancyRate] = useState(0);
  const [pendingInquiries, setPendingInquiries] = useState(0);
  const [mtdEarnings, setMtdEarnings] = useState(0);
  const [subscriptionTier, setSubscriptionTier] = useState('free');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const hasSyncedLanguage = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      // Only force collapse on small screens, never force expansion
      if (window.innerWidth <= 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleLanguage = async () => {
    const nextLang = i18n.language.startsWith('en') ? 'sw' : 'en';
    await i18n.changeLanguage(nextLang);

    // If logged in, save the preference to Supabase
    if (isAuthenticated && user?.userId && token) {
      try {
        await updateRows(
          'profiles',
          { preferred_language: nextLang },
          {
            filters: [{ column: 'id', op: 'eq', value: user.userId }],
            accessToken: token
          }
        );
      } catch (err) {
        console.error('Failed to save language preference:', err);
      }
    }
  };

  // Sync language on initial auth load
  useEffect(() => {
    if (isAuthenticated && user?.preferredLanguage && !hasSyncedLanguage.current) {
      if (user.preferredLanguage !== i18n.language) {
        i18n.changeLanguage(user.preferredLanguage);
      }
      hasSyncedLanguage.current = true;
    }
  }, [isAuthenticated, user?.preferredLanguage, i18n]);

  // Global Settings & Profile Status (SOS & Suspension)
  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      try {
        const [settingsRows, profileRows] = await Promise.all([
          selectRows('system_settings', {}),
          (isAuthenticated && user?.userId) ? selectRows('profiles', {
            select: 'is_suspended',
            filters: [{ column: 'id', op: 'eq', value: user.userId }],
            accessToken: token
          }) : Promise.resolve([])
        ]);

        if (mounted) {
          const settingsMap = {};
          settingsRows.forEach(s => settingsMap[s.key] = s.value);
          setSosMode(settingsMap['maintenance_mode'] === true);
          setAnnouncement(settingsMap['global_announcement'] || '');

          if (profileRows.length > 0 && profileRows[0].is_suspended) {
            logout(); // Force logout if suspended
          }
        }
      } catch (err) {
        console.error('Failed to load global settings:', err);
      }
    }
    loadSettings();
    const id = setInterval(loadSettings, 3000); // More aggressive polling for emergencies
    return () => { mounted = false; clearInterval(id); };
  }, [isAuthenticated, user?.userId, token, logout]);

  useEffect(() => {
    let mounted = true;
    async function loadUnreadCount() {
      if (!isAuthenticated || !user?.userId || !token) {
        if (mounted) { setUnreadCount(0); }
        return;
      }
      try {
        const conversations = await selectRows('conversations', {
          select: 'id',
          or: `tenant_id.eq.${user.userId},lister_id.eq.${user.userId}`,
          limit: 500,
          accessToken: token
        });
        const conversationIds = conversations.map((item) => item.id).filter(Boolean);
        if (conversationIds.length === 0) {
          if (mounted) { setUnreadCount(0); }
          return;
        }
        const unreadRows = await selectRows('messages', {
          select: 'id',
          filters: [
            { column: 'conversation_id', op: 'in', value: `(${conversationIds.join(',')})` },
            { column: 'sender_id', op: 'neq', value: user.userId },
            { column: 'seen_at', op: 'is', value: 'null' }
          ],
          accessToken: token
        });
        if (mounted) { setUnreadCount(unreadRows.length); }
      } catch {
        if (mounted) { setUnreadCount(0); }
      }
    }
    loadUnreadCount();
    const intervalId = setInterval(loadUnreadCount, 20000);
    return () => { mounted = false; clearInterval(intervalId); };
  }, [isAuthenticated, token, user?.userId]);

  // Notification bell count
  useEffect(() => {
    let mounted = true;
    async function loadNotifCount() {
      if (!isAuthenticated || !user?.userId || !token) { setNotifCount(0); return; }
      try {
        const rows = await selectRows('notifications', {
          select: 'id',
          filters: [
            { column: 'user_id', op: 'eq', value: user.userId },
            { column: 'read_at', op: 'is', value: 'null' }
          ],
          limit: 99,
          accessToken: token
        });
        if (mounted) setNotifCount(rows.length);
      } catch {
        if (mounted) setNotifCount(0);
      }
    }
    loadNotifCount();
    const id = setInterval(loadNotifCount, 30000);
    return () => { mounted = false; clearInterval(id); };
  }, [isAuthenticated, token, user?.userId]);

  // Additional sidebar stats
  useEffect(() => {
    let mounted = true;
    async function loadSidebarStats() {
      if (!isAuthenticated || !user?.userId || !token) return;
      try {
        if (user.role === APP_ROLE.LISTER) {
          const profileRows = await selectRows('profiles', {
            select: 'subscription_plan', filters: [{ column: 'id', op: 'eq', value: user.userId }],
            accessToken: token
          });
          const tier = profileRows.length > 0 && profileRows[0].subscription_plan ? profileRows[0].subscription_plan : 'free';

          const listingsRows = await selectRows('listings', {
            select: 'id,vacancy_status,price_monthly', filters: [{ column: 'lister_id', op: 'eq', value: user.userId }, { column: 'status', op: 'eq', value: 'approved' }],
            limit: 1000, accessToken: token
          });
          const tenantRows = await selectRows('bookings', {
            select: 'id', filters: [{ column: 'lister_id', op: 'eq', value: user.userId }, { column: 'status', op: 'eq', value: 'approved' }],
            limit: 1000, accessToken: token
          });
          const pendingRows = await selectRows('bookings', {
            select: 'id', filters: [{ column: 'lister_id', op: 'eq', value: user.userId }, { column: 'status', op: 'eq', value: 'requested' }],
            limit: 1000, accessToken: token
          });
          if (mounted) {
            setSubscriptionTier(tier);
            setActiveListings(listingsRows.length);
            setTenantCount(tenantRows.length);
            setPendingInquiries(pendingRows.length);

            const occupied = listingsRows.filter((r: any) => r.vacancy_status === 'occupied').length;
            setOccupancyRate(listingsRows.length > 0 ? Math.round((occupied / listingsRows.length) * 100) : 0);

            const earnings = listingsRows.filter((r: any) => r.vacancy_status === 'occupied').reduce((sum: number, r: any) => sum + Number(r.price_monthly || 0), 0);
            setMtdEarnings(earnings);
          }
        } else if (user.role === APP_ROLE.STUDENT) {
          const savedRows = await selectRows('saved_listings', {
            select: 'id', filters: [{ column: 'user_id', op: 'eq', value: user.userId }], limit: 1000, accessToken: token
          });
          const bookingsRows = await selectRows('bookings', {
            select: 'id', filters: [{ column: 'tenant_id', op: 'eq', value: user.userId }, { column: 'status', op: 'eq', value: 'approved' }],
            limit: 1000, accessToken: token
          });
          if (mounted) {
            setSavedCount(savedRows.length);
            setActiveBookings(bookingsRows.length);
          }
        }
      } catch {
        // Silently ignore errors for background stats fetching
      }
    }
    loadSidebarStats();
    const id = setInterval(loadSidebarStats, 60000);
    return () => { mounted = false; clearInterval(id); };
  }, [isAuthenticated, token, user?.userId, user?.role]);

  const topActionLink = (() => {
    if (!isAuthenticated) {
      return (
        <NavLink to="/login" className="btn btn--small">
          {t('nav.login')}
        </NavLink>
      );
    }
    if (user?.role === APP_ROLE.ADMIN) {
      return (
        <NavLink to="/admin" className="btn btn--small">
          {t('nav.admin')}
        </NavLink>
      );
    }
    if (user?.role === APP_ROLE.LISTER) {
      return (
        <NavLink to="/landlord" className="btn btn--small">
          {t('nav.dashboard')}
        </NavLink>
      );
    }
    return (
      <NavLink to="/saved" className="btn btn--small">
        {t('nav.saved')}
      </NavLink>
    );
  })();

  return (
    <div className="app-shell">
      {sosMode ? (
        <div className="sos-banner">
          <span className="sos-banner__content">
            🚨 <strong>{t('layout.sosEmergency')}:</strong> {announcement || t('layout.defaultSosMsg')}
          </span>
        </div>
      ) : (announcement && announcement.trim() !== '') ? (
        <div className="announcement-banner">
          <span>📢 {announcement}</span>
        </div>
      ) : null}

      <header className="topbar" style={{ display: 'flex', alignItems: 'center' }}>
        {isAuthenticated ? (
          <button
            type="button"
            className="desktop-only"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{
              padding: '0.5rem',
              marginLeft: '1rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'inherit',
              flexShrink: 0,
              borderRadius: '8px',
              transition: 'background 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            onFocus={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
            onBlur={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Menu size={24} />
          </button>
        ) : null}

        <div className="topbar__inner" style={{ flex: 1, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link to="/" className="brand-link">
              <span className="brand-mark">C</span>
              <span className="brand-text">
                CampusStay <em>TZ</em>
              </span>
            </Link>
          </div>

          <nav className="topbar__nav">
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={toggleLanguage}
              title="Toggle Language"
            >
              {i18n.language.startsWith('en') ? 'SW' : 'EN'}
            </button>
            <NavLink to="/">{t('nav.home')}</NavLink>
            <NavLink to="/search">{t('nav.search')}</NavLink>
            {isAuthenticated ? (
              <NavLink to="/messages" className="nav-link-with-badge">
                {t('nav.messages')}
                {unreadCount > 0 ? (
                  <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                ) : null}
              </NavLink>
            ) : null}
            {user?.role === APP_ROLE.LISTER ? <NavLink to="/list-property">{t('nav.listProperty')}</NavLink> : null}
            {isAuthenticated ? (
              <NavLink to="/profile" className="nav-profile-link">
                <span className="nav-avatar">
                  {(user?.fullName || 'U').charAt(0).toUpperCase()}
                </span>
                <span className="nav-greeting">
                  {t('layout.greeting')}, {user?.fullName?.split(' ')[0] || 'User'}
                </span>
              </NavLink>
            ) : null}
            {topActionLink}
            {isAuthenticated ? (
              <button type="button" className="btn btn--ghost btn--small" onClick={logout}>
                {t('nav.logout')}
              </button>
            ) : null}
          </nav>
        </div>
      </header>

      {networkError ? (
        <div style={{ background: '#cf222e', color: 'white', padding: '0.75rem', textAlign: 'center', fontSize: '0.9rem', position: 'sticky', top: '60px', zIndex: 90 }}>
          {t('layout.networkError')}
          <button
            type="button"
            onClick={() => { setNetworkError(false); window.location.reload(); }}
            style={{ marginLeft: '1rem', background: 'transparent', border: '1px solid white', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
          >
            {t('layout.retry')}
          </button>
        </div>
      ) : null}

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)', position: 'relative', width: '100%', maxWidth: '100vw' }}>
        {isAuthenticated && user?.role === APP_ROLE.LISTER && !location.pathname.startsWith('/admin') ? (
          <LandlordSidebar
            unreadMessages={unreadCount}
            unreadNotifs={notifCount}
            activeListings={activeListings}
            tenantCount={tenantCount}
            occupancyRate={occupancyRate}
            pendingInquiries={pendingInquiries}
            mtdEarnings={mtdEarnings}
            subscriptionTier={subscriptionTier as 'free' | 'verified' | 'premium'}
            isCollapsed={!isSidebarOpen}
          />
        ) : null}
        {isAuthenticated && user?.role === APP_ROLE.STUDENT && !location.pathname.startsWith('/admin') ? (
          <StudentSidebar
            unreadMessages={unreadCount}
            unreadNotifs={notifCount}
            savedCount={savedCount}
            activeBookings={activeBookings}
            isCollapsed={!isSidebarOpen}
          />
        ) : null}
        {isAuthenticated && user?.role === APP_ROLE.ADMIN ? (
          <AdminSidebar
            isCollapsed={!isSidebarOpen}
          />
        ) : null}

        <main className="main-content" style={{ flex: 1, minWidth: 0, transition: 'all 0.3s ease' }}>
          {children}
        </main>
      </div>

      {(!isAuthenticated || user?.role === APP_ROLE.ADMIN || location.pathname.startsWith('/admin')) ? (
        <nav className="bottom-nav" aria-label="Primary">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'is-active' : '')} end>
            {t('nav.home')}
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => (isActive ? 'is-active' : '')}>
            {t('nav.search')}
          </NavLink>
          <NavLink to="/messages" className={({ isActive }) => `nav-link-with-badge ${isActive ? 'is-active' : ''}`}>
            {t('nav.messages')}
            {unreadCount > 0 ? (
              <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            ) : null}
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => (isActive ? 'is-active' : '')}>
            {user?.fullName?.split(' ')[0] || t('dashboard.profile')}
          </NavLink>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={logout}
              className="nav-link-button"
              style={{ background: 'none', border: 'none', padding: 0, color: 'inherit' }}
            >
              {t('nav.logout')}
            </button>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
