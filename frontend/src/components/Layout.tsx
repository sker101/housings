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
import SmartInstallBanner from './SmartInstallBanner';
import { Menu, Globe, UserPlus, LogIn, HelpCircle, X, Home, User, Download, Moon, Sun, Map, Accessibility, Search, Heart, MessageCircle, Wifi, Car, Droplets, Shield, Utensils, Shirt, Filter, Star, LayoutGrid, Bell, Smartphone, Tablet, Zap, Share2, PlusCircle, CheckCircle2, Chrome, AppWindow } from 'lucide-react';
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
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSearchModalClosing, setIsSearchModalClosing] = useState(false);
  const [searchOpenedOnce, setSearchOpenedOnce] = useState(false);
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

  // Scroll to top and lock body when search modal opens
  useEffect(() => {
    if (isSearchModalOpen) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // if we should focus immediately (second-click), do so after scroll
      if (focusOnOpen) {
        setTimeout(() => searchInputRef.current?.focus(), 260);
      }
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      // reset the first-open flag when modal closes so next open behaves like first tap
      setSearchOpenedOnce(false);
      setFocusOnOpen(false);
      setSearchPressed(false);
      // Unlock body scroll
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isSearchModalOpen, focusOnOpen]);


  const hasSyncedLanguage = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const a11yRef = useRef<HTMLDivElement>(null);
  const [isA11yOpen, setIsA11yOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLogoActive, setIsLogoActive] = useState(false);
  const [isBrandActive, setIsBrandActive] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Consolidated Click Outside Handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      // Close profile menu if clicking outside
      if (isProfileMenuOpen && profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        const profileToggleBtn = (target as HTMLElement).closest('.profile-menu-toggle');
        if (!profileToggleBtn) {
          setIsProfileMenuOpen(false);
        }
      }
      
      // Close accessibility menu if clicking outside
      if (isA11yOpen && a11yRef.current && !a11yRef.current.contains(target)) {
        // Find the toggle button - use a more specific selector
        const toggleBtn = (target as HTMLElement).closest('.topbar-action-btn');
        if (toggleBtn && toggleBtn.getAttribute('title') === 'Accessibility') {
          return; // Ignore if clicking the accessibility button itself
        }
        setIsA11yOpen(false);
      }

      // Close user menu if clicking outside
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
    }

    if (isA11yOpen || isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isA11yOpen, isMenuOpen]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsSidebarOpen(false);
    setIsMenuOpen(false);
    setIsA11yOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
            select: 'id', filters: [{ column: 'landlord_id', op: 'eq', value: user.userId }, { column: 'status', op: 'eq', value: 'approved' }],
            limit: 1000, accessToken: token
          });
          const pendingRows = await selectRows('bookings', {
            select: 'id', filters: [{ column: 'landlord_id', op: 'eq', value: user.userId }, { column: 'status', op: 'eq', value: 'requested' }],
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
          <header className={`topbar ${isHomePage ? 'topbar--on-homepage' : ''}`}>
            {/* ROW 1: IMAGE BANNER (All Pages) */}
            {
              <div
                className="notification-row"
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
                <style>{`
                  @media (min-width: 769px) {
                    .banner-container {
                      justify-content: center !important;
                    }
                    .banner-logo {
                      position: absolute;
                      left: 1rem;
                    }
                    .banner-text {
                      margin-left: 0 !important;
                    }
                  }
                  @media (max-width: 768px) {
                    .banner-container {
                      justify-content: flex-start !important;
                    }
                    .banner-logo {
                      position: relative;
                      left: auto;
                    }
                  }
                `}</style>
                <div className="banner-container" style={{ 
                  width: '100%',
                  maxWidth: '1200px',
                  padding: '0.35rem 1rem', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '0.75rem',
                  position: 'relative'
                }}>
                  {/* iRent Logo - Left Side */}
                  <button
                    type="button"
                    className={`topbar-action-btn banner-logo ${isLogoActive ? 'is-active' : ''}`}
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
                  <div className="banner-text" style={{ textAlign: 'center', marginLeft: '0.5rem' }}>
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
            }

            {/* ROW 2: NAVBAR */}
            <div className="topbar__inner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {isAuthenticated && user?.role === APP_ROLE.ADMIN && (
                  <button 
                    type="button" 
                    className="topbar-action-btn"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    style={{ marginLeft: '-0.5rem', marginRight: '0.25rem' }}
                  >
                    <Menu size={20} />
                  </button>
                )}
                <button
                  type="button"
                  className={`topbar-action-btn ${isBrandActive ? 'is-active' : ''}`}
                  onClick={() => {
                    setIsBrandActive(!isBrandActive);
                    navigate('/');
                  }}
                  style={{ padding: 0, background: 'transparent', border: 'none' }}
                >
                  <span className="brand-text"><em>i</em>Rent</span>
                </button>
              </div>

              <div className="topbar__nav">
                <style>{`
                  .icon-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2px;
                    padding: 6px 10px;
                    border-radius: 10px;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: #64748b;
                    font-size: 0.7rem;
                    font-weight: 500;
                    min-width: 56px;
                  }
                  .icon-btn:hover {
                    background: #f1f5f9;
                    color: #1e293b;
                  }
                  .icon-btn.is-active {
                    background: #e2e8f0;
                    color: #1e293b;
                  }
                  .icon-btn svg {
                    transition: transform 0.2s ease;
                  }
                  .icon-btn:hover svg {
                    transform: scale(1.1);
                  }
                  @media (max-width: 768px) {
                    .icon-btn-label { display: none; }
                    .icon-btn { min-width: 40px; padding: 8px; }
                  }
                  .profile-menu {
                    position: absolute;
                    right: 0;
                    top: calc(100% + 8px);
                    background: white;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                    border-radius: 12px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    padding: 6px;
                    min-width: 180px;
                    animation: slideUpFade 0.2s ease-out;
                    z-index: 9999;
                  }
                  .profile-menu__item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: transparent;
                    border: none;
                    padding: 10px 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 500;
                    color: #334155;
                    transition: all 0.2s;
                    text-align: left;
                    width: 100%;
                    white-space: nowrap;
                  }
                  .profile-menu__item:hover {
                    background: #f8fafc;
                    color: #16a34a;
                  }
                  .profile-menu__item svg {
                    color: #64748b;
                    flex-shrink: 0;
                  }
                  .profile-menu__item:hover svg {
                    color: #16a34a;
                  }
                `}</style>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  {/* Show map toggle on homepage */}
                  {isHomePage && (
                    <button 
                      type="button" 
                      className={`icon-btn ${homeViewMode === 'map' ? 'is-active' : ''}`}
                      onClick={() => {
                        console.log('Map toggle clicked, current mode:', homeViewMode);
                        toggleHomePageView();
                      }}
                      title="Toggle View"
                    >
                      {homeViewMode === 'map' ? <LayoutGrid size={20} /> : <Map size={20} />}
                      <span className="icon-btn-label">{homeViewMode === 'map' ? 'Grid' : 'Map'}</span>
                    </button>
                  )}

                  {isAuthenticated && (
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => navigate('/notifications')}
                      title="Notifications"
                      style={{ position: 'relative' }}
                    >
                      <Bell size={20} />
                      <span className="icon-btn-label">Alerts</span>
                      {notifCount > 0 && (
                        <span className="notification-badge" style={{ position: 'absolute', top: '2px', right: '8px' }}>{notifCount > 99 ? '99+' : notifCount}</span>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    className={`icon-btn ${isA11yOpen ? 'is-active' : ''}`}
                    onClick={() => setIsA11yOpen(!isA11yOpen)}
                    title="Accessibility"
                  >
                    <Accessibility size={20} />
                    <span className="icon-btn-label">A11y</span>
                  </button>

                  {isA11yOpen && (
                    <div className="a11y-menu" ref={a11yRef}>
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

                  {/* Profile Menu Button */}
                  <button
                    type="button"
                    className={`icon-btn profile-menu-toggle ${isProfileMenuOpen ? 'is-active' : ''}`}
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    title="Profile"
                    style={{ position: 'relative' }}
                  >
                    <User size={20} />
                    <span className="icon-btn-label">{isAuthenticated ? user?.fullName?.split(' ')[0] || 'User' : 'Login'}</span>
                  </button>

                  {/* Profile Dropdown Menu */}
                  {isProfileMenuOpen && (
                    <div className="profile-menu" ref={profileMenuRef}>
                      {isAuthenticated ? (
                        <>
                          <div style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', marginBottom: '4px' }}>
                            <p style={{ margin: 0, fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{user?.fullName || 'User'}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{user?.email}</p>
                          </div>
                          <Link to="/profile" className="profile-menu__item" onClick={() => setIsProfileMenuOpen(false)}>
                            <User size={16} />
                            <span>Profile</span>
                          </Link>
                          <Link to={userDashboardPath} className="profile-menu__item" onClick={() => setIsProfileMenuOpen(false)}>
                            <LayoutGrid size={16} />
                            <span>Dashboard</span>
                          </Link>
                          {/* Show Switch Account if user has multiple roles with same email - this would need backend logic */}
                          <button type="button" className="profile-menu__item" onClick={() => { logout(); setIsProfileMenuOpen(false); }}>
                            <LogIn size={16} style={{ transform: 'rotate(180deg)' }} />
                            <span>Logout</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <Link to="/auth/login" className="profile-menu__item" onClick={() => setIsProfileMenuOpen(false)}>
                            <LogIn size={16} />
                            <span>Login</span>
                          </Link>
                          <Link to="/register" className="profile-menu__item" onClick={() => setIsProfileMenuOpen(false)}>
                            <UserPlus size={16} />
                            <span>Join iRent</span>
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
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
                >
                  <LayoutGrid size={22} />
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/saved"
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
                  {unreadCount > 0 && isAuthenticated && <span className="mobile-bottom-nav-badge">{unreadCount}</span>}
                </NavLink>

                <NavLink
                  to={profileTarget}
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <User size={22} />
                  <span>{profileLabel}</span>
                </NavLink>
              </>
            ) : isAuthenticated && user?.role === APP_ROLE.ADMIN ? (
              <>
                <NavLink
                  to="/admin/users"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <User size={22} />
                  <span>Users</span>
                </NavLink>

                <NavLink
                  to="/admin/landlords"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <Shield size={22} />
                  <span>Vetting</span>
                </NavLink>

                <NavLink
                  to="/admin/listings"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <Home size={22} />
                  <span>Listings</span>
                </NavLink>

                <NavLink
                  to="/admin/reports"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  <Bell size={22} />
                  <span>Reports</span>
                </NavLink>
              </>
            ) : (
              <>
                <NavLink
                  to={isAuthenticated ? userDashboardPath : '/'}
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
                >
                  {isAuthenticated ? <LayoutGrid size={22} /> : <Home size={22} strokeWidth={isHomePage ? 2.5 : 2} />}
                  <span>{isAuthenticated ? 'Dashboard' : 'Home'}</span>
                </NavLink>

                <NavLink
                  to="/saved"
                  className={({ isActive }) => `mobile-bottom-menu-item ${isActive ? 'is-active' : ''}`}
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

      {/* Header and other UI components continue below */}


      <SmartInstallBanner />
    </div>
    </>
  );
}
