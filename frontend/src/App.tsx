import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';

// ── Public pages ──────────────────────────────────────────────
import Layout from './components/Layout';
import HomePage          from './pages/HomePage';
import SearchPage        from './pages/SearchPage';
import RoomDetailsPage   from './pages/RoomDetailsPage';
import NotFoundPage      from './pages/NotFoundPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// ── Auth pages (new) ──────────────────────────────────────────
import LoginPage  from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';

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

// ── Landlord pages ────────────────────────────────────────────
import LandlordDashboard     from './pages/landlord/Dashboard';
import LandlordInquiries     from './pages/landlord/Inquiries';
import LandlordListingsPage  from './pages/LandlordListingsPage';
import LandlordTenantsPage   from './pages/LandlordTenantsPage';
import LandlordAnalyticsPage from './pages/LandlordAnalyticsPage';
import LandlordUpgradePage   from './pages/LandlordUpgradePage';
import ListPropertyPage      from './pages/ListPropertyPage';
import PaymentsPage          from './pages/PaymentsPage';

// ── Dalali pages ──────────────────────────────────────────────
import DalaliDashboard    from './pages/dalali/Dashboard';
import DalaliProperties   from './pages/dalali/Properties';
import DalaliNewProperty  from './pages/dalali/NewProperty';
import DalaliInquiries    from './pages/dalali/Inquiries';
import DalaliEarnings     from './pages/dalali/Earnings';
import DalaliSubscription from './pages/dalali/Subscription';

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

type AllRoles = 'student' | 'landlord' | 'dalali' | 'admin';
const ALL: AllRoles[] = ['student', 'landlord', 'dalali', 'admin'];

/** Wrap in public Layout for logged out / public pages */
function PL({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <>
      <Toaster position="bottom-right" />
      <Routes>

        {/* ── Public ──────────────────────────────────────── */}
        <Route path="/"              element={<PL><HomePage /></PL>} />
        <Route path="/listings"      element={<PL><SearchPage /></PL>} />
        <Route path="/listings/:id"  element={<PL><RoomDetailsPage /></PL>} />
        <Route path="/search"        element={<Navigate to="/listings" replace />} />
        <Route path="/rooms/:roomId" element={<PL><RoomDetailsPage /></PL>} />
        <Route path="/reset-password"    element={<PL><ResetPasswordPage /></PL>} />

        {/* ── Auth ────────────────────────────────────────── */}
        <Route path="/auth/login"        element={<LoginPage />} />
        <Route path="/auth/signup"       element={<SignupPage />} />
        <Route path="/login"             element={<Navigate to="/auth/login" replace />} />
        <Route path="/register/student"  element={<Navigate to="/auth/signup" replace />} />
        <Route path="/register/landlord" element={<Navigate to="/auth/signup" replace />} />

        {/* ── Authenticated Routes (RoleBasedLayout) ────── */}
        <Route element={<RoleBasedLayout />}>
          
          {/* Shared multi-role */}
          <Route path="/profile"            element={<ProtectedRoute roles={ALL}><ProfilePage /></ProtectedRoute>} />
          <Route path="/notifications"      element={<ProtectedRoute roles={ALL}><NotificationsPage /></ProtectedRoute>} />
          <Route path="/messages"           element={<ProtectedRoute roles={ALL}><MessagesPage /></ProtectedRoute>} />
          <Route path="/messages/:threadId" element={<ProtectedRoute roles={ALL}><MessagesPage /></ProtectedRoute>} />
          <Route path="/bookings"           element={<ProtectedRoute roles={ALL}><BookingsPage /></ProtectedRoute>} />
          <Route path="/reviews"            element={<ProtectedRoute roles={ALL}><ReviewsPage /></ProtectedRoute>} />
          <Route path="/list-property"      element={<ProtectedRoute roles={['landlord', 'dalali']}><ListPropertyPage /></ProtectedRoute>} />
          <Route path="/payments"           element={<ProtectedRoute roles={['landlord', 'dalali']}><PaymentsPage /></ProtectedRoute>} />

          {/* Tenant */}
          <Route path="/tenant/dashboard" element={<ProtectedRoute roles={['student']}><TenantDashboard /></ProtectedRoute>} />
          <Route path="/tenant/search"    element={<ProtectedRoute roles={['student']}><SearchPage /></ProtectedRoute>} />
          <Route path="/tenant/saved"     element={<ProtectedRoute roles={['student']}><SavedListingsPage /></ProtectedRoute>} />
          <Route path="/tenant/messages"  element={<ProtectedRoute roles={['student']}><MessagesPage /></ProtectedRoute>} />
          <Route path="/tenant/bookings"  element={<ProtectedRoute roles={['student']}><BookingsPage /></ProtectedRoute>} />
          <Route path="/tenant/profile"   element={<ProtectedRoute roles={['student']}><ProfilePage /></ProtectedRoute>} />
          <Route path="/pay"              element={<ProtectedRoute roles={['student']}><PayPage /></ProtectedRoute>} />
          
          <Route path="/my-room"          element={<Navigate to="/tenant/dashboard" replace />} />
          <Route path="/saved"            element={<Navigate to="/tenant/saved" replace />} />

          {/* Landlord */}
          <Route path="/landlord/dashboard" element={<ProtectedRoute roles={['landlord']}><LandlordDashboard /></ProtectedRoute>} />
          <Route path="/landlord/listings"  element={<ProtectedRoute roles={['landlord']}><LandlordListingsPage /></ProtectedRoute>} />
          <Route path="/landlord/listings/new" element={<ProtectedRoute roles={['landlord']}><ListPropertyPage /></ProtectedRoute>} />
          <Route path="/landlord/inquiries" element={<ProtectedRoute roles={['landlord']}><LandlordInquiries /></ProtectedRoute>} />
          <Route path="/landlord/tenants"   element={<ProtectedRoute roles={['landlord']}><LandlordTenantsPage /></ProtectedRoute>} />
          <Route path="/landlord/analytics" element={<ProtectedRoute roles={['landlord']}><LandlordAnalyticsPage /></ProtectedRoute>} />
          <Route path="/landlord/upgrade"   element={<ProtectedRoute roles={['landlord']}><LandlordUpgradePage /></ProtectedRoute>} />
          <Route path="/landlord/payments"  element={<ProtectedRoute roles={['landlord']}><PaymentsPage /></ProtectedRoute>} />
          <Route path="/landlord"           element={<Navigate to="/landlord/dashboard" replace />} />

          {/* Dalali */}
          <Route path="/dalali/dashboard"    element={<ProtectedRoute roles={['dalali']}><DalaliDashboard /></ProtectedRoute>} />
          <Route path="/dalali/properties"   element={<ProtectedRoute roles={['dalali']}><DalaliProperties /></ProtectedRoute>} />
          <Route path="/dalali/properties/new" element={<ProtectedRoute roles={['dalali']}><DalaliNewProperty /></ProtectedRoute>} />
          <Route path="/dalali/inquiries"    element={<ProtectedRoute roles={['dalali']}><DalaliInquiries /></ProtectedRoute>} />
          <Route path="/dalali/earnings"     element={<ProtectedRoute roles={['dalali']}><DalaliEarnings /></ProtectedRoute>} />
          <Route path="/dalali/subscription" element={<ProtectedRoute roles={['dalali']}><DalaliSubscription /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin"           element={<ProtectedRoute roles={['admin']}><AdminDashboardPage /></ProtectedRoute>} />
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
          <Route path="/admin/landlords" element={<ProtectedRoute roles={['admin']}><AdminAuditLogPage /></ProtectedRoute>} />

        </Route>

        {/* ── 404 ─────────────────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
