import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Bell,
  LogOut,
  Menu,
  Home,
  Search,
  Heart,
  MessageCircle,
  Calendar,
  User,
  Zap,
  Building,
  Users,
  FileText,
  AlertTriangle,
  Settings,
  ShieldAlert,
  Award,
  Globe,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './RoleBadge';
import { initials } from '../utils/format';
import type { Role } from '../types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const getNavItems = (role: string): NavItem[] => {
  if (role === 'admin') {
    return [
      { label: 'Overview', href: '/admin', icon: <Home size={16} /> },
      { label: 'Users', href: '/admin/users', icon: <Users size={16} /> },
      { label: 'Listings', href: '/admin/listings', icon: <Building size={16} /> },
      { label: 'Landlords', href: '/admin/landlords', icon: <User size={16} /> },
      { label: 'Reports', href: '/admin/reports', icon: <AlertTriangle size={16} /> },
      { label: 'Disputes', href: '/admin/disputes', icon: <ShieldAlert size={16} /> },
      { label: 'Claims', href: '/admin/claims', icon: <Award size={16} /> },
      { label: 'Payments', href: '/admin/payments', icon: <Zap size={16} /> },
      { label: 'Audit Log', href: '/admin/audit-log', icon: <FileText size={16} /> },
      { label: 'Settings', href: '/admin/config', icon: <Settings size={16} /> },
    ];
  }

  if (role === 'landlord' || role === 'lister') {
    return [
      { label: 'Dashboard', href: '/landlord/dashboard', icon: <Home size={16} /> },
      { label: 'My Listings', href: '/landlord/listings', icon: <Building size={16} /> },
      { label: 'Inquiries', href: '/landlord/inquiries', icon: <MessageCircle size={16} /> },
      { label: 'Tenants', href: '/landlord/tenants', icon: <Users size={16} /> },
      { label: 'Earnings', href: '/landlord/payments', icon: <Zap size={16} /> },
      { label: 'Settings', href: '/profile', icon: <User size={16} /> },
    ];
  }

  if (role === 'dalali') {
    return [
      { label: 'Dashboard', href: '/dalali/dashboard', icon: <Home size={16} /> },
      { label: 'Properties', href: '/dalali/properties', icon: <Building size={16} /> },
      { label: 'Inquiries', href: '/dalali/inquiries', icon: <MessageCircle size={16} /> },
      { label: 'Earnings', href: '/dalali/earnings', icon: <Zap size={16} /> },
      { label: 'Subscription', href: '/dalali/subscription', icon: <Award size={16} /> },
      { label: 'Profile', href: '/profile', icon: <User size={16} /> },
    ];
  }

  return [
    { label: 'Dashboard', href: '/tenant/dashboard', icon: <Home size={16} /> },
    { label: 'Search', href: '/tenant/search', icon: <Search size={16} /> },
    { label: 'My Room', href: '/my-room', icon: <Building size={16} /> },
    { label: 'Saved', href: '/tenant/saved', icon: <Heart size={16} /> },
    { label: 'Messages', href: '/messages', icon: <MessageCircle size={16} /> },
    { label: 'Bookings', href: '/bookings', icon: <Calendar size={16} /> },
    { label: 'Profile', href: '/profile', icon: <User size={16} /> },
  ];
};

const getAccentColor = (role: string) => {
  if (role === 'admin') return 'var(--red)';
  if (role === 'landlord' || role === 'lister') return 'var(--orange)';
  if (role === 'dalali') return 'var(--purple)';
  return '#1D9E75';
};

const getPageTitle = (pathname: string): string => {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return 'Dashboard';

  const lastPart = parts[parts.length - 1];
  if (lastPart === 'dashboard' || lastPart === 'admin') return 'Dashboard';

  if (parts[0] === 'messages' && parts.length > 1) {
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parts[1])
    ) {
      return 'My Messages';
    }
  }
  if (parts[0] === 'messages' && parts.length === 1) {
    return 'My Messages';
  }

  return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace('-', ' ');
};

interface RoleBasedSidebarContentProps {
  accentColor: string;
  activeRole: Role;
  navItems: NavItem[];
  userInitials: string;
  displayName: string;
  pathname: string;
  onNavClick: () => void;
  onLogout: () => void | Promise<void>;
}

