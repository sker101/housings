import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { checkRateLimit, recordFailure, clearRateLimit, RateLimitError } from '../../lib/rateLimit';
import { friendlyError } from '../../utils/format';

function dashboardForRole(role: string): string {
  const r = String(role).toLowerCase();
  if (r === 'admin') return '/admin';
  if (r === 'lister' || r === 'landlord' || r === 'dalali') return '/list-property';
  return '/tenant/dashboard';
}

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const suspendedReason = params.get('reason') === 'suspended';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  // Trigger entrance animations
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(dashboardForRole(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    try {
      checkRateLimit(normalizedEmail);
    } catch (err) {
      if (err instanceof RateLimitError) {
        setError(err.message);
        return;
      }
    }

    setLoading(true);
    try {
      const result = await login({ email: normalizedEmail, password }, { rememberMe });
      clearRateLimit(normalizedEmail);
      const role = String((result as { role?: string })?.role || '').toLowerCase();
      navigate(dashboardForRole(role), { replace: true });
    } catch (err) {
      recordFailure(normalizedEmail);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated Background Elements */}
      <div className="login-bg-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>

      <div className={`login-wrapper ${isVisible ? 'is-visible' : ''}`}>
        {/* Brand Header */}
        <div className="login-brand" style={{ animationDelay: '0.1s' }}>
          <div className="login-logo">
            <ShieldCheck size={28} />
          </div>
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to continue to your dashboard</p>
        </div>

        {/* Suspended Alert */}
        {suspendedReason && (
          <div className="login-alert" style={{ animationDelay: '0.2s' }}>
            <AlertCircle size={20} />
            <div>
              <p className="login-alert-title">Account suspended</p>
              <p className="login-alert-text">Your account has been suspended. Contact support if you believe this is an error.</p>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div className="login-card" style={{ animationDelay: '0.2s' }}>
          <form onSubmit={handleSubmit} className="login-form">
            
            {/* Email Field */}
            <div className="login-field" style={{ animationDelay: '0.3s' }}>
              <label htmlFor="login-email" className="login-label">
                Email address
              </label>
              <div className="login-input-wrap">
                <Mail size={18} className="login-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="login-input"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="login-field" style={{ animationDelay: '0.4s' }}>
              <div className="login-label-row">
                <label htmlFor="login-password" className="login-label">
                  Password
                </label>
                <Link to="/reset-password" className="login-forgot">
                  Forgot password?
                </Link>
              </div>
              <div className="login-input-wrap">
                <Lock size={18} className="login-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="login-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="login-toggle-password"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <label className="login-remember" style={{ animationDelay: '0.5s' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="login-checkbox"
              />
              <span>Keep me signed in</span>
            </label>

            {/* Error Message */}
            {error && (
              <div className="login-error" style={{ animationDelay: '0.5s' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="login-submit"
              style={{ animationDelay: '0.6s' }}
            >
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sign Up Link */}
        <p className="login-footer-text" style={{ animationDelay: '0.7s' }}>
          Don't have an account?{' '}
          <Link to="/auth/signup" className="login-signup-link">
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
}
