import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { APP_ROLE } from '../lib/roles';
import { selectRows } from '../lib/supabase';

export default function Layout({ children }) {
  const { user, token, isAuthenticated, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

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
          Login
        </NavLink>
      );
    }

    if (user?.role === APP_ROLE.ADMIN) {
      return (
        <NavLink to="/admin" className="btn btn--small">
          Admin
        </NavLink>
      );
    }

    if (user?.role === APP_ROLE.LISTER) {
      return (
        <NavLink to="/landlord" className="btn btn--small">
          Dashboard
        </NavLink>
      );
    }

    return (
      <NavLink to="/saved" className="btn btn--small">
        Saved
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
            <NavLink to="/search">Search</NavLink>
            {isAuthenticated ? (
              <NavLink to="/messages" className="nav-link-with-badge">
                Messages
                {unreadCount > 0 ? (
                  <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                ) : null}
              </NavLink>
            ) : null}
            {user?.role === APP_ROLE.LISTER ? <NavLink to="/list-property">List Property</NavLink> : null}
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
                Logout
              </button>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="main-content">{children}</main>

      <nav className="bottom-nav" aria-label="Primary">
        <NavLink to="/" className={({ isActive }) => (isActive ? 'is-active' : '')} end>
          Home
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          Search
        </NavLink>
        <NavLink to="/messages" className={({ isActive }) => `nav-link-with-badge ${isActive ? 'is-active' : ''}`}>
          Messages
          {unreadCount > 0 ? (
            <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          ) : null}
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          {user?.fullName?.split(' ')[0] || 'Profile'}
        </NavLink>
      </nav>
    </div>
  );
}