function RoleBasedSidebarContent({
  accentColor,
  activeRole,
  navItems,
  userInitials,
  displayName,
  pathname,
  onNavClick,
  onLogout,
}: RoleBasedSidebarContentProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              color: 'var(--ink)',
              fontSize: '1.1rem',
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            Campus<span style={{ color: accentColor }}>Stay</span>
          </span>
        </div>
      </div>

      <div
        style={{
          padding: '1rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.7rem',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${accentColor}33, ${accentColor}66)`,
            display: 'grid',
            placeItems: 'center',
            color: accentColor,
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '0.88rem',
            flexShrink: 0,
          }}
        >
          {userInitials}
        </div>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontWeight: 600,
              fontSize: '0.9rem',
              color: 'var(--ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </p>
          <RoleBadge role={activeRole} size="sm" />
        </div>
      </div>

      <nav style={{ flex: 1, padding: '0.6rem 0.5rem', overflow: 'auto' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.15rem' }}>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href) && item.href !== '/admin');

            const isReallyActive =
              item.href === '/admin' ? pathname === '/admin' : isActive;

            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={onNavClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.58rem 0.75rem',
                    borderRadius: 10,
                    fontSize: '0.88rem',
                    fontWeight: isReallyActive ? 700 : 500,
                    color: isReallyActive ? accentColor : 'var(--mid)',
                    background: isReallyActive ? `${accentColor}12` : 'transparent',
                    textDecoration: 'none',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  <span style={{ flexShrink: 0, opacity: isReallyActive ? 1 : 0.7 }}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={() => void onLogout()}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.52rem 0.75rem',
            borderRadius: 10,
            border: 'none',
            background: 'transparent',
            color: 'var(--mid)',
            cursor: 'pointer',
            fontSize: '0.86rem',
            fontWeight: 500,
          }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function RoleBasedLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentLanguage = i18n.language || 'en';

  useEffect(() => {
    if (!i18n.language || i18n.language === 'sw') {
      i18n.changeLanguage('en');
    }
  }, [i18n]);

  const activeRole = (user?.role || 'student') as Role;
  const accentColor = getAccentColor(activeRole);
  const navItems = getNavItems(activeRole);
  const pageTitle = getPageTitle(location.pathname);
  const userInitials = initials(user?.fullName ?? '');

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const toggleLanguage = () => {
    const newLang = currentLanguage === 'en' ? 'sw' : 'en';
    i18n.changeLanguage(newLang);
  };

  const sidebarProps: RoleBasedSidebarContentProps = {
    accentColor,
    activeRole,
    navItems,
    userInitials,
    displayName: user?.fullName || 'User',
    pathname: location.pathname,
    onNavClick: () => setSidebarOpen(false),
    onLogout: handleLogout,
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--paper)',
      }}
    >
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'none',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          zIndex: 50,
        }}
        className="dashboard-sidebar"
      >
        <RoleBasedSidebarContent {...sidebarProps} />
      </aside>

      {sidebarOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 98,
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          />
          <aside
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              width: 240,
              background: 'var(--surface)',
              borderRight: '1px solid var(--border)',
              zIndex: 99,
              overflowY: 'auto',
            }}
          >
            <RoleBasedSidebarContent {...sidebarProps} />
          </aside>
        </>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            background: 'rgba(247,244,238,0.95)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid var(--border)',
            padding: '0 1rem',
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="dashboard-hamburger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                color: 'var(--ink)',
                display: 'none',
              }}
            >
              <Menu size={20} />
            </button>
            <h1
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--ink)',
              }}
            >
              {pageTitle}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label="Change language"
              title={currentLanguage === 'en' ? 'Switch to Swahili' : 'Switch to English'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.6rem',
                borderRadius: 20,
                border: '1px solid var(--border)',
                background: '#fff',
                color: 'var(--mid)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = accentColor;
                e.currentTarget.style.color = accentColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--mid)';
              }}
            >
              <Globe size={14} />
              <span style={{ textTransform: 'uppercase' }}>{currentLanguage}</span>
            </button>

            <Link
              to="/notifications"
              aria-label="Notifications"
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid var(--border)',
                background: '#fff',
                color: 'var(--mid)',
              }}
            >
              <Bell size={16} />
            </Link>
          </div>
        </header>

        <main
          style={{
            flex: 1,
            padding: '1.25rem 1rem 5rem',
            maxWidth: 1100,
            width: '100%',
            margin: '0 auto',
          }}
        >
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .dashboard-sidebar { display: flex !important; }
          .dashboard-hamburger { display: none !important; }
        }
        @media (max-width: 767px) {
          .dashboard-hamburger { display: grid !important; }
        }
      `}</style>
    </div>
  );
}
