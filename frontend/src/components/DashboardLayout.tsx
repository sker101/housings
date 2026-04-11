import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './RoleBadge';
import { initials } from '../utils/format';
import type { Role } from '../types';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface DashboardLayoutProps {
  role: Role;
  accentColor: string;
  navItems: NavItem[];
  pageTitle: string;
  children: React.ReactNode;
  upgradeCTA?: { label: string; href: string } | null;
}

interface DashboardSidebarContentProps {
  accentColor: string;
  role: Role;
  navItems: NavItem[];
  upgradeCTA: DashboardLayoutProps['upgradeCTA'];
  userInitials: string;
  displayName: string;
  pathname: string;
  onNavClick: () => void;
  onLogout: () => void | Promise<void>;
}

function DashboardSidebarContent({
  accentColor,
  role,
  navItems,
  upgradeCTA,
  userInitials,
  displayName,
  pathname,
  onNavClick,
  onLogout,
}: DashboardSidebarContentProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '1.2rem 1rem', borderBottom: '1px solid var(--border)' }}>
        <Link
          to="/"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: `linear-gradient(140deg, ${accentColor}, ${accentColor}cc)`,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 800,
              fontFamily: "'Syne', sans-serif",
            }}
          >
            CS
          </div>
          <span
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              color: 'var(--ink)',
              fontSize: '1rem',
            }}
          >
            Campus<span style={{ color: accentColor }}>Stay</span>
          </span>
        </Link>
      </div>

      {/* User Info */}
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
          <RoleBadge role={role} size="sm" />
        </div>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '0.6rem 0.5rem', overflow: 'auto' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.15rem' }}>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
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
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? accentColor : 'var(--mid)',
                    background: isActive ? `${accentColor}12` : 'transparent',
                    textDecoration: 'none',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Upgrade CTA (hidden for admin) */}
      {upgradeCTA && role !== 'admin' && (
        <div style={{ padding: '0.75rem' }}>
          <Link
            to={upgradeCTA.href}
            style={{
              display: 'block',
              textAlign: 'center',
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
              color: '#fff',
              borderRadius: 10,
              padding: '0.6rem',
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: '0.84rem',
              textDecoration: 'none',
            }}
          >
            {upgradeCTA.label}
          </Link>
        </div>
      )}

      {/* Logout */}
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

export default function DashboardLayout({
  role,
  accentColor,
  navItems,
  pageTitle,
  children,
  upgradeCTA = null,
}: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const userInitials = initials(user?.fullName ?? '');
  const sidebarProps: DashboardSidebarContentProps = {
    accentColor,
    role,
    navItems,
    upgradeCTA,
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
      {/* ── Desktop Sidebar ─────────────────────────────── */}
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
        }}
        className="dashboard-sidebar"
      >
        <DashboardSidebarContent {...sidebarProps} />
      </aside>

      {/* ── Mobile Sidebar Overlay ───────────────────────── */}
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
            <DashboardSidebarContent {...sidebarProps} />
          </aside>
        </>
      )}

      {/* ── Main ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
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
            {/* Mobile hamburger */}
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

        {/* Page Content */}
        <main style={{ flex: 1, padding: '1.25rem 1rem 5rem', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>

      {/* ── Responsive Styles ───────────────────────────── */}
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
