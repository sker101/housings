import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
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
  LayoutGrid,
} from 'lucide-react';
import topImage from '../images/modern-home-exterior-with-landscaping-driveway.jpg';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { 
  parseRolesFromProfile, 
  getActiveRole, 
  humanizeRole,
  deriveRoleFromPath 
} from '../lib/roles';
import { selectRows } from '../lib/supabase';
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
      { label: 'Dashboard', href: '/admin', icon: <Home size={16} /> },
      { label: 'All Users', href: '/admin/users', icon: <Users size={16} /> },
      { label: 'Listings', href: '/admin/listings', icon: <Building size={16} /> },
      { label: 'Hosts & PMs', href: '/admin/landlords', icon: <User size={16} /> },
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
      { label: 'My Listings', href: '/landlord/properties', icon: <Building size={16} /> },
      { label: 'Inquiries', href: '/landlord/inquiries', icon: <MessageCircle size={16} /> },
      { label: 'Tenants', href: '/landlord/tenants', icon: <Users size={16} /> },
      { label: 'Earnings', href: '/landlord/payments', icon: <Zap size={16} /> },
      { label: 'Settings', href: '/profile', icon: <User size={16} /> },
    ];
  }

  if (role === 'property_manager') {
    return [
      { label: 'Dashboard', href: '/manager/dashboard', icon: <Home size={16} /> },
      { label: 'Properties', href: '/manager/properties', icon: <Building size={16} /> },
      { label: 'Inquiries', href: '/manager/inquiries', icon: <MessageCircle size={16} /> },
      { label: 'Earnings', href: '/manager/earnings', icon: <Zap size={16} /> },
      { label: 'Subscription', href: '/manager/subscription', icon: <Award size={16} /> },
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
  if (role === 'property_manager' || role === 'dalali') return 'var(--purple)';
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
  onSwitchRole: (role: string) => void;
  user: any;
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
  onSwitchRole,
  user,
}: RoleBasedSidebarContentProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
        <Link 
          to="/" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            textDecoration: 'none',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <img src="/icon-192.png" alt="" style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '6px' }} />
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 800,
              color: 'var(--ink)',
              fontSize: '1.25rem',
              letterSpacing: '-0.03em',
              whiteSpace: 'nowrap',
            }}
          >
            i<span style={{ color: accentColor }}>Rent</span>
          </span>
        </Link>
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
            fontFamily: " sans-serif",
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

      {/* Role Switcher (Only for multi-role users, excluding Admins) */}
      {user && user.roles.filter(r => r !== 'admin').length > 1 && (
        <div style={{ padding: '0 0.75rem 0.75rem', display: 'grid', gap: '0.4rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', paddingLeft: '0.75rem', marginBottom: '0.1rem' }}>
            Switch Account
          </p>
          <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--paper)', padding: '0.25rem', borderRadius: 10, border: '1px solid var(--border)' }}>
            {user.roles.filter(r => r !== 'admin').map(r => {
              const isActive = r === activeRole;
              const roleColor = getAccentColor(r);
              return (
                <button
                  key={r}
                  onClick={() => {
                    if (onSwitchRole) onSwitchRole(r);
                  }}
                  title={`Switch to ${humanizeRole(r)}`}
                  style={{
                    flex: 1,
                    padding: '0.4rem 0',
                    borderRadius: 8,
                    border: 'none',
                    background: isActive ? 'var(--surface)' : 'transparent',
                    color: isActive ? roleColor : 'var(--mid)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {r === 'tenant' ? <User size={12} /> : r === 'property_manager' ? <Users size={12} /> : <Building size={12} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
  const { user, profile, token, isAuthenticated, logout, switchRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLogoActive, setIsLogoActive] = useState(false);
  const [isHamburgerActive, setIsHamburgerActive] = useState(false);
  const [isLangActive, setIsLangActive] = useState(false);
  const [isNotifActive, setIsNotifActive] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);

  // Poll for unread chat messages
  useEffect(() => {
    let mounted = true;
    async function loadUnreadCount() {
      if (!isAuthenticated || !user?.userId || !token) {
        if (mounted) { setUnreadCount(0); }
        return;
      }
      if (user.role === 'admin') return;
      try {
        const filterCol = user.role === 'tenant' ? 'tenant_id' : 'landlord_id';
        const conversations = await selectRows('room_inquiries', {
          select: 'id',
          filters: [
            { column: filterCol, op: 'eq', value: user.userId }
          ],
          limit: 500,
          accessToken: token
        });
        const conversationIds = conversations.map((item) => item.id).filter(Boolean);
        if (conversationIds.length === 0) {
          if (mounted) { setUnreadCount(0); }
          return;
        }
        const unreadRows = await selectRows('chat_messages', {
          select: 'id',
          filters: [
            { column: 'inquiry_id', op: 'in', value: `(${conversationIds.join(',')})` },
            { column: 'sender_id', op: 'neq', value: user.userId },
            { column: 'is_read', op: 'eq', value: 'false' }
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
  }, [isAuthenticated, token, user?.userId, user?.role]);

  // Poll for unread notifications
  useEffect(() => {
    let mounted = true;
    async function loadNotifCount() {
      if (!isAuthenticated || !user?.userId || !token) { setNotifCount(0); return; }
      if (user.role === 'admin') return;
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

  const currentLanguage = i18n.language || 'en';

  useEffect(() => {
    if (!i18n.language || i18n.language === 'sw') {
      i18n.changeLanguage('en');
    }
  }, [i18n]);

  // Reset notification active state when navigating away from notifications
  useEffect(() => {
    if (!location.pathname.includes('/notifications')) {
      setIsNotifActive(false);
    }
  }, [location.pathname]);

  const allRoles = parseRolesFromProfile(profile);
  const activeRole = (deriveRoleFromPath(location.pathname, allRoles) || getActiveRole(allRoles)) as Role;
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
    onNavClick: () => {
      setSidebarOpen(false);
      setIsHamburgerActive(false);
    },
    onLogout: handleLogout,
    onSwitchRole: switchRole,
    user,
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100dvh',
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
          height: '100dvh',
          overflowY: 'auto',
          zIndex: 50,
        }}
        className="dashboard-sidebar"
      >
        <RoleBasedSidebarContent {...sidebarProps} />
      </aside>

      <>
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => {
            setSidebarOpen(false);
            setIsHamburgerActive(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 98,
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            opacity: sidebarOpen ? 1 : 0,
            pointerEvents: sidebarOpen ? 'auto' : 'none',
            transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.35s cubic-bezier(0.34, 0.8, 0.64, 1)',
          }}
        >
          <RoleBasedSidebarContent {...sidebarProps} />
        </aside>
      </>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* ROW 1: IMAGE BANNER */}
        <div
          style={{
            overflow: 'hidden',
            position: 'relative',
            minHeight: '35px',
            height: 'auto',
            backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.4)), url("${topImage}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid var(--border)',
            borderRadius: 0
          }}
        >
          <div style={{ 
            width: '100%',
            maxWidth: '1200px',
            padding: '0.35rem 1rem', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '0.75rem'
          }}>
            {/* iRent Logo - Left Side */}
            <button
              type="button"
              className={`topbar-action-btn ${isLogoActive ? 'is-active' : ''}`}
              onClick={() => {
                setIsLogoActive(!isLogoActive);
                navigate('/');
              }}
              style={{ display: 'flex', alignItems: 'center', marginLeft: '-0.5rem', padding: 0, background: 'transparent', border: 'none' }}
            >
              <img 
                src="/irent%20logo%20white%20(2).png" 
                alt="iRent" 
                style={{
                  width: 'clamp(50px, 10vw, 70px)',
                  height: 'auto',
                  objectFit: 'contain'
                }}
              />
            </button>
            {/* Text Content */}
            <div style={{ textAlign: 'center', marginLeft: '0.5rem' }}>
              <h2 style={{ 
                color: '#fff', 
                fontSize: 'clamp(0.9rem, 3vw, 1.25rem)', 
                fontWeight: 700, 
                margin: '0 0 0.15rem', 
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                lineHeight: 1.2
              }}>
                Tanzania's #1 Rental Platform
              </h2>
              <p style={{ 
                color: 'rgba(255,255,255,0.9)', 
                fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', 
                fontWeight: 500, 
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                margin: 0,
                lineHeight: 1.3
              }}>
                Browse verified listings, connect with verified landlords.
              </p>
            </div>
          </div>
        </div>

        {/* ROW 2: DASHBOARD NAVBAR */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            background: 'rgba(255,255,255,0.95)',
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
              className={`dashboard-hamburger topbar-action-btn ${isHamburgerActive ? 'is-active' : ''}`}
              onClick={() => {
                setSidebarOpen(true);
                setIsHamburgerActive(!isHamburgerActive);
              }}
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
                fontFamily: " sans-serif",
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
              className={`topbar-action-btn ${isLangActive ? 'is-active' : ''}`}
              onClick={() => {
                toggleLanguage();
                setIsLangActive(!isLangActive);
              }}
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
              className={`topbar-action-btn ${isNotifActive ? 'is-active' : ''}`}
              onClick={() => setIsNotifActive(true)}
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid var(--border)',
                background: '#fff',
                color: 'var(--mid)',
                textDecoration: 'none',
              }}
            >
              <Bell size={16} />
            </Link>
          </div>
        </header>

        <main
          style={{
            flex: 1,
            padding: '1.25rem 1rem',
            paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
            maxWidth: 1100,
            width: '100%',
            margin: '0 auto',
          }}
        >
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation - Only visible on mobile */}
        <div className="mobile-bottom-nav-container">
          <nav className="mobile-bottom-menu-bar">
            {activeRole === 'tenant' ? (
              <>
                <NavLink
                  to="/tenant/dashboard"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <LayoutGrid size={22} />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/tenant/search"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <Search size={22} />
                  <span>Search</span>
                </NavLink>

                <NavLink
                  to="/tenant/saved"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <Heart size={22} />
                  <span>Wishlist</span>
                </NavLink>

                <NavLink
                  to="/messages"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <MessageCircle size={22} />
                  <span>Messages</span>
                  {unreadCount > 0 && <span className="mobile-bottom-nav-badge">{unreadCount}</span>}
                </NavLink>

                <NavLink
                  to="/profile"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <User size={22} />
                  <span>Profile</span>
                </NavLink>
              </>
            ) : (activeRole as string) === 'landlord' || (activeRole as string) === 'lister' ? (
              <>
                <NavLink
                  to="/landlord/dashboard"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <LayoutGrid size={22} />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/landlord/properties"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <Building size={22} />
                  <span>Properties</span>
                </NavLink>

                <NavLink
                  to="/landlord/inquiries"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <MessageCircle size={22} />
                  <span>Inquiries</span>
                  {unreadCount > 0 && <span className="mobile-bottom-nav-badge">{unreadCount}</span>}
                </NavLink>

                <NavLink
                  to="/landlord/payments"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <Zap size={22} />
                  <span>Earnings</span>
                </NavLink>

                <NavLink
                  to="/profile"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <User size={22} />
                  <span>Profile</span>
                </NavLink>
              </>
            ) : activeRole === 'property_manager' ? (
              <>
                <NavLink
                  to="/manager/dashboard"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <LayoutGrid size={22} />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/manager/properties"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <Building size={22} />
                  <span>Properties</span>
                </NavLink>

                <NavLink
                  to="/manager/inquiries"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <MessageCircle size={22} />
                  <span>Inquiries</span>
                  {unreadCount > 0 && <span className="mobile-bottom-nav-badge">{unreadCount}</span>}
                </NavLink>

                <NavLink
                  to="/manager/earnings"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <Zap size={22} />
                  <span>Earnings</span>
                </NavLink>

                <NavLink
                  to="/profile"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <User size={22} />
                  <span>Profile</span>
                </NavLink>
              </>
            ) : activeRole === 'admin' ? (
              <>
                <NavLink
                  to="/admin"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <LayoutGrid size={22} />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/admin/users"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <Users size={22} />
                  <span>Users</span>
                </NavLink>

                <NavLink
                  to="/admin/listings"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <Building size={22} />
                  <span>Listings</span>
                </NavLink>

                <NavLink
                  to="/admin/reports"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <AlertTriangle size={22} />
                  <span>Reports</span>
                </NavLink>

                <NavLink
                  to="/profile"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <User size={22} />
                  <span>Profile</span>
                </NavLink>
              </>
            ) : (
              <>
                <NavLink
                  to="/"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <Home size={22} />
                  <span>Home</span>
                </NavLink>

                <NavLink
                  to="/profile"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <User size={22} />
                  <span>Profile</span>
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .dashboard-sidebar { 
            display: flex !important; 
            animation: sidebarSlideIn 0.35s cubic-bezier(0.34, 0.8, 0.64, 1);
          }
          .dashboard-hamburger { display: none !important; }
        }
        @media (max-width: 767px) {
          .dashboard-hamburger { display: grid !important; }
        }
        @keyframes sidebarSlideIn {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
