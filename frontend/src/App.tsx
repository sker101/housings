import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { APP_ROLE } from './lib/roles';
import AdminAuditLogPage from './pages/AdminAuditLogPage';
import AdminClaimsPage from './pages/AdminClaimsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminLandlordsPage from './pages/AdminLandlordsPage';
import AdminListingsPage from './pages/AdminListingsPage';
import AdminReportsPage from './pages/AdminReportsPage';
import HomePage from './pages/HomePage';
import LandlordDashboardPage from './pages/LandlordDashboardPage';
import LandlordListingsPage from './pages/LandlordListingsPage';
import LandlordTenantsPage from './pages/LandlordTenantsPage';
import LandlordUpgradePage from './pages/LandlordUpgradePage';
import ListPropertyPage from './pages/ListPropertyPage';
import LoginPage from './pages/LoginPage';
import MessagesPage from './pages/MessagesPage';
import NotFoundPage from './pages/NotFoundPage';
import NotificationsPage from './pages/NotificationsPage';
import PaymentsPage from './pages/PaymentsPage';
import ProfilePage from './pages/ProfilePage';
import RegisterLandlordPage from './pages/RegisterLandlordPage';
import RegisterStudentPage from './pages/RegisterStudentPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import RoomDetailsPage from './pages/RoomDetailsPage';
import SavedListingsPage from './pages/SavedListingsPage';
import SearchPage from './pages/SearchPage';
import LandlordAnalyticsPage from './pages/LandlordAnalyticsPage';
import ReviewsPage from './pages/ReviewsPage';
import BookingsPage from './pages/BookingsPage';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/rooms/:roomId" element={<RoomDetailsPage />} />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute roles={[APP_ROLE.STUDENT, APP_ROLE.LISTER, APP_ROLE.ADMIN]}>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/messages"
          element={
            <ProtectedRoute roles={[APP_ROLE.STUDENT, APP_ROLE.LISTER, APP_ROLE.ADMIN]}>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages/:threadId"
          element={
            <ProtectedRoute roles={[APP_ROLE.STUDENT, APP_ROLE.LISTER, APP_ROLE.ADMIN]}>
              <MessagesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/saved"
          element={
            <ProtectedRoute roles={[APP_ROLE.STUDENT, APP_ROLE.LISTER, APP_ROLE.ADMIN]}>
              <SavedListingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute roles={[APP_ROLE.STUDENT, APP_ROLE.LISTER, APP_ROLE.ADMIN]}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/list-property"
          element={
            <ProtectedRoute roles={[APP_ROLE.LISTER]}>
              <ListPropertyPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/landlord"
          element={
            <ProtectedRoute roles={[APP_ROLE.LISTER]}>
              <LandlordDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/landlord/listings"
          element={
            <ProtectedRoute roles={[APP_ROLE.LISTER]}>
              <LandlordListingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/landlord/tenants"
          element={
            <ProtectedRoute roles={[APP_ROLE.LISTER]}>
              <LandlordTenantsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/landlord/upgrade"
          element={
            <ProtectedRoute roles={[APP_ROLE.LISTER]}>
              <LandlordUpgradePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={[APP_ROLE.ADMIN]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/landlords"
          element={
            <ProtectedRoute roles={[APP_ROLE.ADMIN]}>
              <AdminLandlordsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/listings"
          element={
            <ProtectedRoute roles={[APP_ROLE.ADMIN]}>
              <AdminListingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-log"
          element={
            <ProtectedRoute roles={[APP_ROLE.ADMIN]}>
              <AdminAuditLogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute roles={[APP_ROLE.ADMIN]}>
              <AdminReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/claims"
          element={
            <ProtectedRoute roles={[APP_ROLE.ADMIN]}>
              <AdminClaimsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/landlord/payments"
          element={
            <ProtectedRoute roles={[APP_ROLE.LISTER]}>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payments"
          element={
            <ProtectedRoute roles={[APP_ROLE.STUDENT, APP_ROLE.LISTER]}>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/landlord/analytics"
          element={
            <ProtectedRoute roles={[APP_ROLE.LISTER]}>
              <LandlordAnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reviews"
          element={
            <ProtectedRoute roles={[APP_ROLE.STUDENT, APP_ROLE.LISTER, APP_ROLE.ADMIN]}>
              <ReviewsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute roles={[APP_ROLE.STUDENT, APP_ROLE.LISTER, APP_ROLE.ADMIN]}>
              <BookingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/register/student"
          element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterStudentPage />}
        />
        <Route
          path="/register/landlord"
          element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterLandlordPage />}
        />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
