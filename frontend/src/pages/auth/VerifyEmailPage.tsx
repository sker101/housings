import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardDefaultPath } from '../../lib/roles';

export default function VerifyEmailPage() {
  const { verifyEmailCode, sendMagicLinkEmail, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const emailFromUrl = params.get('email') || '';
  
  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    navigate(dashboardDefaultPath(user.role), { replace: true });
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !code) {
      setError('Please enter your email and the verification code');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyEmailCode(email, code);
      if (result) {
        // Successfully verified
        navigate(dashboardDefaultPath(result.role), { replace: true });
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid verification code';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setResendLoading(true);
    setError('');
    try {
      await sendMagicLinkEmail(email);
      alert('A new verification code has been sent to your email!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend code';
      setError(message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>

      <div className={`login-wrapper ${isVisible ? 'is-visible' : ''}`}>
        <div className="login-brand" style={{ animationDelay: '0.1s' }}>
          <div className="login-logo">
            <ShieldCheck size={28} />
          </div>
          <h1 className="login-title">Check Your Email</h1>
          <p className="login-subtitle">
            {emailFromUrl 
              ? `We sent a code to ${emailFromUrl}` 
              : 'Enter your email and the verification code we sent you'}
          </p>
        </div>

        <div className="login-card" style={{ animationDelay: '0.2s' }}>
          <div style={{ padding: '2rem 1.5rem' }}>
            <form onSubmit={handleSubmit} className="login-form" style={{ padding: 0 }}>
              {/* Email Field */}
              <div className="login-field" style={{ animationDelay: '0.3s' }}>
                <label htmlFor="verify-email" className="login-label">
                  Email address
                </label>
                <div className="login-input-wrap">
                  <Mail size={18} className="login-input-icon" />
                  <input
                    id="verify-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="login-input"
                    readOnly={!!emailFromUrl}
                  />
                </div>
              </div>

              {/* Code Field */}
              <div className="login-field" style={{ animationDelay: '0.4s', marginTop: '1rem' }}>
                <label htmlFor="verify-code" className="login-label">
                  Verification Code
                </label>
                <div className="login-input-wrap">
                  <input
                    id="verify-code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Enter 6-digit code"
                    required
                    maxLength={10}
                    autoFocus
                    className="login-input"
                    style={{ paddingLeft: '1rem', fontSize: '1.1rem', letterSpacing: '0.1em', textAlign: 'center' }}
                  />
                </div>
              </div>

              {error && (
                <div className="login-error" style={{ animationDelay: '0.5s' }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="login-submit"
                style={{ animationDelay: '0.6s', marginTop: '1.5rem' }}
              >
                {loading ? (
                  <>
                    <span className="login-spinner" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify & Sign In <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Resend Link */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--mid)', margin: 0 }}>
                Didn&apos;t receive the code?{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--jade)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {resendLoading ? 'Sending...' : 'Resend code'}
                </button>
              </p>
            </div>
          </div>
        </div>

        <p className="login-footer-text" style={{ animationDelay: '0.7s' }}>
          <Link to="/auth/login" className="login-signup-link">
            ← Back to sign in
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
      `}</style>
    </div>
  );
}
