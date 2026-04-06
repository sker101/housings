import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { checkRateLimit, recordFailure, clearRateLimit, RateLimitError } from '../../lib/rateLimit';
import { APP_ROLE } from '../../lib/roles';
import { friendlyError } from '../../utils/format';
import toast from 'react-hot-toast';

function dashboardForRole(role: string): string {
  const r = String(role).toLowerCase();
  if (r === 'admin') return '/admin';
  if (r === 'lister' || r === 'landlord') return '/landlord/dashboard';
  if (r === 'dalali') return '/dalali/dashboard';
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

    // ── Rate limit check ──────────────────────────────────
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
    <div className="auth-page">
      <div className="container narrow">
        <div className="auth-shell">
          {/* Intro card */}
          <div className="auth-shell__intro">
            <p className="auth-shell__eyebrow">CampusStay TZ</p>
            <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 1.9rem)', marginTop: '0.4rem' }}>
              Welcome back
            </h1>
            <p>Sign in to access your dashboard.</p>
          </div>

          {/* Suspended banner */}
          {suspendedReason && (
            <div
              style={{
                background: 'var(--red-light)',
                border: '1px solid rgba(192,57,43,0.3)',
                borderRadius: 12,
                padding: '0.85rem 1rem',
                display: 'flex',
                gap: '0.6rem',
                alignItems: 'flex-start',
              }}
            >
              <AlertCircle size={16} style={{ color: 'var(--red)', marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 700, color: 'var(--red)', fontSize: '0.9rem' }}>
                  Account suspended
                </p>
                <p style={{ color: 'var(--red)', fontSize: '0.84rem' }}>
                  Your account has been suspended. Contact support if you believe this is an error.
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="card auth-form-card">
            <form onSubmit={handleSubmit}>
              <label htmlFor="login-email">
                Email address
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label htmlFor="login-password">
                Password
                <div className="password-field">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <label className="remember-me" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  <span style={{ fontSize: '0.86rem', fontWeight: 400 }}>Remember me</span>
                </label>
                <Link
                  to="/reset-password"
                  style={{ fontSize: '0.86rem', color: 'var(--jade)', fontWeight: 600 }}
                >
                  Forgot password?
                </Link>
              </div>

              {error && (
                <p
                  role="alert"
                  style={{
                    color: 'var(--red)',
                    fontSize: '0.86rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <AlertCircle size={14} /> {error}
                </p>
              )}

              <button type="submit" className="btn" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="auth-links" style={{ justifyContent: 'center', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.87rem', color: 'var(--mid)' }}>No account?</span>
              <Link to="/auth/signup" style={{ fontSize: '0.87rem', color: 'var(--jade)', fontWeight: 600 }}>
                Create one
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
