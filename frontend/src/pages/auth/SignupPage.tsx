// SignupPage now redirects to the unified LoginPage
// All auth flows (Google, Email OTP, role selection) are handled there
import { Navigate, useLocation } from 'react-router-dom';

export default function SignupPage() {
  const { search } = useLocation();
  return <Navigate to={`/auth/login${search}`} replace />;
}
