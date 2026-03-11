import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Building2, Inbox, Users, Wallet,
    Star, BarChart2, Bell, Settings, LogOut, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Design tokens ──────────────────────────────────────────────────────────
const GREEN = '#1a5c3a';
const GREEN_L = '#e8f5ee';
const GOLD = '#c8920a';
const GOLD_L = '#fef9ec';
const MUTED = '#6b7280';
const BORDER = '#e2e8f0';
const WHITE = '#ffffff';
const SURFACE = '#f8faf9';

const FONT = "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif";

// ── Helpers ────────────────────────────────────────────────────────────────
function Badge({ count, color = GREEN }: { count: number; color?: string }) {
    if (!count) return null;
    return (
        <span style={{
            background: color,
            color: WHITE,
            borderRadius: 999,
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '0.1rem 0.45rem',
            minWidth: 18,
            textAlign: 'center',
            lineHeight: 1.6,
            flexShrink: 0,
        }}>
            {count > 99 ? '99+' : count}
        </span>
    );
}

function PillTag({ label, color, bg }: { label: string; color: string; bg: string }) {
    return (
        <span style={{
            background: bg,
            color,
            fontSize: '0.65rem',
            fontWeight: 700,
            borderRadius: 999,
            padding: '0.15rem 0.55rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
        }}>
            {label}
        </span>
    );
}

// ── Props ──────────────────────────────────────────────────────────────────
interface LandlordSidebarProps {
    activeListings?: number;
    pendingInquiries?: number;
    tenantCount?: number;
    mtdEarnings?: number;
    avgRating?: number;
    unreadMessages?: number;
    unreadNotifs?: number;
    occupancyRate?: number;
    subscriptionTier?: 'free' | 'verified' | 'premium';
    isCollapsed?: boolean;
}

const TIER_STYLE: Record<string, { label: string; color: string; bg: string }> = {
    free: { label: 'Free', color: MUTED, bg: '#f1f5f9' },
    verified: { label: 'Verified', color: GREEN, bg: GREEN_L },
    premium: { label: 'Premium', color: GOLD, bg: GOLD_L },
};

