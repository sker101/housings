import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import PageErrorBoundary from './components/PageErrorBoundary';

// ── Public pages ──────────────────────────────────────────────
import Layout from './components/Layout';
import HomePage          from './pages/HomePage';
import SearchPage        from './pages/SearchPage';
import RoomDetailsPage   from './pages/RoomDetailsPage';
import NotFoundPage      from './pages/NotFoundPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// ── Auth pages (new) ──────────────────────────────────────────
import LoginPage          from './pages/auth/LoginPage';
import SignupPage         from './pages/auth/SignupPage';
import OAuthCallback      from './pages/auth/OAuthCallback';
import CompleteProfilePage from './pages/auth/CompleteProfilePage';
import VerifyEmailPage    from './pages/auth/VerifyEmailPage';

// ── Shared Dashboard Layout (Role-based) ──────────────────────
import RoleBasedLayout from './components/RoleBasedLayout';

// ── Tenant pages ──────────────────────────────────────────────
import TenantDashboard   from './pages/tenant/Dashboard';
import MessagesPage      from './pages/MessagesPage';
import SavedListingsPage from './pages/SavedListingsPage';
import ProfilePage       from './pages/ProfilePage';
import BookingsPage      from './pages/BookingsPage';
import ReviewsPage       from './pages/ReviewsPage';
import NotificationsPage from './pages/NotificationsPage';
import PayPage           from './pages/PayPage';
import MyRoomPage        from './pages/MyRoomPage';

// ── Landlord pages ────────────────────────────────────────────
import LandlordDashboard     from './pages/landlord/Dashboard';
import LandlordInquiries     from './pages/landlord/Inquiries';
import LandlordListingsPage  from './pages/LandlordListingsPage';
import LandlordTenantsPage   from './pages/LandlordTenantsPage';
import LandlordAnalyticsPage from './pages/LandlordAnalyticsPage';
import LandlordUpgradePage   from './pages/LandlordUpgradePage';
import ListPropertyPage      from './pages/ListPropertyPage';
import PaymentsPage          from './pages/PaymentsPage';

// ── Property Manager pages ────────────────────────────────────
import ManagerDashboard    from './pages/manager/Dashboard';
import ManagerProperties   from './pages/manager/Properties';
import ManagerNewProperty  from './pages/manager/NewProperty';
import ManagerInquiries    from './pages/manager/Inquiries';
import ManagerEarnings     from './pages/manager/Earnings';
import ManagerSubscription from './pages/manager/Subscription';

// ── Admin pages ───────────────────────────────────────────────
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage     from './pages/admin/UsersPage';
import AdminListingsPage  from './pages/AdminListingsPage';
import AdminReportsPage   from './pages/AdminReportsPage';
import AdminClaimsPage    from './pages/AdminClaimsPage';
import AdminAccessPage    from './pages/AdminAccessPage';
import AdminDisputesPage  from './pages/AdminDisputesPage';
import AdminFlagsPage     from './pages/AdminFlagsPage';
import AdminConfigPage    from './pages/AdminConfigPage';
import AdminAuditPage     from './pages/AdminAuditPage';
import AdminAuditLogPage  from './pages/AdminAuditLogPage';
import AdminLandlordsPage from './pages/AdminLandlordsPage';

type AllRoles = 'tenant' | 'landlord' | 'property_manager' | 'admin';
const ALL: AllRoles[] = ['tenant', 'landlord', 'property_manager', 'admin'];

/** Wrap in public Layout for logged out / public pages */
function PL({ children, hideSidebar = false, hideHeader = false, hideFooter = false }: { children: React.ReactNode; hideSidebar?: boolean; hideHeader?: boolean; hideFooter?: boolean }) {
  return <Layout hideSidebar={hideSidebar} hideHeader={hideHeader} hideFooter={hideFooter}>{children}</Layout>;
}

/** Room Details Layout - No sidebar/nav/footer for logged in users */
function RoomDetailsLayout({ children }: { children: React.ReactNode }) {
  return <Layout hideSidebar={true} hideHeader={true} hideFooter={true}>{children}</Layout>;
}

