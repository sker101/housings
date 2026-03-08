import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { APP_ROLE } from '../lib/roles';
import { selectRows } from '../lib/supabase';

export default function Layout({ children }) {
  const { user, token, isAuthenticated, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'sw' : 'en';
    i18n.changeLanguage(nextLang);
  };

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
