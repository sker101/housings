import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { APP_ROLE } from '../lib/roles';

export default function Layout({ children }) {
  const { user, isAuthenticated, logout } = useAuth();

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
            {user?.role === APP_ROLE.LISTER ? <NavLink to="/list-property">List Property</NavLink> : null}
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
        <NavLink to="/messages" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          Messages
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          Profile
        </NavLink>
      </nav>
    </div>
  );
}
