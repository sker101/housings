// SignupPage now redirects to the unified LoginPage
// All auth flows (Google, Email OTP, role selection) are handled there
import { Navigate } from 'react-router-dom';

export default function SignupPage() {
  return <Navigate to="/auth/login" replace />;
}