export default function App() {
  return (
    <>
      <Toaster position="bottom-right" />
      <Routes>

        {/* ── Public ──────────────────────────────────────── */}
        <Route path="/"              element={<PL><HomePage /></PL>} />
        <Route path="/listings"      element={<PL><SearchPage /></PL>} />
        <Route path="/listings/:roomId" element={<PageErrorBoundary><RoomDetailsLayout><RoomDetailsPage /></RoomDetailsLayout></PageErrorBoundary>} />
        <Route path="/search"        element={<Navigate to="/listings" replace />} />
        <Route path="/rooms/:roomId" element={<PageErrorBoundary><RoomDetailsLayout><RoomDetailsPage /></RoomDetailsLayout></PageErrorBoundary>} />
        <Route path="/reset-password"    element={<PL><ResetPasswordPage /></PL>} />

        {/* ── Auth ────────────────────────────────────────── */}
        <Route path="/auth/login"           element={<PL><LoginPage /></PL>} />
        <Route path="/auth/signup"          element={<PL><SignupPage /></PL>} />
        <Route path="/auth/callback"        element={<PL><OAuthCallback /></PL>} />
        <Route path="/auth/verify-email"    element={<PL><VerifyEmailPage /></PL>} />
        <Route path="/auth/complete-profile" element={<ProtectedRoute roles={ALL}><CompleteProfilePage /></ProtectedRoute>} />
        <Route path="/login"                element={<Navigate to="/auth/login" replace />} />
        <Route path="/register"             element={<Navigate to="/auth/signup" replace />} />
        {/* Legacy /list-property route — now lives under /landlord/properties/new */}
        <Route path="/list-property"     element={<Navigate to="/landlord/properties/new" replace />} />
        <Route path="/list-property/*"   element={<Navigate to="/landlord/properties/new" replace />} />

        {/* ── Authenticated Routes ────── */}
        <Route element={<RoleBasedLayout />}>
          
          {/* Shared multi-role */}
          <Route path="/profile"            element={<ProtectedRoute roles={ALL}><ProfilePage /></ProtectedRoute>} />
          <Route path="/notifications"      element={<ProtectedRoute roles={ALL}><NotificationsPage /></ProtectedRoute>} />
          <Route path="/messages"           element={<ProtectedRoute roles={ALL}><MessagesPage /></ProtectedRoute>} />
          <Route path="/messages/:threadId" element={<ProtectedRoute roles={ALL}><MessagesPage /></ProtectedRoute>} />

          {/* Tenant */}
          <Route path="/tenant/dashboard" element={<ProtectedRoute roles={['tenant']}><TenantDashboard /></ProtectedRoute>} />
          <Route path="/tenant/search"    element={<ProtectedRoute roles={['tenant']}><SearchPage /></ProtectedRoute>} />
          <Route path="/tenant/saved"     element={<ProtectedRoute roles={['tenant']}><SavedListingsPage /></ProtectedRoute>} />
          <Route path="/tenant/messages"  element={<ProtectedRoute roles={['tenant']}><MessagesPage /></ProtectedRoute>} />
          <Route path="/tenant/bookings"  element={<ProtectedRoute roles={['tenant']}><BookingsPage /></ProtectedRoute>} />
          <Route path="/tenant/profile"   element={<ProtectedRoute roles={['tenant']}><ProfilePage /></ProtectedRoute>} />
          <Route path="/tenant/payments"  element={<ProtectedRoute roles={['tenant']}><PayPage /></ProtectedRoute>} />
          <Route path="/tenant/reviews"   element={<ProtectedRoute roles={['tenant']}><ReviewsPage /></ProtectedRoute>} />
          <Route path="/my-room"          element={<ProtectedRoute roles={['tenant']}><MyRoomPage /></ProtectedRoute>} />
          {/* Shorthand aliases for tenant routes */}
          <Route path="/saved"            element={<Navigate to="/tenant/saved" replace />} />
          <Route path="/bookings"         element={<Navigate to="/tenant/bookings" replace />} />
          <Route path="/reviews"          element={<Navigate to="/tenant/reviews" replace />} />
          <Route path="/pay"              element={<Navigate to="/tenant/payments" replace />} />
          <Route path="/tenant"           element={<Navigate to="/tenant/dashboard" replace />} />

          {/* Landlord */}
          <Route path="/landlord/dashboard" element={<ProtectedRoute roles={['landlord']}><LandlordDashboard /></ProtectedRoute>} />
          <Route path="/landlord/properties" element={<ProtectedRoute roles={['landlord']}><LandlordListingsPage /></ProtectedRoute>} />
          <Route path="/landlord/properties/new" element={<ProtectedRoute roles={['landlord']}><ListPropertyPage /></ProtectedRoute>} />
          <Route path="/landlord/inquiries" element={<ProtectedRoute roles={['landlord']}><LandlordInquiries /></ProtectedRoute>} />
          <Route path="/landlord/tenants"   element={<ProtectedRoute roles={['landlord']}><LandlordTenantsPage /></ProtectedRoute>} />
          <Route path="/landlord/analytics" element={<ProtectedRoute roles={['landlord']}><LandlordAnalyticsPage /></ProtectedRoute>} />
          <Route path="/landlord/upgrade"   element={<ProtectedRoute roles={['landlord']}><LandlordUpgradePage /></ProtectedRoute>} />
          <Route path="/landlord/payments"  element={<ProtectedRoute roles={['landlord']}><PaymentsPage /></ProtectedRoute>} />
          {/* Redirect common alias URLs → canonical paths */}
          <Route path="/landlord/listings"      element={<Navigate to="/landlord/properties" replace />} />
          <Route path="/landlord/listings/new"  element={<Navigate to="/landlord/properties/new" replace />} />
          <Route path="/landlord/list-property" element={<Navigate to="/landlord/properties/new" replace />} />
          <Route path="/landlord"               element={<Navigate to="/landlord/dashboard" replace />} />

          {/* Property Manager */}
          <Route path="/manager/dashboard"    element={<ProtectedRoute roles={['property_manager']}><ManagerDashboard /></ProtectedRoute>} />
          <Route path="/manager/properties"   element={<ProtectedRoute roles={['property_manager']}><ManagerProperties /></ProtectedRoute>} />
          <Route path="/manager/properties/new" element={<ProtectedRoute roles={['property_manager']}><ManagerNewProperty /></ProtectedRoute>} />
          <Route path="/manager/inquiries"    element={<ProtectedRoute roles={['property_manager']}><ManagerInquiries /></ProtectedRoute>} />
          <Route path="/manager/earnings"     element={<ProtectedRoute roles={['property_manager']}><ManagerEarnings /></ProtectedRoute>} />
          <Route path="/manager/subscription" element={<ProtectedRoute roles={['property_manager']}><ManagerSubscription /></ProtectedRoute>} />
          <Route path="/manager"              element={<Navigate to="/manager/dashboard" replace />} />

          {/* Admin */}
          <Route path="/admin"           element={<ProtectedRoute roles={['admin']}><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/users"     element={<ProtectedRoute roles={['admin']}><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/admin/listings"  element={<ProtectedRoute roles={['admin']}><AdminListingsPage /></ProtectedRoute>} />
          <Route path="/admin/payments"  element={<ProtectedRoute roles={['admin']}><PaymentsPage /></ProtectedRoute>} />
          <Route path="/admin/disputes"  element={<ProtectedRoute roles={['admin']}><AdminDisputesPage /></ProtectedRoute>} />
          <Route path="/admin/reports"   element={<ProtectedRoute roles={['admin']}><AdminReportsPage /></ProtectedRoute>} />
          <Route path="/admin/claims"    element={<ProtectedRoute roles={['admin']}><AdminClaimsPage /></ProtectedRoute>} />
          <Route path="/admin/access"    element={<ProtectedRoute roles={['admin']}><AdminAccessPage /></ProtectedRoute>} />
          <Route path="/admin/flags"     element={<ProtectedRoute roles={['admin']}><AdminFlagsPage /></ProtectedRoute>} />
          <Route path="/admin/config"    element={<ProtectedRoute roles={['admin']}><AdminConfigPage /></ProtectedRoute>} />
          <Route path="/admin/audit"     element={<ProtectedRoute roles={['admin']}><AdminAuditPage /></ProtectedRoute>} />
          <Route path="/admin/audit-log" element={<ProtectedRoute roles={['admin']}><AdminAuditLogPage /></ProtectedRoute>} />
          <Route path="/admin/landlords" element={<ProtectedRoute roles={['admin']}><AdminLandlordsPage /></ProtectedRoute>} />

        </Route>

        {/* ── 404 ─────────────────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
