import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { APP_ROLE } from './lib/roles';
import AdminAuditLogPage from './pages/AdminAuditLogPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminLandlordsPage from './pages/AdminLandlordsPage';
import AdminListingsPage from './pages/AdminListingsPage';
import HomePage from './pages/HomePage';
import LandlordDashboardPage from './pages/LandlordDashboardPage';
import ListPropertyPage from './pages/ListPropertyPage';
import LoginPage from './pages/LoginPage';
import MessagesPage from './pages/MessagesPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import RegisterLandlordPage from './pages/RegisterLandlordPage';
import RegisterStudentPage from './pages/RegisterStudentPage';
import RoomDetailsPage from './pages/RoomDetailsPage';
import SavedListingsPage from './pages/SavedListingsPage';
import SearchPage from './pages/SearchPage';
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

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
