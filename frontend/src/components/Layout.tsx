import { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { APP_ROLE } from '../lib/roles';
import { selectRows, updateRows } from '../lib/supabase';
import LandlordSidebar from './LandlordSidebar';
import StudentSidebar from './StudentSidebar';
import AdminSidebar from './AdminSidebar';
import Footer from './Footer';
import { Menu, Globe, UserPlus, LogIn, HelpCircle, X, Home, User } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

export default function Layout({ children, hideSidebar = false, hideHeader = false, hideFooter = false }) {
  const { user, token, isAuthenticated, logout, networkError, setNetworkError } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [sosMode, setSosMode] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/reset-password' ||
    location.pathname.startsWith('/register/');

  const isHomePage = location.pathname === '/';

  const [activeListings, setActiveListings] = useState(0);
  const [tenantCount, setTenantCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [activeBookings, setActiveBookings] = useState(0);
  const [occupancyRate, setOccupancyRate] = useState(0);
  const [pendingInquiries, setPendingInquiries] = useState(0);
  const [mtdEarnings, setMtdEarnings] = useState(0);
  const [subscriptionTier, setSubscriptionTier] = useState('free');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hasSyncedLanguage = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      // Only force collapse on small screens, never force expansion
      setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsSidebarOpen(false);
    setIsMenuOpen(false);
  }, [location.pathname, location.search]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const toggleLanguage = async () => {
    const nextLang = i18n.language.startsWith('en') ? 'sw' : 'en';
    await i18n.changeLanguage(nextLang);

    // If logged in, save the preference to Supabase
    if (isAuthenticated && user?.userId && token) {
      try {
        await updateRows(
          'profiles',
          { preferred_language: nextLang },
          {
            filters: [{ column: 'id', op: 'eq', value: user.userId }],
            accessToken: token
          }
        );
      } catch (err) {
        console.error('Failed to save language preference:', err);
      }
    }
  };

  // Sync language on initial auth load
  useEffect(() => {
    if (isAuthenticated && user?.preferredLanguage && !hasSyncedLanguage.current) {
      if (user.preferredLanguage !== i18n.language) {
        i18n.changeLanguage(user.preferredLanguage);
      }
      hasSyncedLanguage.current = true;
    }
  }, [isAuthenticated, user?.preferredLanguage, i18n]);

  // Global Settings & Profile Status (SOS & Suspension)
  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      try {
        const [settingsRows, profileRows] = await Promise.all([
          selectRows('system_settings', {}),
          (isAuthenticated && user?.userId) ? selectRows('profiles', {
            select: 'verification_status',
            filters: [{ column: 'id', op: 'eq', value: user.userId }],
            accessToken: token
          }) : Promise.resolve([])
        ]);

        if (mounted) {
          const settingsMap = {};
          settingsRows.forEach(s => settingsMap[s.key] = s.value);
          setSosMode(settingsMap['maintenance_mode'] === true);
          setAnnouncement(settingsMap['global_announcement'] || '');

          if (profileRows.length > 0 && profileRows[0].verification_status === 'suspended') {
            logout(); // Force logout if suspended
          }
        }
      } catch (err) {
        console.error('Failed to load global settings:', err);
      }
    }
    loadSettings();
    const id = setInterval(loadSettings, 60000); // Poll every minute for system settings
    return () => { mounted = false; clearInterval(id); };
  }, [isAuthenticated, user?.userId, token, logout]);

  useEffect(() => {
    let mounted = true;
    async function loadUnreadCount() {
      if (!isAuthenticated || !user?.userId || !token) {
        if (mounted) { setUnreadCount(0); }
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
          if (mounted) { setUnreadCount(0); }
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
        if (mounted) { setUnreadCount(unreadRows.length); }
      } catch {
        if (mounted) { setUnreadCount(0); }
      }
    }
    loadUnreadCount();
    const intervalId = setInterval(loadUnreadCount, 20000);
    return () => { mounted = false; clearInterval(intervalId); };
  }, [isAuthenticated, token, user?.userId]);

  // Notification bell count
  useEffect(() => {
    let mounted = true;
    async function loadNotifCount() {
      if (!isAuthenticated || !user?.userId || !token) { setNotifCount(0); return; }
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

  // Additional sidebar stats
  useEffect(() => {
    let mounted = true;
    async function loadSidebarStats() {
      if (!isAuthenticated || !user?.userId || !token) return;
      try {
        if (user.role === APP_ROLE.LISTER) {
          const profileRows = await selectRows('profiles', {
            select: 'subscription_plan', filters: [{ column: 'id', op: 'eq', value: user.userId }],
            accessToken: token
          });
          const tier = profileRows.length > 0 && profileRows[0].subscription_plan ? profileRows[0].subscription_plan : 'free';

          const listingsRows = await selectRows('listings', {
            select: 'id,vacancy_status,price_monthly', filters: [{ column: 'lister_id', op: 'eq', value: user.userId }, { column: 'status', op: 'eq', value: 'approved' }],
            limit: 1000, accessToken: token
          });
          const tenantRows = await selectRows('bookings', {
            select: 'id', filters: [{ column: 'lister_id', op: 'eq', value: user.userId }, { column: 'status', op: 'eq', value: 'approved' }],
            limit: 1000, accessToken: token
          });
          const pendingRows = await selectRows('bookings', {
            select: 'id', filters: [{ column: 'lister_id', op: 'eq', value: user.userId }, { column: 'status', op: 'eq', value: 'requested' }],
            limit: 1000, accessToken: token
          });
          if (mounted) {
            setSubscriptionTier(tier);
            setActiveListings(listingsRows.length);
            setTenantCount(tenantRows.length);
            setPendingInquiries(pendingRows.length);

            const occupied = listingsRows.filter((r: any) => r.vacancy_status === 'occupied').length;
            setOccupancyRate(listingsRows.length > 0 ? Math.round((occupied / listingsRows.length) * 100) : 0);

            const earnings = listingsRows.filter((r: any) => r.vacancy_status === 'occupied').reduce((sum: number, r: any) => sum + Number(r.price_monthly || 0), 0);
            setMtdEarnings(earnings);
          }
        } else if (user.role === APP_ROLE.STUDENT) {
          const savedRows = await selectRows('saved_listings', {
            select: 'id', filters: [{ column: 'user_id', op: 'eq', value: user.userId }], limit: 1000, accessToken: token
          });
          const bookingsRows = await selectRows('bookings', {
            select: 'id', filters: [{ column: 'tenant_id', op: 'eq', value: user.userId }, { column: 'status', op: 'eq', value: 'approved' }],
            limit: 1000, accessToken: token
          });
          if (mounted) {
            setSavedCount(savedRows.length);
            setActiveBookings(bookingsRows.length);
          }
        }
      } catch {
        // Silently ignore errors for background stats fetching
      }
    }
    loadSidebarStats();
    const id = setInterval(loadSidebarStats, 60000);
    return () => { mounted = false; clearInterval(id); };
  }, [isAuthenticated, token, user?.userId, user?.role]);

  const navigate = useNavigate();

  return (
    <>
      <Toaster position="top-right" />
      <div className="app-shell">
      {sosMode ? (
        <div className="sos-banner">
          <span className="sos-banner__content">
            🚨 <strong>{t('layout.sosEmergency')}:</strong> {announcement || t('layout.defaultSosMsg')}
          </span>
        </div>
      ) : (announcement && announcement.trim() !== '') ? (
        <div className="announcement-banner">
          <span>📢 {announcement}</span>
        </div>
      ) : null}

      {!hideHeader && <header className={`topbar ${isHomePage ? 'topbar--on-homepage' : ''}`} style={{ display: 'flex', alignItems: 'center', padding: 0 }}>
        {/* Unified Header Design - Same for both logged in and logged out users */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          width: '100%'
        }}>
          {/* Left - Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: '1.4rem',
              color: 'var(--ink)',
              letterSpacing: '-0.02em'
            }}>
              Campus<span style={{ color: '#22c55e' }}>Stay</span>
            </span>
          </Link>

          {/* Center - Shiny Badge (hidden on auth pages) */}
          {!isAuthPage && (
            <div style={{
              position: 'relative',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
              borderRadius: '999px',
              padding: '0.5rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
              overflow: 'hidden'
            }}>
              {/* Shine animation overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                animation: 'shine 2.5s ease-in-out infinite'
              }} />
              <Home size={16} style={{ color: 'white', position: 'relative', zIndex: 1 }} />
              <span style={{
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                position: 'relative',
                zIndex: 1
              }}>
                Find Your Perfect Home
              </span>
            </div>
          )}

          {/* Right - Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Language Toggle */}
            <button
              type="button"
              onClick={toggleLanguage}
              title="Toggle Language"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--mid)',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                e.currentTarget.style.color = '#22c55e';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--mid)';
              }}
            >
              <Globe size={20} />
            </button>

            {/* Become Host - only show when not authenticated */}
            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => navigate('/auth/signup')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: 'var(--ink)',
                  fontFamily: "'Inter', sans-serif",
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#22c55e'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink)'}
              >
                Become host
              </button>
            )}

            {/* User Menu - show when authenticated */}
            {isAuthenticated ? (
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  style={{
                    background: isMenuOpen ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isMenuOpen ? '#22c55e' : 'var(--ink)',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>

                {/* Dropdown Menu for Authenticated Users */}
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 0.5rem)',
                  right: 0,
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  padding: '0.5rem',
                  minWidth: '200px',
                  opacity: isMenuOpen ? 1 : 0,
                  visibility: isMenuOpen ? 'visible' : 'hidden',
                  transform: isMenuOpen ? 'translateY(0)' : 'translateY(-10px)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: 100
                }}>
                  {/* User Info */}
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                    marginBottom: '0.25rem'
                  }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>
                      {user?.fullName || 'User'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--mid)' }}>
                      {user?.role || 'Student'}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <button
                    onClick={() => { navigate('/profile'); setIsMenuOpen(false); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: 'var(--ink)',
                      fontFamily: "'Inter', sans-serif",
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <User size={18} style={{ color: '#22c55e' }} />
                    Profile
                  </button>

                  <button
                    onClick={() => { navigate('/messages'); setIsMenuOpen(false); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: 'var(--ink)',
                      fontFamily: "'Inter', sans-serif",
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <HelpCircle size={18} style={{ color: '#22c55e' }} />
                    Messages
                    {unreadCount > 0 && (
                      <span style={{
                        marginLeft: 'auto',
                        background: '#ef4444',
                        color: 'white',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '999px',
                        fontSize: '0.7rem',
                        fontWeight: 600
                      }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Role-specific dashboard link */}
                  {user?.role === APP_ROLE.LISTER && (
                    <button
                      onClick={() => { navigate('/landlord/dashboard'); setIsMenuOpen(false); }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        color: 'var(--ink)',
                        fontFamily: "'Inter', sans-serif",
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Home size={18} style={{ color: '#22c55e' }} />
                      Dashboard
                    </button>
                  )}

                  {user?.role === APP_ROLE.ADMIN && (
                    <button
                      onClick={() => { navigate('/admin'); setIsMenuOpen(false); }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        color: 'var(--ink)',
                        fontFamily: "'Inter', sans-serif",
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Home size={18} style={{ color: '#22c55e' }} />
                      Admin Panel
                    </button>
                  )}

                  <div style={{ height: '1px', background: 'rgba(0,0,0,0.08)', margin: '0.4rem 0' }} />

                  <button
                    onClick={() => { navigate('/help'); setIsMenuOpen(false); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: 'var(--ink)',
                      fontFamily: "'Inter', sans-serif",
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <HelpCircle size={18} style={{ color: '#22c55e' }} />
                    Help centre
                  </button>

                  <button
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: '#ef4444',
                      fontFamily: "'Inter', sans-serif",
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogIn size={18} style={{ color: '#ef4444' }} />
                    Log out
                  </button>
                </div>
              </div>
            ) : (
              /* Hamburger Menu for Non-Authenticated Users */
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  style={{
                    background: isMenuOpen ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isMenuOpen ? '#22c55e' : 'var(--ink)',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>

                {/* Dropdown Menu for Non-Authenticated Users */}
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 0.5rem)',
                  right: 0,
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  padding: '0.5rem',
                  minWidth: '180px',
                  opacity: isMenuOpen ? 1 : 0,
                  visibility: isMenuOpen ? 'visible' : 'hidden',
                  transform: isMenuOpen ? 'translateY(0)' : 'translateY(-10px)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: 100
                }}>
                  <button
                    onClick={() => { navigate('/auth/login'); setIsMenuOpen(false); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: 'var(--ink)',
                      fontFamily: "'Inter', sans-serif",
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogIn size={18} style={{ color: '#22c55e' }} />
                    Sign in
                  </button>
                  <button
                    onClick={() => { navigate('/auth/signup'); setIsMenuOpen(false); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: 'var(--ink)',
                      fontFamily: "'Inter', sans-serif",
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <UserPlus size={18} style={{ color: '#22c55e' }} />
                    Sign up
                  </button>
                  <div style={{ height: '1px', background: 'rgba(0,0,0,0.08)', margin: '0.4rem 0' }} />
                  <button
                    onClick={() => { navigate('/help'); setIsMenuOpen(false); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: 'var(--ink)',
                      fontFamily: "'Inter', sans-serif",
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <HelpCircle size={18} style={{ color: '#22c55e' }} />
                    Help centre
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>}

      {networkError ? (
        <div style={{ background: '#cf222e', color: 'white', padding: '0.75rem', textAlign: 'center', fontSize: '0.9rem', position: 'sticky', top: '60px', zIndex: 90 }}>
          {t('layout.networkError')}
          <button
            type="button"
            onClick={() => { setNetworkError(false); window.location.reload(); }}
            style={{ marginLeft: '1rem', background: 'transparent', border: '1px solid white', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
          >
            {t('layout.retry')}
          </button>
        </div>
      ) : null}

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)', position: 'relative', width: '100%', maxWidth: '100vw' }}>
        {/* Sidebars - hidden on homepage or when hideSidebar is true */}
        {!hideSidebar && isAuthenticated && !isAuthPage && !isHomePage && user?.role === APP_ROLE.LISTER && !location.pathname.startsWith('/admin') ? (
          <LandlordSidebar
            unreadMessages={unreadCount}
            unreadNotifs={notifCount}
            activeListings={activeListings}
            tenantCount={tenantCount}
            occupancyRate={occupancyRate}
            pendingInquiries={pendingInquiries}
            mtdEarnings={mtdEarnings}
            subscriptionTier={subscriptionTier as 'free' | 'verified' | 'premium'}
            isCollapsed={!isSidebarOpen}
            mobileDrawerOpen={isSidebarOpen}
            onMobileDrawerClose={() => setIsSidebarOpen(false)}
          />
        ) : null}
        {!hideSidebar && isAuthenticated && !isAuthPage && !isHomePage && user?.role === APP_ROLE.STUDENT && !location.pathname.startsWith('/admin') ? (
          <StudentSidebar
            unreadMessages={unreadCount}
            unreadNotifs={notifCount}
            savedCount={savedCount}
            activeBookings={activeBookings}
            isCollapsed={!isSidebarOpen}
            mobileDrawerOpen={isSidebarOpen}
            onMobileDrawerClose={() => setIsSidebarOpen(false)}
          />
        ) : null}
        {isAuthenticated && !isAuthPage && !isHomePage && user?.role === APP_ROLE.ADMIN ? (
          <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <main className="main-content" style={{ flex: 1, minWidth: 0, transition: 'all 0.3s ease', padding: isHomePage ? 0 : undefined }}>
            {children}
          </main>

          {/* Footer on all pages unless hideFooter is true */}
          {!hideFooter && <Footer />}
        </div>
      </div>


      {/* Admin Mobile Bottom Nav - hidden on homepage */}
      {isAuthenticated && !isHomePage && user?.role === APP_ROLE.ADMIN ? (
        <nav
          className="bottom-nav mobile-only"
          aria-label="Admin Navigation"
          style={{ 
            display: 'flex', justifyContent: 'space-around', alignItems: 'center', 
            gap: '0.25rem', background: 'rgba(255, 255, 255, 0.95)', 
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(0,0,0,0.05)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.04)',
            padding: '0.6rem 0.25rem',
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100
          }}
        >
          <NavLink 
            to="/messages" 
            className={({ isActive }) => (isActive ? 'is-active' : '')} 
            style={({ isActive }) => ({ 
              flex: 1, textAlign: 'center', fontSize: '0.72rem', fontWeight: 800,
              color: isActive ? '#1D9E75' : '#64748b',
              textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
            })}
          >
             <span style={{ fontSize: '1.2rem' }}>💬</span>
             <span>Messages</span>
             {unreadCount > 0 && <span className="nav-badge" style={{ position: 'absolute', top: 5, right: '15%' }}>{unreadCount}</span>}
          </NavLink>
          <NavLink 
            to="/admin/landlords" 
            className={({ isActive }) => (isActive ? 'is-active' : '')} 
            style={({ isActive }) => ({ 
              flex: 1, textAlign: 'center', fontSize: '0.72rem', fontWeight: 800,
              color: isActive ? '#1D9E75' : '#64748b',
              textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
            })}
          >
            <span style={{ fontSize: '1.2rem' }}>🤝</span>
            <span>Vetting</span>
          </NavLink>
          <NavLink 
            to="/admin/listings" 
            className={({ isActive }) => (isActive ? 'is-active' : '')} 
            style={({ isActive }) => ({ 
              flex: 1, textAlign: 'center', fontSize: '0.72rem', fontWeight: 800,
              color: isActive ? '#1D9E75' : '#64748b',
              textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
            })}
          >
            <span style={{ fontSize: '1.2rem' }}>🏠</span>
            <span>Listings</span>
          </NavLink>
          <button
            type="button"
            onClick={logout}
            style={{ 
              flex: 1, textAlign: 'center', background: 'none', border: 'none', 
              color: '#b91c1c', fontSize: '0.72rem', fontWeight: 800,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>🚪</span>
            <span>Logout</span>
          </button>
        </nav>
      ) : null}

    </div>
    </>
  );
}
