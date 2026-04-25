import { useEffect, useState, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { APP_ROLE } from '../lib/roles';
import { selectRows, updateRows } from '../lib/supabase';
import LandlordSidebar from './LandlordSidebar';
import StudentSidebar from './StudentSidebar';
import AdminSidebar from './AdminSidebar';
import Footer from './Footer';
import InstallPwaModal from './InstallPwaModal';
import { Menu, Globe, UserPlus, LogIn, HelpCircle, X, Home, User, Download, Moon, Sun, Map, Accessibility, Search, Heart, MessageCircle, Wifi, Car, Droplets, Shield, Utensils, Shirt, Filter, Star, LayoutGrid, Bell } from 'lucide-react';
import { dashboardDefaultPath } from '../lib/roles';
import { Toaster } from 'react-hot-toast';
import topImage from '../images/modern-home-exterior-with-landscaping-driveway.jpg';

export default function Layout({ children, hideSidebar = false, hideHeader = false, hideFooter = false }: { children?: React.ReactNode; hideSidebar?: boolean; hideHeader?: boolean; hideFooter?: boolean }) {
  const { user, token, isAuthenticated, logout, networkError, setNetworkError } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [sosMode, setSosMode] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/reset-password' ||
    location.pathname.startsWith('/register/');

  const isHomePage = location.pathname === '/';

  const userDashboardPath = user?.role ? dashboardDefaultPath(user.role) : '/';
  const profileLabel = isAuthenticated ? 'Profile' : 'Login';
  const profileTarget = isAuthenticated ? '/profile' : '/auth/login';

  const [homeViewMode, setHomeViewMode] = useState('grid');
  
  const toggleHomePageView = () => {
    const newMode = homeViewMode === 'grid' ? 'map' : 'grid';
    setHomeViewMode(newMode);
    window.dispatchEvent(new CustomEvent('toggleHomePageView', { detail: newMode }));
  };

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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSearchModalClosing, setIsSearchModalClosing] = useState(false);
  const [searchOpenedOnce, setSearchOpenedOnce] = useState(false);
  const [showInstallPopup, setShowInstallPopup] = useState(true);
  const [focusOnOpen, setFocusOnOpen] = useState(false);
  const [searchPressed, setSearchPressed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const bottomBarRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    searchQuery: '',
    priceMin: 0,
    priceMax: 5000000,
    roomType: 'all',
    amenities: [] as string[],
    gender: 'any',
  });
  const [activeFilterTab, setActiveFilterTab] = useState('price');
  const touchStartY = useRef<number | null>(null);
  const hasTriggeredSwipe = useRef(false);
  const handleOpenSearch = (focus = false) => {
    setIsSearchModalOpen(true);
    setSearchOpenedOnce(true);
    setFocusOnOpen(focus);
    setSearchPressed(true);
  };

  const handleRoomTypeChange = (roomType: string) => {
    setFilters(prev => ({ ...prev, roomType }));
  };

  const handleAmenityChange = (amenity: string) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleGenderChange = (value: string) => {
    setFilters(prev => ({ ...prev, gender: value }));
  };

  const handlePriceRangeChange = (min: number, max: number) => {
    setFilters(prev => ({ ...prev, priceMin: min, priceMax: max }));
  };

  const handleClearFilters = () => {
    setFilters({
      searchQuery: '',
      priceMin: 0,
      priceMax: 5000000,
      roomType: 'all',
      amenities: [],
      gender: 'any',
    });
  };

  const closeSearchModal = () => {
    setIsSearchModalClosing(true);
    setTimeout(() => {
      setIsSearchModalOpen(false);
      setIsSearchModalClosing(false);
    }, 300);
  };

  const handleApplyFilters = () => {
    // Pass filters to HomePage via sessionStorage or context
    sessionStorage.setItem('appliedFilters', JSON.stringify(filters));
    closeSearchModal();
    navigate('/');
    window.dispatchEvent(new Event('filtersApplied'));
  };

  const onTouchStartHandler = (e: any) => {
    touchStartY.current = e.touches && e.touches[0] ? e.touches[0].clientY : null;
    hasTriggeredSwipe.current = false;
  };
  const onTouchMoveHandler = (e: any) => {
    const start = touchStartY.current;
    if (start == null) return;
    const currentY = e.touches && e.touches[0] ? e.touches[0].clientY : null;
    if (currentY == null) return;
    const dy = currentY - start;
    // swipe up threshold
    if (dy < -30 && !hasTriggeredSwipe.current) {
      hasTriggeredSwipe.current = true;
      handleOpenSearch(false);
    }
  };
  const onTouchEndHandler = () => {
    touchStartY.current = null;
    hasTriggeredSwipe.current = false;
  };
  const isAndroid = /android/i.test(navigator.userAgent);
  const isMobileOrTablet = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Scroll to top when search modal opens
  useEffect(() => {
    if (isSearchModalOpen) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // if we should focus immediately (second-click), do so after scroll
      if (focusOnOpen) {
        setTimeout(() => searchInputRef.current?.focus(), 260);
      }
    } else {
      // reset the first-open flag when modal closes so next open behaves like first tap
      setSearchOpenedOnce(false);
      setFocusOnOpen(false);
      setSearchPressed(false);
    }
  }, [isSearchModalOpen, focusOnOpen]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    setIsPwaModalOpen(true);
  };
  const hasSyncedLanguage = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const a11yRef = useRef<HTMLDivElement>(null);
  const [isA11yOpen, setIsA11yOpen] = useState(false);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (a11yRef.current && !a11yRef.current.contains(e.target as Node)) {
        setIsA11yOpen(false);
      }
    };
    const handleResize = () => {
      // Only force collapse on small screens, never force expansion
      setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    document.addEventListener('click', handleOutside);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('click', handleOutside);
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsSidebarOpen(false);
    setIsMenuOpen(false);
  }, [location.pathname, location.search]);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (a11yRef.current && !a11yRef.current.contains(event.target as Node)) {
        setIsA11yOpen(false);
      }
    }
    if (isMenuOpen || isA11yOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen, isA11yOpen]);

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

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // For now, just toggle the state - full dark mode styling can be implemented later
    // This allows the button to be interactive
    if (!isDarkMode) {
      // Show feedback
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
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
          selectRows('system_config', {}),
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
        const conversations = await selectRows('room_inquiries', {
          select: 'id',
          filters: [
            { column: 'tenant_id', op: 'eq', value: user.userId }
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
        if (user.role === APP_ROLE.LANDLORD) {
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
        } else if (user.role === APP_ROLE.TENANT) {
          const savedRows = await selectRows('saved_listings', {
            select: 'listing_id', filters: [{ column: 'tenant_id', op: 'eq', value: user.userId }], limit: 1000, accessToken: token
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

  const topActionLink = (() => {
    if (!isAuthenticated) {
      return (
        <Link to="/auth/login" className="btn btn--small">
          {t('nav.login', 'Login')}
        </Link>
      );
    }
    if (user?.role === APP_ROLE.ADMIN) {
      return (
        <Link to="/admin" className="btn btn--small">
          {t('nav.admin', 'Admin')}
        </Link>
      );
    }
    if (user?.role === APP_ROLE.LANDLORD) {
      return (
        <Link to="/landlord/dashboard" className="btn btn--small">
          {t('nav.dashboard', 'Dashboard')}
        </Link>
      );
    }
    if (user?.role === APP_ROLE.PROPERTY_MANAGER) {
      return (
        <Link to="/manager/dashboard" className="btn btn--small">
          {t('nav.dashboard', 'Dashboard')}
        </Link>
      );
    }
    return (
      <Link to="/tenant/dashboard" className="btn btn--small">
        {t('nav.dashboard', 'Dashboard')}
      </Link>
    );
  })();

  return (
    <>
      <Toaster position="top-right" />
      <div className="app-shell">

      {!hideHeader ? (
        <header className={`topbar ${isHomePage ? 'topbar--on-homepage' : ''}`} style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
          <div className="topbar-content" style={{ width: '100%', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
              <button
                type="button"
                className="topbar-action-btn"
                onClick={() => navigate(isAuthenticated ? userDashboardPath : '/')}
                title="Home"
                style={{ padding: '0.35rem' }}
              >
                <img
                  src="/icon-192.png"
                  alt="iRent"
                  style={{
                    width: '46px',
                    height: '46px',
                    objectFit: 'contain',
                    borderRadius: '10px'
                  }}
                />
              </button>
            </div>
            <div style={{ flex: '1 1 auto', display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0, maxWidth: '600px' }}>
              {!isAuthenticated && (
                <div
                  role="button"
                  onClick={() => setIsSearchModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    padding: '0.4rem 0.9rem',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 3px 12px rgba(34, 197, 94, 0.35)',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(34, 197, 94, 0.45)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 3px 12px rgba(34, 197, 94, 0.35)';
                  }}
                >
                  {/* Shiny effect overlay */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                    animation: 'shine 2.5s infinite'
                  }} />
                  <style>{`
                    @keyframes shine {
                      0% { left: -100%; }
                      100% { left: 100%; }
                    }
                  `}</style>
                  <Home size={14} style={{ color: '#fff', flexShrink: 0, position: 'relative', zIndex: 1 }} />
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    position: 'relative',
                    zIndex: 1
                  }}>Find your perfect home</span>
                </div>
              )}
            </div>
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', position: 'relative' }} ref={a11yRef}>
              {!isMobileOrTablet && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginRight: '0.5rem' }}>
                  {isAuthenticated && (
                    <Link to="/profile" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', marginRight: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--mid)', marginRight: '0.8rem' }}>
                        {t('layout.greeting', 'Hi')}, {user?.fullName?.split(' ')[0] || 'User'}
                      </span>
                    </Link>
                  )}
                  {topActionLink}
                  {isAuthenticated && (
                    <button type="button" className="btn btn--ghost btn--small" onClick={logout}>
                      {t('nav.logout', 'Logout')}
                    </button>
                  )}
                </div>
              )}

              {/* Show search/map on homepage or when authenticated, hide on auth pages */}
              {(isHomePage || isAuthenticated) && (
                <>
                  {isHomePage ? (
                    <button type="button" className="topbar-action-btn" onClick={toggleHomePageView} title="Toggle View">
                      {homeViewMode === 'map' ? <LayoutGrid size={18} /> : (isAuthenticated ? <Search size={18} /> : <Map size={18} />)}
                    </button>
                  ) : (
                    <button type="button" className="topbar-action-btn" onClick={() => navigate('/listings')} title="Browse Listings">
                      <Search size={18} />
                    </button>
                  )}
                </>
              )}
              
              {isAuthenticated && (
                <button 
                  type="button" 
                  className="topbar-action-btn" 
                  onClick={() => navigate('/notifications')} 
                  title="Notifications"
                >
                  <Bell size={18} />
                  {notifCount > 0 && (
                    <span className="notification-badge">{notifCount > 99 ? '99+' : notifCount}</span>
                  )}
                </button>
              )}
              
              {/* For non-authenticated non-homepage: show theme and language directly */}
              {!isAuthenticated && !isHomePage && (
                <>
                  <button 
                    type="button" 
                    className="topbar-action-btn" 
                    onClick={toggleDarkMode}
                    title="Toggle Theme"
                  >
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                  </button>
                  <button 
                    type="button" 
                    className="topbar-action-btn" 
                    onClick={toggleLanguage}
                    title="Change Language"
                  >
                    <Globe size={18} />
                  </button>
                </>
              )}
              
              {/* Show accessibility menu for homepage or authenticated users */}
              {(isHomePage || isAuthenticated) && (
                <>
                  <button 
                    type="button" 
                    className={`topbar-action-btn ${isA11yOpen ? 'is-active' : ''}`} 
                    onClick={() => setIsA11yOpen(!isA11yOpen)} 
                    title="Accessibility" 
                    aria-expanded={isA11yOpen} 
                    aria-haspopup="menu"
                  >
                    <Accessibility size={18} />
                  </button>

                  {isA11yOpen && (
                    <div className="a11y-menu">
                      <button type="button" className="a11y-menu__item" onClick={() => { toggleDarkMode(); setIsA11yOpen(false); }}>
                        {isDarkMode ? <Sun size={16} /> : <Moon size={16} />} 
                        <span>{t('layout.toggleTheme', 'Toggle theme')}</span>
                      </button>
                      <button type="button" className="a11y-menu__item" onClick={() => { toggleLanguage(); setIsA11yOpen(false); }}>
                        <Globe size={16} /> 
                        <span>{t('layout.changeLanguage', 'Change language')}</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {isMobileOrTablet && (
              <div className={`install-popup ${deferredPrompt ? 'show' : ''}`}>
                <div className="install-popup__inner">
                  <div className="install-popup__text">Install iRent for faster access and offline support.</div>
                  <div className="install-popup__actions">
                    <button className="install-popup__install" onClick={handleInstallClick}>Install</button>
                    <button className="install-popup__dismiss" onClick={() => setDeferredPrompt(null)}>Dismiss</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* NOTIFICATION ROW */}
          <div
            className="notification-row"
            style={{
              overflow: 'hidden',
              position: 'relative',
              minHeight: isMobileOrTablet && showInstallPopup ? 'auto' : '60px',
              backgroundColor: isMobileOrTablet && showInstallPopup ? '#ffffff' : 'transparent',
              backgroundImage: isMobileOrTablet && showInstallPopup
                ? 'none'
                : `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url("${topImage}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {isMobileOrTablet && showInstallPopup && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.75rem',
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.08) 100%)',
                  border: '1.5px solid #22c55e',
                  borderRadius: '8px',
                  color: '#22c55e',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  maxWidth: '100%',
                  margin: '0.3rem 0.5rem',
                  animation: 'slideDown 0.3s ease-out'
                }}
              >
                <style>{`
                  @keyframes slideDown {
                    from { transform: translateY(-100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                  }
                `}</style>
                <Download size={14} style={{ flexShrink: 0 }} />
                <span>Install iRent for better experience</span>
                <button
                  onClick={() => setShowInstallPopup(false)}
                  style={{
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid #22c55e',
                    borderRadius: '50%',
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#22c55e',
                    flexShrink: 0,
                    marginLeft: '0.5rem'
                  }}
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            )}
            {(!isMobileOrTablet || !showInstallPopup) && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                padding: '0.5rem 1rem',
                textAlign: 'center'
              }}>
                <p style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: '#ffffff',
                  lineHeight: 1.4,
                  margin: 0,
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  maxWidth: '90%'
                }}>
                  Discover your perfect home with iRent. Tanzania's #1 rental platform. Browse verified listings, connect with landlords, and book your stay with confidence.
                </p>
              </div>
            )}
          </div>
        </header>
      ) : null}

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
        {!hideSidebar && isAuthenticated && !isAuthPage && !isHomePage && user?.role === APP_ROLE.LANDLORD && !location.pathname.startsWith('/admin') ? (
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
        {!hideSidebar && isAuthenticated && !isAuthPage && !isHomePage && user?.role === APP_ROLE.TENANT && !location.pathname.startsWith('/admin') && !isMobileOrTablet ? (
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
            {children ?? <Outlet />}
          </main>

          {/* Footer on all pages unless hideFooter is true */}
          {!hideFooter && (
            <div className="footer-wrapper">
              <Footer />
            </div>
          )}
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

      {/* Mobile Bottom Navigation - Only visible on mobile */}
      <div className={`mobile-bottom-nav-container ${isSearchModalOpen ? 'search-modal-open' : ''}`}>
        {/* Scroll handle above the search bar */}
        {isHomePage && (
          <>
            <div
              ref={handleRef}
              className="mobile-search-handle"
              role="button"
              aria-label="Open search"
              onClick={() => handleOpenSearch(false)}
              onTouchStart={onTouchStartHandler}
              onTouchMove={onTouchMoveHandler}
              onTouchEnd={onTouchEndHandler}
            />
            {/* Search Bar - Only on Homepage */}
            <div ref={bottomBarRef} className={`mobile-bottom-search-bar ${searchPressed ? 'is-pressed' : ''}`} onClick={() => {
              if (!searchOpenedOnce) {
                handleOpenSearch(false);
              } else {
                handleOpenSearch(true);
              }
            }}
            onTouchStart={onTouchStartHandler}
            onTouchMove={onTouchMoveHandler}
            onTouchEnd={onTouchEndHandler}
            >
              <Search size={18} className="mobile-bottom-search-icon" />
              <span className="mobile-bottom-search-placeholder">find your perfect home</span>
            </div>
          </>
        )}
        
        {/* Bottom Menu Bar */}
        <nav className="mobile-bottom-menu-bar">
          {isAuthenticated && user?.role === APP_ROLE.TENANT ? (
            <>
              <NavLink
                to={userDashboardPath}
                className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                style={({ isActive }) => ({ color: isActive ? '#22c55e' : '#6b7280' })}
              >
                <LayoutGrid size={22} />
                <span>Dashboard</span>
              </NavLink>

              <NavLink
                to="/saved"
                className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                style={({ isActive }) => ({ color: isActive ? '#22c55e' : '#6b7280' })}
              >
                <Heart size={22} />
                <span>Wishlist</span>
              </NavLink>

              <NavLink
                to="/messages"
                className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                style={({ isActive }) => ({ color: isActive ? '#22c55e' : '#6b7280' })}
              >
                <MessageCircle size={22} />
                <span>Messages</span>
                {unreadCount > 0 && isAuthenticated && <span className="mobile-bottom-nav-badge">{unreadCount}</span>}
              </NavLink>

              <NavLink
                to={profileTarget}
                className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                style={({ isActive }) => ({ color: isActive ? '#22c55e' : '#6b7280' })}
              >
                <User size={22} />
                <span>{profileLabel}</span>
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to={isAuthenticated ? userDashboardPath : '/'}
                className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                style={({ isActive }) => ({ color: isActive ? '#22c55e' : '#6b7280' })}
              >
                {isAuthenticated ? <LayoutGrid size={22} /> : <Home size={22} strokeWidth={isHomePage ? 2.5 : 2} />}
                <span>{isAuthenticated ? 'Dashboard' : 'Home'}</span>
              </NavLink>

              <NavLink
                to="/saved"
                className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                style={({ isActive }) => ({ color: isActive ? '#22c55e' : '#6b7280' })}
                onClick={(e) => {
                  if (!isAuthenticated) {
                    e.preventDefault();
                    navigate('/auth/login');
                  }
                }}
              >
                <Heart size={22} strokeWidth={location.pathname === '/saved' ? 2.5 : 2} />
                <span>Wishlist</span>
              </NavLink>

              <NavLink
                to="/messages"
                className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                style={({ isActive }) => ({ color: isActive ? '#22c55e' : '#6b7280' })}
                onClick={(e) => {
                  if (!isAuthenticated) {
                    e.preventDefault();
                    navigate('/auth/login');
                  }
                }}
              >
                <MessageCircle size={22} strokeWidth={location.pathname === '/messages' ? 2.5 : 2} />
                <span>Messages</span>
                {unreadCount > 0 && isAuthenticated && <span className="mobile-bottom-nav-badge">{unreadCount}</span>}
              </NavLink>

              <NavLink
                to={profileTarget}
                className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                style={({ isActive }) => ({ color: isActive ? '#22c55e' : '#6b7280' })}
              >
                <User size={22} strokeWidth={isAuthPage ? 2.5 : 2} />
                <span>{profileLabel}</span>
              </NavLink>
            </>
          )}
        </nav>
      </div>

      {/* Mobile Search Filter Modal */}
      {isSearchModalOpen && (
        <div 
          className={`mobile-search-modal-overlay ${isSearchModalClosing ? 'is-closing' : ''}`} 
          onClick={closeSearchModal}
        >
          <div 
            className={`mobile-search-modal ${isSearchModalClosing ? 'is-closing' : ''}`} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="mobile-search-modal-header">
              <h3><Filter size={20} /> Search & Filter</h3>
              <button className="mobile-search-modal-close" onClick={closeSearchModal}>
                <X size={20} />
              </button>
            </div>

            {/* Search Input */}
            <div className="mobile-search-input-wrapper" onClick={(e) => {
              // If this modal was opened without focus (first open), a click here should focus the input
              if (!focusOnOpen) {
                setFocusOnOpen(true);
                // focus after a tiny delay to allow any scroll animation
                setTimeout(() => searchInputRef.current?.focus(), 220);
              }
            }}>
              <Search size={20} className="mobile-search-input-icon" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search location, property type..."
                className="mobile-search-input"
                // only autofocus when explicitly requested (second click)
                autoFocus={focusOnOpen}
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              />
            </div>



            {/* Price Range */}
            <div className="mobile-filter-section">
              <h4 className="mobile-filter-section-title">Price Range (TSh)</h4>
              <div className="mobile-price-range">
                <div className="mobile-price-inputs">
                  <input 
                    type="number" 
                    placeholder="Min" 
                    className="mobile-price-input"
                    value={filters.priceMin}
                    onChange={(e) => handlePriceRangeChange(Number(e.target.value), filters.priceMax)}
                  />
                  <span className="mobile-price-separator">-</span>
                  <input 
                    type="number" 
                    placeholder="Max" 
                    className="mobile-price-input"
                    value={filters.priceMax}
                    onChange={(e) => handlePriceRangeChange(filters.priceMin, Number(e.target.value))}
                  />
                </div>
                <input 
                  type="range" 
                  className="mobile-price-slider" 
                  min="0" 
                  max="5000000" 
                  step="50000"
                  value={filters.priceMax}
                  onChange={(e) => handlePriceRangeChange(filters.priceMin, Number(e.target.value))}
                />
              </div>
            </div>

            {/* Room Type Grid */}
            <div className="mobile-filter-section">
              <h4 className="mobile-filter-section-title">Room Type</h4>
              <div className="mobile-room-type-grid">
                <label className="mobile-room-type-item">
                  <input 
                    type="radio" 
                    name="roomType"
                    checked={filters.roomType === 'all'}
                    onChange={() => handleRoomTypeChange('all')}
                  />
                  <span>All Types</span>
                </label>
                <label className="mobile-room-type-item">
                  <input 
                    type="radio" 
                    name="roomType"
                    checked={filters.roomType === 'Single Room'}
                    onChange={() => handleRoomTypeChange('Single Room')}
                  />
                  <span>Single Room</span>
                </label>
                <label className="mobile-room-type-item">
                  <input 
                    type="radio"
                    name="roomType"
                    checked={filters.roomType === 'Shared Room'}
                    onChange={() => handleRoomTypeChange('Shared Room')}
                  />
                  <span>Shared Room</span>
                </label>
                <label className="mobile-room-type-item">
                  <input 
                    type="radio"
                    name="roomType"
                    checked={filters.roomType === 'Self Contained'}
                    onChange={() => handleRoomTypeChange('Self Contained')}
                  />
                  <span>Self Contained</span>
                </label>
                <label className="mobile-room-type-item">
                  <input 
                    type="radio"
                    name="roomType"
                    checked={filters.roomType === 'Studio'}
                    onChange={() => handleRoomTypeChange('Studio')}
                  />
                  <span>Studio</span>
                </label>
                <label className="mobile-room-type-item">
                  <input 
                    type="radio"
                    name="roomType"
                    checked={filters.roomType === '1 Bedroom'}
                    onChange={() => handleRoomTypeChange('1 Bedroom')}
                  />
                  <span>1 Bedroom</span>
                </label>
                <label className="mobile-room-type-item">
                  <input 
                    type="radio"
                    name="roomType"
                    checked={filters.roomType === '2 Bedroom'}
                    onChange={() => handleRoomTypeChange('2 Bedroom')}
                  />
                  <span>2 Bedroom</span>
                </label>
              </div>
            </div>

            {/* Amenities */}
            <div className="mobile-filter-section">
              <h4 className="mobile-filter-section-title">Amenities</h4>
              <div className="mobile-amenities-grid">
                <label className="mobile-amenity-item">
                  <input 
                    type="checkbox"
                    checked={filters.amenities.includes('WiFi')}
                    onChange={() => handleAmenityChange('WiFi')}
                  />
                  <Wifi size={16} />
                  <span>WiFi</span>
                </label>
                <label className="mobile-amenity-item">
                  <input 
                    type="checkbox"
                    checked={filters.amenities.includes('Parking')}
                    onChange={() => handleAmenityChange('Parking')}
                  />
                  <Car size={16} />
                  <span>Parking</span>
                </label>
                <label className="mobile-amenity-item">
                  <input 
                    type="checkbox"
                    checked={filters.amenities.includes('Water')}
                    onChange={() => handleAmenityChange('Water')}
                  />
                  <Droplets size={16} />
                  <span>Water</span>
                </label>
                <label className="mobile-amenity-item">
                  <input 
                    type="checkbox"
                    checked={filters.amenities.includes('Security')}
                    onChange={() => handleAmenityChange('Security')}
                  />
                  <Shield size={16} />
                  <span>Security</span>
                </label>
                <label className="mobile-amenity-item">
                  <input 
                    type="checkbox"
                    checked={filters.amenities.includes('Kitchen')}
                    onChange={() => handleAmenityChange('Kitchen')}
                  />
                  <Utensils size={16} />
                  <span>Kitchen</span>
                </label>
                <label className="mobile-amenity-item">
                  <input 
                    type="checkbox"
                    checked={filters.amenities.includes('Laundry')}
                    onChange={() => handleAmenityChange('Laundry')}
                  />
                  <Shirt size={16} />
                  <span>Laundry</span>
                </label>
              </div>
            </div>



            {/* Action Buttons */}
            <div className="mobile-filter-actions">
              <button className="mobile-filter-clear" onClick={handleClearFilters}>
                Clear All
              </button>
              <button 
                className="mobile-filter-apply" 
                onClick={handleApplyFilters}
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Modal */}
      {isPwaModalOpen && (
        <InstallPwaModal
          isOpen={isPwaModalOpen}
          onClose={() => setIsPwaModalOpen(false)}
          onInstall={() => {
            if (deferredPrompt) {
              deferredPrompt.prompt();
              deferredPrompt.userChoice.then(({ outcome }: any) => {
                if (outcome === 'accepted') setDeferredPrompt(null);
              });
            }
          }}
          isAndroid={isAndroid}
        />
      )}
    </div>
    </>
  );
}
