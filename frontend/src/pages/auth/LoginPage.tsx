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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      background: 'radial-gradient(circle at top right, rgba(29, 158, 117, 0.08), transparent 400px), var(--surface)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        
        {/* Brand Banner */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            background: 'var(--jade)',
            color: '#fff',
            borderRadius: '14px',
            marginBottom: '1rem',
            boxShadow: '0 8px 16px rgba(29, 158, 117, 0.25)',
          }}>
            <ShieldCheck size={24} />
          </div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: '1.8rem',
            fontWeight: 800,
            color: 'var(--ink)',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em'
          }}>
            Welcome Back
          </h1>
          <p style={{ color: 'var(--mid)', fontSize: '0.95rem' }}>
            Enter your details to access your dashboard.
          </p>
        </div>

        {/* Suspended Alert */}
        {suspendedReason && (
          <div style={{
            background: 'var(--red-light)',
            border: '1px solid rgba(192,57,43,0.2)',
            borderRadius: 14,
            padding: '1rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <AlertCircle size={18} style={{ color: 'var(--red)', marginTop: 2, flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 700, color: 'var(--red)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>Account suspended</p>
              <p style={{ color: 'var(--red)', fontSize: '0.84rem', lineHeight: 1.4 }}>Your account has been suspended. Contact support if you believe this is an error.</p>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: 24,
          padding: '2.5rem 2rem',
          boxShadow: '0 12px 36px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03)',
          border: '1px solid rgba(0,0,0,0.04)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
            
            {/* Email Field */}
            <div>
              <label htmlFor="login-email" style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--ink)',
                marginBottom: '0.5rem'
              }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--mid)' }} />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem 0.85rem 2.75rem',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--jade)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label htmlFor="login-password" style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--ink)'
                }}>
                  Password
                </label>
                <Link to="/reset-password" style={{
                  fontSize: '0.8rem',
                  color: 'var(--jade)',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--mid)' }} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '0.85rem 2.75rem 0.85rem 2.75rem',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--jade)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--mid)',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 8
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: 16,
                  height: 16,
                  accentColor: 'var(--jade)',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '0.87rem', color: 'var(--mid)' }}>Keep me signed in</span>
            </label>

            {/* Error Message */}
            {error && (
              <div style={{
                background: 'var(--red-light)',
                color: 'var(--red)',
                padding: '0.75rem 1rem',
                borderRadius: 10,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                animation: 'shake 0.4s ease-in-out'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'var(--jade)',
                color: '#fff',
                border: 'none',
                height: 48,
                borderRadius: 12,
                fontSize: '1rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                marginTop: '0.5rem'
              }}
            >
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  Sign In <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          marginTop: '2rem',
          fontSize: '0.9rem',
          color: 'var(--mid)'
        }}>
          Don't have an account?{' '}
          <Link to="/auth/signup" style={{
            color: 'var(--jade)',
            fontWeight: 700,
            textDecoration: 'none'
          }}>
            Create one now
          </Link>
        </p>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