// ── Component ──────────────────────────────────────────────────────────────
export default function LandlordSidebar({
    activeListings = 0,
    pendingInquiries = 0,
    tenantCount = 0,
    mtdEarnings = 0,
    avgRating = 0,
    unreadMessages = 0,
    unreadNotifs = 0,
    occupancyRate = 0,
    subscriptionTier = 'free',
    isCollapsed = false,
}: LandlordSidebarProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [visible, setVisible] = useState(false);
    const tier = TIER_STYLE[subscriptionTier] ?? TIER_STYLE.free;

    // Staggered fade-in on mount
    useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t); }, []);

    const initials = (user?.fullName ?? 'L').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    type NavItem = {
        to: string;
        icon: React.ReactNode;
        label: string;
        badge?: number;
        meta?: string;
        color?: string;
    };

    const NAV: NavItem[] = [
        { to: '/landlord', icon: <LayoutDashboard size={18} />, label: 'My Dashboard' },
        { to: '/landlord', icon: <Building2 size={18} />, label: 'My Listings', meta: `${activeListings} Active` },
        { to: '/messages', icon: <Inbox size={18} />, label: 'Inquiries', badge: pendingInquiries, color: '#ef4444' },
        { to: '/messages', icon: <Users size={18} />, label: 'My Tenants', meta: `${tenantCount} Total` },
        { to: '/landlord/payments', icon: <Wallet size={18} />, label: 'Earnings', meta: mtdEarnings > 0 ? `TZS ${mtdEarnings.toLocaleString()}` : '—' },
        { to: '/profile', icon: <Star size={18} />, label: 'Reviews', meta: avgRating > 0 ? `${avgRating.toFixed(1)} ★` : '—' },
        { to: '/landlord', icon: <BarChart2 size={18} />, label: 'Analytics' },
        { to: '/notifications', icon: <Bell size={18} />, label: 'Notifications', badge: unreadNotifs },
        { to: '/profile', icon: <Settings size={18} />, label: 'Account Settings' },
    ];

    // ── Desktop sidebar ──────────────────────────────────────────────────────
    const desktop = (
        <aside
            style={{
                width: isCollapsed ? 70 : 260,
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
                transition: 'width 0.3s ease, opacity 0.35s ease, transform 0.35s ease',
            }}
            className="landlord-sidebar-desktop"
        >
            {/* Profile block */}
            <div style={{ padding: isCollapsed ? '1.5rem 0' : '1.5rem 1.25rem 1rem', borderBottom: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', alignItems: isCollapsed ? 'center' : 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '0.75rem', marginBottom: isCollapsed ? 0 : '0.6rem' }}>
                    <div style={{
                        width: 46, height: 46, borderRadius: 12,
                        background: `linear-gradient(135deg, ${GREEN}, #2d8a5a)`,
                        color: WHITE, fontWeight: 800, fontSize: '1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, letterSpacing: '0.05em',
                    }} title={user?.fullName ?? 'Landlord'}>
                        {initials}
                    </div>
                    {!isCollapsed && (
                        <div style={{ minWidth: 0, opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s ease' }}>
                            <p style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user?.fullName ?? 'Landlord'}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: MUTED }}>✓ Verified Host</p>
                        </div>
                    )}
                </div>
                {!isCollapsed && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s ease' }}>
                        <PillTag label={tier.label} color={tier.color} bg={tier.bg} />
                        {user?.listerType ? <PillTag label={user.listerType} color={MUTED} bg="#f1f5f9" /> : null}
                    </div>
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
                            padding: isCollapsed ? '0.62rem 0' : '0.62rem 1.25rem',
                            color: isActive ? GREEN : '#374151',
                            background: isActive ? GREEN_L : 'transparent',
                            borderLeft: isActive ? `3px solid ${GREEN}` : '3px solid transparent',
                            textDecoration: 'none',
                            fontWeight: isActive ? 700 : 500,
                            fontSize: '0.88rem',
                            borderRadius: isCollapsed ? '0' : '0 8px 8px 0',
                            marginRight: isCollapsed ? '0' : '0.5rem',
                            transition: 'all 0.15s',
                            opacity: visible ? 1 : 0,
                            transform: visible ? 'translateX(0)' : 'translateX(-8px)',
                            transitionDelay: `${0.04 * i}s`,
                        })}
                    >
                        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isCollapsed && item.badge ? '4px' : '0' }}>
                            {item.icon}
                            {isCollapsed && item.badge ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} /> : null}
                        </span>
                        {!isCollapsed && (
                            <>
                                <span style={{ flex: 1, minWidth: 0, opacity: isCollapsed ? 0 : 1 }}>{item.label}</span>
                                {item.badge ? <Badge count={item.badge} color={item.color ?? GREEN} /> : null}
                                {item.meta && !item.badge ? (
                                    <span style={{ fontSize: '0.72rem', color: GOLD, fontWeight: 700, flexShrink: 0 }}>{item.meta}</span>
                                ) : null}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Quick stats block */}
            {!isCollapsed && (
                <div style={{ margin: '0 0.75rem', padding: '0.9rem 1rem', background: SURFACE, borderRadius: 12, border: `1px solid ${BORDER}`, opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s' }}>
                    <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED, marginBottom: '0.6rem' }}>Quick Stats</p>
                    {[
                        { label: 'Occupancy', value: `${occupancyRate}%`, color: occupancyRate >= 80 ? GREEN : GOLD },
                        { label: 'Active Listings', value: activeListings, color: GREEN },
                        { label: 'Pending Inquiries', value: pendingInquiries, color: pendingInquiries > 0 ? '#ef4444' : MUTED },
                    ].map((stat) => (
                        <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '0.8rem', color: MUTED }}>{stat.label}</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: stat.color }}>{stat.value}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Upgrade banner (free tier only) */}
            {!isCollapsed && subscriptionTier === 'free' ? (
                <div style={{ margin: '0.75rem', padding: '0.9rem 1rem', background: GOLD_L, borderRadius: 12, border: `1px solid ${GOLD}33`, opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Zap size={16} style={{ color: GOLD, flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e', lineHeight: 1.35 }}>
                            Upgrade to Verified — get instant approval
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/profile')}
                        style={{
                            width: '100%', padding: '0.45rem', background: GOLD, color: WHITE,
                            border: 'none', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700,
                            cursor: 'pointer', transition: 'opacity 0.15s',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
                        onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                        onFocus={(e) => (e.currentTarget.style.opacity = '0.85')}
                        onBlur={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                        Upgrade Plan
                    </button>
                </div>
            ) : null}

            {/* Logout */}
            <button
                type="button"
                title={isCollapsed ? 'Sign Out' : undefined}
                onClick={logout}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '0.6rem',
                    margin: isCollapsed ? '0.5rem auto 1.25rem' : '0.5rem 0.75rem 1.25rem',
                    padding: isCollapsed ? '0.6rem' : '0.6rem 0.9rem',
                    background: 'transparent', border: isCollapsed ? 'none' : `1px solid ${BORDER}`,
                    borderRadius: 10, cursor: 'pointer', color: '#ef4444',
                    fontSize: '0.85rem', fontWeight: 600,
                    transition: 'background 0.15s',
                    fontFamily: FONT,
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#fef2f2')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                onFocus={(e) => (e.currentTarget.style.background = '#fef2f2')}
                onBlur={(e) => (e.currentTarget.style.background = 'transparent')}
            >
                <LogOut size={16} />
                {!isCollapsed && <span style={{ opacity: isCollapsed ? 0 : 1 }}>Sign Out</span>}
            </button>
        </aside>
    );

    // ── Mobile bottom tab bar ────────────────────────────────────────────────
    const MOBILE_TABS = [
        { to: '/landlord', icon: <LayoutDashboard size={20} />, label: 'Home', badge: 0 },
        { to: '/messages', icon: <Inbox size={20} />, label: 'Inbox', badge: unreadMessages },
        { to: '/landlord/payments', icon: <Wallet size={20} />, label: 'Earnings', badge: 0 },
        { to: '/notifications', icon: <Bell size={20} />, label: 'Alerts', badge: unreadNotifs },
        { to: '/profile', icon: <Settings size={20} />, label: 'Account', badge: 0 },
    ];

    const mobile = (
        <nav
            className="landlord-sidebar-mobile"
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
                        color: isActive ? GREEN : MUTED,
                        textDecoration: 'none', position: 'relative',
                    })}
                >
                    {tab.badge > 0 ? (
                        <span style={{
                            position: 'absolute', top: 4, right: '50%', transform: 'translateX(10px)',
                            background: '#ef4444', color: WHITE, borderRadius: 999,
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
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;700&display=swap');
        .landlord-sidebar-desktop { display: flex !important; }
        .landlord-sidebar-mobile  { display: none !important; }
        @media (max-width: 768px) {
          .landlord-sidebar-desktop { display: none !important; }
          .landlord-sidebar-mobile  { display: flex !important; }
        }
      `}</style>
            {desktop}
            {mobile}
        </>
    );
}
