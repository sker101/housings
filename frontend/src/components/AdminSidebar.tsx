import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, Home, ClipboardList, Flag, Star, BellRing, Settings,
    UserPlus, Building, ShieldAlert, BookOpen, LogOut, HelpCircle, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Design tokens ──────────────────────────────────────────────────────────
const TEAL = '#0d7a6e';
const TEAL_L = '#e6f7f5';
const CORAL = '#e8550a';
const CORAL_L = '#fff1ec';
const MUTED = '#6b7280';
const BORDER = '#e2e8f0';
const WHITE = '#ffffff';

const FONT = "'Nunito', 'Poppins', system-ui, sans-serif";

interface AdminSidebarProps {
    isCollapsed?: boolean; // Kept for backwards prop compatibility during transition
    mobileDrawerOpen?: boolean;
    onMobileDrawerClose?: () => void;
}

export default function AdminSidebar({
    mobileDrawerOpen = false,
    onMobileDrawerClose,
}: AdminSidebarProps) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab') || 'overview';
    const isBaseAdminPath = location.pathname === '/admin' || location.pathname === '/admin/';
    
    const initials = (user?.fullName ?? 'A').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    const SECTIONS = [
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={14} />, group: 'main', path: '/admin?tab=overview' },
        { id: 'users', label: 'Users', icon: <Users size={14} />, group: 'main', path: '/admin?tab=users' },
        { id: 'listings', label: 'Listings', icon: <Home size={14} />, group: 'main', path: '/admin?tab=listings' },
        { id: 'bookings', label: 'Bookings', icon: <ClipboardList size={14} />, group: 'main', path: '/admin?tab=bookings' },
        { id: 'reports', label: 'Reports', icon: <Flag size={14} />, group: 'main', path: '/admin?tab=reports' },
        { id: 'reviews', label: 'Reviews', icon: <Star size={14} />, group: 'main', path: '/admin?tab=reviews' },
        { id: 'notifications', label: 'Notify', icon: <BellRing size={14} />, group: 'main', path: '/admin?tab=notifications' },
        { id: 'settings', label: 'Settings', icon: <Settings size={14} />, group: 'main', path: '/admin?tab=settings' },
    ];

    const MODERATION = [
        { id: 'queue_listers', label: 'Dalali Verification', icon: <UserPlus size={14} />, path: '/admin/landlords' },
        { id: 'queue_listings', label: 'Listings Queue', icon: <Building size={14} />, path: '/admin/listings' },
        { id: 'queue_reports', label: 'Reports Queue', icon: <Flag size={14} />, path: '/admin/reports' },
        { id: 'queue_claims', label: 'Claims Queue', icon: <ShieldAlert size={14} />, path: '/admin/claims' },
        { id: 'audit_log', label: 'Audit Log', icon: <BookOpen size={14} />, path: '/admin/audit-log' },
    ];

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Poppins:wght@400;500;700&display=swap');
                /* Responsive adjustment: on small screens drawer touches the edge */
                @media (max-width: 640px) {
                    .admin-floating-drawer {
                        top: 0 !important;
                        left: 0 !important;
                        bottom: 0 !important;
                        border-radius: 0 !important;
                        height: 100vh !important;
                        width: 260px !important;
                    }
                }
            `}</style>
            
            {/* Backdrop Overlay */}
            {mobileDrawerOpen && (
              <div
                className="floating-drawer-backdrop"
                onClick={onMobileDrawerClose}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(3px)',
                  zIndex: 1000,
                  transition: 'opacity 0.25s ease',
                  opacity: mobileDrawerOpen ? 1 : 0,
                  pointerEvents: mobileDrawerOpen ? 'auto' : 'none'
                }}
              />
            )}

            {/* Floating Drawer */}
            <aside
              className="admin-floating-drawer"
              style={{
                position: 'fixed',
                top: 72, // Below the header
                left: 12,
                height: 'calc(100vh - 84px)',
                width: 240, // More compact width
                background: WHITE,
                borderRadius: 16,
                boxShadow: '0 10px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
                zIndex: 1001,
                fontFamily: FONT,
                transform: mobileDrawerOpen ? 'translateX(0) scale(1)' : 'translateX(-120%) scale(0.95)',
                transformOrigin: 'top left',
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s',
                opacity: mobileDrawerOpen ? 1 : 0,
                pointerEvents: mobileDrawerOpen ? 'auto' : 'none',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: \`1px solid \${BORDER}\` }}>
                <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: MUTED }}>Admin Menu</h3>
                <button
                  onClick={onMobileDrawerClose}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: 50, cursor: 'pointer', padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Profile Block */}
              <div style={{ padding: '0.75rem 1rem', borderBottom: \`1px solid \${BORDER}\` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 50,
                    background: \`linear-gradient(135deg, \${TEAL}, #14b8a6)\`,
                    color: WHITE, fontWeight: 800, fontSize: '0.75rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.78rem', marginBottom: 0, margin: 0 }}>
                      {user?.fullName ?? 'Admin'}
                    </p>
                    <span style={{
                      display: 'inline-block',
                      background: TEAL_L, color: TEAL,
                      fontSize: '0.55rem', fontWeight: 800,
                      borderRadius: 4, padding: '0.1rem 0.3rem',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      marginTop: 2
                    }}>
                      Superuser
                    </span>
                  </div>
                </div>
              </div>

              {/* Scrollable Nav Links */}
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0.5rem 0' }}>
                <nav>
                  {SECTIONS.map((item) => {
                    const isActive = isBaseAdminPath && currentTab === item.id;
                    return (
                      <NavLink
                        key={item.id}
                        to={item.path}
                        onClick={onMobileDrawerClose}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.4rem 1rem',
                          margin: '0.15rem 0.6rem',
                          color: isActive ? TEAL : '#475569',
                          background: isActive ? TEAL_L : 'transparent',
                          borderRadius: 8,
                          textDecoration: 'none',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '0.78rem',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isActive ? 1 : 0.6 }}>
                          {item.icon}
                        </span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>

                <p style={{
                  fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: MUTED,
                  padding: '0.75rem 1.2rem 0.25rem',
                  margin: 0,
                  borderTop: \`1px solid \${BORDER}\`,
                  marginTop: '0.5rem',
                }}>
                  Moderation
                </p>

                <nav>
                  {MODERATION.map((item) => {
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                      <NavLink
                        key={item.id}
                        to={item.path}
                        onClick={onMobileDrawerClose}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.4rem 1rem',
                          margin: '0.15rem 0.6rem',
                          color: isActive ? TEAL : '#475569',
                          background: isActive ? TEAL_L : 'transparent',
                          borderRadius: 8,
                          textDecoration: 'none',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '0.78rem',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isActive ? 1 : 0.6 }}>
                          {item.icon}
                        </span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              {/* Help & Logout */}
              <div style={{ padding: '0.5rem', borderTop: \`1px solid \${BORDER}\`, background: '#f8fafc' }}>
                <button
                  type="button"
                  onClick={() => { window.location.href = 'mailto:support@campusstay.co.tz'; if (onMobileDrawerClose) onMobileDrawerClose(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    width: '100%', padding: '0.4rem 0.75rem',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', color: MUTED,
                    fontSize: '0.75rem', fontFamily: FONT, borderRadius: 6,
                    transition: 'background 0.15s',
                    marginBottom: '0.25rem'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <HelpCircle size={14} /> Admin Help
                </button>
                <button
                  type="button"
                  onClick={() => { logout(); if (onMobileDrawerClose) onMobileDrawerClose(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    width: '100%', padding: '0.4rem 0.75rem',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', color: CORAL,
                    fontSize: '0.75rem', fontFamily: FONT, borderRadius: 6,
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = CORAL_L)}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </aside>
        </>
    );
}
