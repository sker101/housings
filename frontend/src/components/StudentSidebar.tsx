import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    Search, Heart, CalendarCheck, MessageSquare,
    Star, Bell, Settings, LogOut, Shield, HelpCircle,
    MapPin, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Design tokens ──────────────────────────────────────────────────────────
const TEAL = '#0d7a6e';
const TEAL_L = '#e6f7f5';
const CORAL = '#e8550a';
const CORAL_L = '#fff1ec';
const AMBER = '#c07a00';
const MUTED = '#6b7280';
const BORDER = '#e2e8f0';
const WHITE = '#ffffff';
const SURF = '#f7fffe';

const FONT = "'Nunito', 'Poppins', system-ui, sans-serif";

// ── Helpers ────────────────────────────────────────────────────────────────
function Badge({ count, color = CORAL }: { count: number; color?: string }) {
    if (!count) return null;
    return (
        <span style={{
            background: color, color: WHITE,
            borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
            padding: '0.1rem 0.45rem', minWidth: 18,
            textAlign: 'center', lineHeight: 1.6, flexShrink: 0,
        }}>
            {count > 99 ? '99+' : count}
        </span>
    );
}

// ── Types ──────────────────────────────────────────────────────────────────
interface Tenancy {
    propertyName: string;
    address: string;
    leaseEndDate: string;
    totalMonths: number;
    remainingMonths: number;
}

