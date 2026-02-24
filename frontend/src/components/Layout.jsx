import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, isAuthenticated, logout } = useAuth();

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
            <a href="/#featured-rooms">Search Rooms</a>
            <NavLink to="/list-property">List Property</NavLink>

            {user?.role === 'LANDLORD' ? <NavLink to="/landlord">Dashboard</NavLink> : null}
            {user?.role === 'ADMIN' ? <NavLink to="/admin">Dashboard</NavLink> : null}

            {!isAuthenticated ? (
              <NavLink to="/login" className="btn btn--small">
                Login
              </NavLink>
            ) : (
              <button type="button" className="btn btn--ghost btn--small" onClick={logout}>
                Logout
              </button>
            )}
          </nav>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
