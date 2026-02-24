import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboardPage from './pages/AdminDashboardPage';
import HomePage from './pages/HomePage';
import LandlordDashboardPage from './pages/LandlordDashboardPage';
import ListPropertyPage from './pages/ListPropertyPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterLandlordPage from './pages/RegisterLandlordPage';
import RegisterStudentPage from './pages/RegisterStudentPage';
import RoomDetailsPage from './pages/RoomDetailsPage';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/rooms/:roomId" element={<RoomDetailsPage />} />
        <Route path="/list-property" element={<ListPropertyPage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/register/student" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterStudentPage />} />
        <Route path="/register/landlord" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterLandlordPage />} />

        <Route
          path="/landlord"
          element={
            <ProtectedRoute roles={['LANDLORD']}>
              <LandlordDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
