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

const mobileHideStyle = `
  @media (max-width: 768px) {
    .admin-sidebar-desktop {
      display: none !important;
    }
  }
`;

interface AdminSidebarProps {
    isCollapsed?: boolean;
    mobileDrawerOpen?: boolean;
    onMobileDrawerClose?: () => void;
}

export default function AdminSidebar({
    isCollapsed = false,
    mobileDrawerOpen = false,
    onMobileDrawerClose,
}: AdminSidebarProps) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab') || 'overview';
    const isBaseAdminPath = location.pathname === '/admin' || location.pathname === '/admin/';
    const [visible, setVisible] = useState(false);

    // Staggered fade-in on mount
    useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t); }, []);

    const initials = (user?.fullName ?? 'A').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    const SECTIONS = [
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} />, group: 'main', path: '/admin?tab=overview' },
        { id: 'users', label: 'Users', icon: <Users size={18} />, group: 'main', path: '/admin?tab=users' },
        { id: 'listings', label: 'Listings', icon: <Home size={18} />, group: 'main', path: '/admin?tab=listings' },
        { id: 'bookings', label: 'Bookings', icon: <ClipboardList size={18} />, group: 'main', path: '/admin?tab=bookings' },
        { id: 'reports', label: 'Reports', icon: <Flag size={18} />, group: 'main', path: '/admin?tab=reports' },
        { id: 'reviews', label: 'Reviews', icon: <Star size={18} />, group: 'main', path: '/admin?tab=reviews' },
        { id: 'notifications', label: 'Notify', icon: <BellRing size={18} />, group: 'main', path: '/admin?tab=notifications' },
        { id: 'settings', label: 'Settings', icon: <Settings size={18} />, group: 'main', path: '/admin?tab=settings' },
    ];

    const MODERATION = [
        { id: 'queue_listers', label: 'Dalali Verification', icon: <UserPlus size={18} />, path: '/admin/landlords' },
        { id: 'queue_listings', label: 'Listings Queue', icon: <Building size={18} />, path: '/admin/listings' },
        { id: 'queue_reports', label: 'Reports Queue', icon: <Flag size={18} />, path: '/admin/reports' },
        { id: 'queue_claims', label: 'Claims Queue', icon: <ShieldAlert size={18} />, path: '/admin/claims' },
        { id: 'audit_log', label: 'Audit Log', icon: <BookOpen size={18} />, path: '/admin/audit-log' },
    ];

    const desktop = (
        <aside
            className="admin-sidebar-desktop"
            style={{
                width: isCollapsed ? 70 : 240,
                flexShrink: 0,
                background: WHITE,
                borderRight: `1px solid ${BORDER}`,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                fontFamily: FONT,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-12px)',
                transition: 'width 0.3s ease, opacity 0.4s ease, transform 0.4s ease',
            }}
        >
            {/* Profile block */}
            <div style={{ padding: isCollapsed ? '1.5rem 0' : '1.5rem 1.25rem 1rem', borderBottom: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', alignItems: isCollapsed ? 'center' : 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '0.75rem', marginBottom: isCollapsed ? 0 : '0.5rem' }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 50,
                        background: `linear-gradient(135deg, ${TEAL}, #14b8a6)`,
                        color: WHITE, fontWeight: 800, fontSize: '0.95rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }} title={user?.fullName ?? 'Admin'}>
                        {initials}
                    </div>
                    {!isCollapsed && (
                        <div style={{ minWidth: 0, opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s ease' }}>
                            <p style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user?.fullName ?? 'Admin'}
                            </p>
                            <p style={{ fontSize: '0.73rem', color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                System Maintainer
                            </p>
                        </div>
                    )}
                </div>
                {!isCollapsed && (
                    <span style={{
                        display: 'inline-block',
                        background: TEAL_L, color: TEAL, alignSelf: 'flex-start',
                        fontSize: '0.65rem', fontWeight: 700,
                        borderRadius: 999, padding: '0.15rem 0.55rem',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                        Superuser
                    </span>
                )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {/* Dashboard Sections */}
                <p style={{
                    fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: MUTED,
                    padding: isCollapsed ? '1.25rem 0 0.5rem' : '1.25rem 1.25rem 0.5rem',
                    textAlign: isCollapsed ? 'center' : 'left',
                    width: '100%',
                    opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease 0.1s'
                }}>
                    {isCollapsed ? '•••' : 'Dashboard'}
                </p>

                <nav style={{ padding: '0.25rem 0' }}>
                    {SECTIONS.map((item, i) => {
                        const isActive = isBaseAdminPath && currentTab === item.id;
                        return (
                            <NavLink
                                key={item.id}
                                to={item.path}
                                title={isCollapsed ? item.label : undefined}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '0.65rem',
                                    padding: isCollapsed ? '0.62rem 0' : '0.58rem 1rem 0.58rem 1.25rem',
                                    margin: isCollapsed ? '0.35rem 0' : '0.05rem 0',
                                    color: isActive ? TEAL : '#374151',
                                    background: isActive ? TEAL_L : 'transparent',
                                    borderLeft: isActive ? `3px solid ${TEAL}` : '3px solid transparent',
                                    textDecoration: 'none',
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: '0.87rem',
                                    borderRadius: isCollapsed ? '0' : '0 8px 8px 0',
                                    marginRight: isCollapsed ? '0' : '0.5rem',
                                    transition: 'all 0.15s',
                                    opacity: visible ? 1 : 0,
                                    transform: visible ? 'translateX(0)' : 'translateX(-8px)',
                                    transitionDelay: `${0.04 * i}s`,
                                }}
                            >
                                <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {React.cloneElement(item.icon, { size: isCollapsed ? 22 : 18 })}
                                </span>
                                {!isCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Moderation Sections */}
                <p style={{
                    fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: MUTED,
                    padding: isCollapsed ? '1rem 0 0.5rem' : '1rem 1.25rem 0.5rem',
                    textAlign: isCollapsed ? 'center' : 'left',
                    width: '100%', borderTop: `1px solid ${BORDER}`, marginTop: '0.5rem',
                    opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease 0.3s'
                }}>
                    {isCollapsed ? '•••' : 'Moderation Widgets'}
                </p>

                <nav style={{ padding: '0.25rem 0' }}>
                    {MODERATION.map((item, i) => {
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <NavLink
                                key={item.id}
                                to={item.path}
                                title={isCollapsed ? item.label : undefined}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '0.65rem',
                                    padding: isCollapsed ? '0.62rem 0' : '0.58rem 1rem 0.58rem 1.25rem',
                                    margin: isCollapsed ? '0.35rem 0' : '0.05rem 0',
                                    color: isActive ? TEAL : '#374151',
                                    background: isActive ? TEAL_L : 'transparent',
                                    borderLeft: isActive ? `3px solid ${TEAL}` : '3px solid transparent',
                                    textDecoration: 'none',
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: '0.87rem',
                                    borderRadius: isCollapsed ? '0' : '0 8px 8px 0',
                                    marginRight: isCollapsed ? '0' : '0.5rem',
                                    transition: 'all 0.15s',
                                    opacity: visible ? 1 : 0,
                                    transform: visible ? 'translateX(0)' : 'translateX(-8px)',
                                    transitionDelay: `${0.04 * (i + SECTIONS.length)}s`,
                                }}
                            >
                                <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {React.cloneElement(item.icon, { size: isCollapsed ? 22 : 18 })}
                                </span>
                                {!isCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                            </NavLink>
                        );
                    })}
                </nav>
            </div>

            {/* Help & Logout */}
            <div style={{ padding: isCollapsed ? '0 0 1.25rem' : '0 0.75rem 1.25rem', marginTop: 'auto', borderTop: `1px solid ${BORDER}`, paddingTop: '0.75rem' }}>
                <button
                    type="button"
                    title={isCollapsed ? 'Admin Help' : undefined}
                    onClick={() => window.location.href = 'mailto:support@campusstay.co.tz'}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '0.5rem',
                        width: '100%', padding: isCollapsed ? '0.62rem 0' : '0.5rem 0.75rem',
                        background: 'transparent', border: 'none',
                        cursor: 'pointer', color: MUTED,
                        fontSize: '0.83rem', fontFamily: FONT, borderRadius: isCollapsed ? 0 : 8,
                        transition: 'background 0.15s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    onFocus={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onBlur={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                    <HelpCircle size={15} /> {!isCollapsed && <span style={{ opacity: isCollapsed ? 0 : 1 }}>Admin Help</span>}
                </button>
                <button
                    type="button"
                    title={isCollapsed ? 'Sign Out' : undefined}
                    onClick={logout}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '0.5rem',
                        width: '100%', padding: isCollapsed ? '0.62rem 0' : '0.5rem 0.75rem',
                        background: 'transparent', border: 'none',
                        cursor: 'pointer', color: CORAL,
                        fontSize: '0.83rem', fontFamily: FONT, borderRadius: isCollapsed ? 0 : 8,
                        transition: 'background 0.15s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = CORAL_L)}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    onFocus={(e) => (e.currentTarget.style.background = CORAL_L)}
                    onBlur={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                    <LogOut size={15} /> {!isCollapsed && <span style={{ opacity: isCollapsed ? 0 : 1 }}>Sign Out</span>}
                </button>
            </div>
        </aside>
    );

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Poppins:wght@400;500;700&display=swap');
        .admin-sidebar-desktop { display: flex !important; }
        .admin-sidebar-mobile  { display: none !important; }
        @media (max-width: 919px) {
          .admin-sidebar-desktop { display: none !important; }
          .admin-sidebar-mobile  {
            display: flex !important;
            flex-direction: column;
          }
        }
      `}</style>
            {desktop}
            
            {/* Mobile Drawer Overlay */}
            {mobileDrawerOpen && (
              <div
                className="mobile-drawer-backdrop"
                onClick={onMobileDrawerClose}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.25)',
                  zIndex: 1000,
                  transition: 'opacity 0.3s ease',
                  opacity: mobileDrawerOpen ? 1 : 0,
                  pointerEvents: mobileDrawerOpen ? 'auto' : 'none'
                }}
              />
            )}

            {/* Mobile Drawer */}
            <aside
              className="admin-sidebar-mobile"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: 280,
                background: WHITE,
                boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
                zIndex: 1001,
                fontFamily: FONT,
                transform: mobileDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              {/* Close Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: `1px solid ${BORDER}` }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Admin Menu</h3>
                <button
                  onClick={onMobileDrawerClose}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Profile block */}
              <div style={{ padding: '1rem', borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 50,
                    background: `linear-gradient(135deg, ${TEAL}, #14b8a6)`,
                    color: WHITE, fontWeight: 800, fontSize: '0.9rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 2, margin: 0 }}>
                      {user?.fullName ?? 'Admin'}
                    </p>
                    <span style={{
                      display: 'inline-block',
                      background: TEAL_L, color: TEAL, alignSelf: 'flex-start',
                      fontSize: '0.65rem', fontWeight: 700,
                      borderRadius: 999, padding: '0.15rem 0.55rem',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      Superuser
                    </span>
                  </div>
                </div>
              </div>

              {/* Dashboard Sections */}
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                <p style={{
                  fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: MUTED,
                  padding: '1rem 1rem 0.5rem',
                  margin: 0,
                }}>
                  Dashboard
                </p>

                <nav>
                  {SECTIONS.map((item) => {
                    const isActive = isBaseAdminPath && currentTab === item.id;
                    return (
                      <NavLink
                        key={item.id}
                        to={item.path}
                        onClick={onMobileDrawerClose}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.65rem',
                          padding: '0.58rem 1.25rem',
                          color: isActive ? TEAL : '#374151',
                          background: isActive ? TEAL_L : 'transparent',
                          borderLeft: isActive ? `3px solid ${TEAL}` : '3px solid transparent',
                          textDecoration: 'none',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '0.87rem',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {React.cloneElement(item.icon, { size: 18 })}
                        </span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>

                {/* Moderation Sections */}
                <p style={{
                  fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: MUTED,
                  padding: '1rem 1rem 0.5rem',
                  margin: 0,
                  borderTop: `1px solid ${BORDER}`,
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
                          display: 'flex', alignItems: 'center', gap: '0.65rem',
                          padding: '0.58rem 1.25rem',
                          color: isActive ? TEAL : '#374151',
                          background: isActive ? TEAL_L : 'transparent',
                          borderLeft: isActive ? `3px solid ${TEAL}` : '3px solid transparent',
                          textDecoration: 'none',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '0.87rem',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {React.cloneElement(item.icon, { size: 18 })}
                        </span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              {/* Help & Logout */}
              <div style={{ padding: '0.75rem', marginTop: 'auto', borderTop: `1px solid ${BORDER}`, paddingTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => window.location.href = 'mailto:support@campusstay.co.tz'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    width: '100%', padding: '0.5rem 0.75rem',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', color: MUTED,
                    fontSize: '0.83rem', fontFamily: FONT, borderRadius: 8,
                    transition: 'background 0.15s',
                    marginBottom: '0.5rem'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <HelpCircle size={15} /> Admin Help
                </button>
                <button
                  type="button"
                  onClick={logout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    width: '100%', padding: '0.5rem 0.75rem',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', color: CORAL,
                    fontSize: '0.83rem', fontFamily: FONT, borderRadius: 8,
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = CORAL_L)}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </aside>
        </>
    );
}