interface StudentSidebarProps {
    savedCount?: number;
    activeBookings?: number;
    unreadMessages?: number;
    unreadNotifs?: number;
    tenancy?: Tenancy | null;
    university?: string;
    isCollapsed?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function StudentSidebar({
    savedCount = 0,
    activeBookings = 0,
    unreadMessages = 0,
    unreadNotifs = 0,
    tenancy = null,
    university = '',
    isCollapsed = false,
}: StudentSidebarProps) {
    const { user, logout } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [visible, setVisible] = useState(false);

    // Staggered fade-in on mount
    useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t); }, []);

    const initials = (user?.fullName ?? 'S').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    const uniLabel = university || user?.university || 'University Student';

    type NavItem = {
        to: string;
        icon: React.ReactNode;
        label: string;
        badge?: number;
        meta?: string;
        highlight?: boolean;
    };

    const NAV: NavItem[] = [
        { to: '/search', icon: <Search size={18} />, label: t('sidebar.browseListings'), highlight: true },
        { to: '/saved', icon: <Heart size={18} />, label: t('sidebar.savedListings'), meta: savedCount > 0 ? `${savedCount} ${t('sidebar.saved')}` : undefined },
        { to: '/bookings', icon: <CalendarCheck size={18} />, label: t('sidebar.myBookings'), badge: activeBookings },
        { to: '/messages', icon: <MessageSquare size={18} />, label: t('sidebar.messages'), badge: unreadMessages },
        { to: '/reviews', icon: <Star size={18} />, label: t('sidebar.myReviews') },
        { to: '/notifications', icon: <Bell size={18} />, label: t('sidebar.notifications'), badge: unreadNotifs },
        { to: '/profile', icon: <Settings size={18} />, label: t('sidebar.accountSettings') },
    ];

    // ── Desktop sidebar ──────────────────────────────────────────────────────
    const desktop = (
        <aside
            className="student-sidebar-desktop"
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
                    }} title={user?.fullName ?? 'Student'}>
                        {initials}
                    </div>
                    {!isCollapsed && (
                        <div style={{ minWidth: 0, opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s ease' }}>
                            <p style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user?.fullName ?? 'Student'}
                            </p>
                            <p style={{ fontSize: '0.73rem', color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {uniLabel}
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
                        Tenant
                    </span>
                )}
            </div>

            {/* Nav items */}
            <nav style={{ flex: 1, padding: '0.75rem 0' }}>
                {NAV.map((item, i) => (
                    <NavLink
                        key={item.to + item.label}
                        to={item.to}
                        title={isCollapsed ? item.label : undefined}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isCollapsed ? 'center' : 'flex-start',
                            gap: '0.65rem',
                            padding: isCollapsed ? '0.62rem 0' : (item.highlight ? '0.75rem 1rem 0.75rem 1.25rem' : '0.58rem 1rem 0.58rem 1.25rem'),
                            margin: isCollapsed ? '0.35rem 0' : (item.highlight ? '0.35rem 0.75rem' : '0.05rem 0'),
                            color: item.highlight && !isCollapsed ? WHITE : (isActive ? TEAL : '#374151'),
                            background: isCollapsed && item.highlight
                                ? (isActive ? TEAL_L : 'transparent')
                                : (item.highlight ? `linear-gradient(135deg, ${TEAL}, #0f9488)` : (isActive ? TEAL_L : 'transparent')),
                            borderLeft: !item.highlight && isActive ? `3px solid ${TEAL}` : '3px solid transparent',
                            textDecoration: 'none',
                            fontWeight: item.highlight ? 800 : (isActive ? 700 : 500),
                            fontSize: item.highlight ? '0.9rem' : '0.87rem',
                            borderRadius: isCollapsed ? '0' : (item.highlight ? 12 : '0 8px 8px 0'),
                            marginRight: isCollapsed ? '0' : (item.highlight ? '0.75rem' : '0.5rem'),
                            transition: 'all 0.15s',
                            boxShadow: item.highlight && !isCollapsed ? `0 4px 14px ${TEAL}33` : 'none',
                            opacity: visible ? 1 : 0,
                            transform: visible ? 'translateX(0)' : 'translateX(-8px)',
                            transitionDelay: `${0.04 * i}s`,
                        })}
                    >
                        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isCollapsed && item.badge ? '4px' : '0' }}>
                            {item.icon}
                            {isCollapsed && item.badge ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: CORAL }} /> : null}
                        </span>
                        {!isCollapsed && (
                            <>
                                <span style={{ flex: 1 }}>{item.label}</span>
                                {item.badge ? <Badge count={item.badge} /> : null}
                                {item.meta && !item.badge ? (
                                    <span style={{ fontSize: '0.7rem', color: AMBER, fontWeight: 700, flexShrink: 0 }}>{item.meta}</span>
                                ) : null}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Current tenancy card */}
            {!isCollapsed && tenancy ? (
                <div style={{ margin: '0 0.75rem', padding: '1rem', background: SURF, borderRadius: 12, border: `1px solid ${TEAL}33`, opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s' }}>
                    <p style={{ fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: TEAL, marginBottom: '0.5rem' }}>
                        Current Tenancy
                    </p>
                    <p style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.15rem' }}>{tenancy.propertyName}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: MUTED, fontSize: '0.75rem', marginBottom: '0.6rem' }}>
                        <MapPin size={12} />{tenancy.address}
                    </div>
                    {/* Progress bar */}
                    <div style={{ marginBottom: '0.4rem' }}>
                        <div style={{ height: 6, background: BORDER, borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                width: `${Math.round((tenancy.remainingMonths / tenancy.totalMonths) * 100)}%`,
                                background: `linear-gradient(90deg, ${TEAL}, #14b8a6)`,
                                borderRadius: 99,
                                transition: 'width 0.6s ease',
                            }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.72rem', color: MUTED, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={11} />{tenancy.remainingMonths}mo remaining of {tenancy.totalMonths}
                        </span>
                        <button
                            type="button"
                            onClick={() => navigate('/profile')}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: TEAL, fontSize: '0.75rem', fontWeight: 700,
                                fontFamily: FONT, padding: 0,
                            }}
                        >
                            View →
                        </button>
                    </div>
                </div>
            ) : null}

            {/* CampusCover trust badge */}
            {!isCollapsed && (
                <div style={{ margin: '0 0.75rem', padding: '0.85rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <Shield size={16} style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontWeight: 700, fontSize: '0.82rem', color: '#14532d' }}>CampusCover Protected</p>
                    </div>
                    <p style={{ fontSize: '0.73rem', color: '#166534', lineHeight: 1.4 }}>
                        You&apos;re covered under our tenant protection program.
                    </p>
                </div>
            )}

            {/* Help & Logout */}
            <div style={{ padding: isCollapsed ? '0 0 1.25rem' : '0 0.75rem 1.25rem', marginTop: 'auto' }}>
                <button
                    type="button"
                    title={isCollapsed ? 'Help & Support' : undefined}
                    onClick={() => navigate('/search')}
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
                    <HelpCircle size={15} /> {!isCollapsed && <span style={{ opacity: isCollapsed ? 0 : 1 }}>Help & Support</span>}
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

    // ── Mobile bottom tab bar (4 key items) ─────────────────────────────────
    const MOBILE_TABS = [
        { to: '/search', icon: <Search size={20} />, label: t('sidebar.browse'), badge: 0 },
        { to: '/saved', icon: <Heart size={20} />, label: t('sidebar.saved'), badge: savedCount },
        { to: '/messages', icon: <MessageSquare size={20} />, label: t('sidebar.chats'), badge: unreadMessages },
        { to: '/notifications', icon: <Bell size={20} />, label: t('sidebar.alerts'), badge: unreadNotifs },
        { to: '/profile', icon: <Settings size={20} />, label: t('sidebar.me'), badge: 0 },
    ];

    const mobile = (
        <nav
            className="student-sidebar-mobile"
            style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: WHITE, borderTop: `1px solid ${BORDER}`,
                display: 'flex', zIndex: 200,
                paddingBottom: 'env(safe-area-inset-bottom)',
                fontFamily: FONT,
            }}
        >
            {MOBILE_TABS.map((tab) => (
                <NavLink
                    key={tab.to + tab.label}
                    to={tab.to}
                    style={({ isActive }) => ({
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '0.55rem 0',
                        color: isActive ? TEAL : MUTED,
                        textDecoration: 'none', position: 'relative',
                    })}
                >
                    {tab.badge > 0 ? (
                        <span style={{
                            position: 'absolute', top: 4, right: '50%', transform: 'translateX(10px)',
                            background: CORAL, color: WHITE, borderRadius: 999,
                            fontSize: '0.6rem', fontWeight: 700, padding: '0.05rem 0.3rem', lineHeight: 1.5,
                        }}>
                            {tab.badge > 9 ? '9+' : tab.badge}
                        </span>
                    ) : null}
                    {tab.icon}
                    <span style={{ fontSize: '0.6rem', fontWeight: 600, marginTop: 2 }}>{tab.label}</span>
                </NavLink>
            ))}
        </nav>
    );

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Poppins:wght@400;500;700&display=swap');
        .student-sidebar-desktop { display: flex !important; }
        .student-sidebar-mobile  { display: none  !important; }
        @media (max-width: 768px) {
          .student-sidebar-desktop { display: none  !important; }
          .student-sidebar-mobile  { display: flex  !important; }
        }
      `}</style>
            {desktop}
            {mobile}
        </>
    );
}
