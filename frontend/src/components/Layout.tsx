import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { APP_ROLE } from '../lib/roles';
import { selectRows, updateRows } from '../lib/supabase';

export default function Layout({ children }) {
  const { user, token, isAuthenticated, logout, networkError, setNetworkError } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const { t, i18n } = useTranslation();

  const toggleLanguage = async () => {
    const nextLang = i18n.language === 'en' ? 'sw' : 'en';
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
    if (isAuthenticated && user?.preferredLanguage && user.preferredLanguage !== i18n.language) {
      i18n.changeLanguage(user.preferredLanguage);
    }
  }, [isAuthenticated, user?.preferredLanguage, i18n]);

  useEffect(() => {
    let mounted = true;

    async function loadUnreadCount() {
      if (!isAuthenticated || !user?.userId || !token) {
        if (mounted) {
          setUnreadCount(0);
        }
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
          if (mounted) {
            setUnreadCount(0);
          }
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

        if (mounted) {
          setUnreadCount(unreadRows.length);
        }
      } catch {
        if (mounted) {
          setUnreadCount(0);
        }
      }
    }

    loadUnreadCount();
    const intervalId = setInterval(loadUnreadCount, 20000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
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
      <header className="topbar">
        <div className="topbar__inner">
          <Link to="/" className="brand-link">
            <span className="brand-mark">C</span>
            <span className="brand-text">
              CampusStay <em>TZ</em>
            </span>
          </Link>

          <nav className="topbar__nav">
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={toggleLanguage}
              title="Toggle Language"
            >
              {i18n.language === 'en' ? 'SW' : 'EN'}
            </button>
            <NavLink to="/search">{t('nav.search')}</NavLink>
            {isAuthenticated ? (
              <NavLink to="/messages" className="nav-link-with-badge">
                {t('nav.messages')}
                {unreadCount > 0 ? (
                  <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                ) : null}
              </NavLink>
            ) : null}
            {isAuthenticated ? (
              <NavLink to="/notifications" className="nav-link-with-badge" title="Notifications">
                🔔
                {notifCount > 0 ? (
                  <span className="nav-badge">{notifCount > 99 ? '99+' : notifCount}</span>
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
                  Hi, {user?.fullName?.split(' ')[0] || 'User'}
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
          Unable to connect to the server. Please check your internet connection and try again.
          <button
            type="button"
            onClick={() => { setNetworkError(false); window.location.reload(); }}
            style={{ marginLeft: '1rem', background: 'transparent', border: '1px solid white', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      ) : null}

      <main className="main-content">{children}</main>

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
      </nav>
    </div>
  );
}
