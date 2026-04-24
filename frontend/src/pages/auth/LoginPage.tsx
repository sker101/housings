import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// Airbnb-style Unified Login / Signup
// ─────────────────────────────────────────────────────────────
type Step = 'entry' | 'otp' | 'role' | 'admin';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    signInWithGoogle,
    sendMagicLinkEmail,
    verifyEmailCode,
    login,
    user,
    isAuthenticated,
    loading: authLoading,
  } = useAuth();

  const [step, setStep] = useState<Step>('entry');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [selectedRole, setSelectedRole] = useState<string>('tenant');
  const [adminPassword, setAdminPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      const from = (location.state as any)?.from?.pathname;
      if (from && !from.startsWith('/auth')) {
        navigate(from, { replace: true });
        return;
      }
      const dest = getDashboard(user.role);
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, user, authLoading, navigate, location]);

  // OTP countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function getDashboard(role: string): string {
    switch (role) {
      case 'landlord': return '/landlord/dashboard';
      case 'property_manager': return '/manager/dashboard';
      case 'admin': return '/admin';
      default: return '/tenant/dashboard';
    }
  }

  // ── Google sign-in ──────────────────────────────────────────
  const handleGoogle = async () => {
    setBusy(true);
    setError('');
    try {
      // Store role if user selected one before clicking Google
      if (selectedRole) {
        sessionStorage.setItem('oauth_signup_role', selectedRole);
      }
      await signInWithGoogle(selectedRole);
    } catch {
      setError('Google sign-in failed. Please try again.');
      setBusy(false);
    }
  };

  // ── Email submit → send OTP ─────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    // Check if admin email
    const adminEmails = ['admin@campusstay.co', 'admin@irent.co.tz'];
    if (adminEmails.includes(email.toLowerCase().trim())) {
      setStep('admin');
      return;
    }

    setBusy(true);
    setError('');
    try {
      // Store role for new users
      sessionStorage.setItem('oauth_signup_role', selectedRole);
      await sendMagicLinkEmail(email.trim());
      setStep('otp');
      setCountdown(60);
      toast.success('Verification code sent to your email!');
    } catch (err: any) {
      setError(err?.message || 'Failed to send verification code');
    } finally {
      setBusy(false);
    }
  };

  // ── OTP input handling ──────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otpCode];
    next[index] = value.slice(-1);
    setOtpCode(next);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...otpCode];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
    setOtpCode(next);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  // ── Verify OTP ──────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) return;
    setBusy(true);
    setError('');
    try {
      const authUser = await verifyEmailCode(email.trim(), code);
      if (authUser) {
        toast.success('Welcome! 🎉', { duration: 2000 });
        const dest = getDashboard(authUser.role);
        navigate(dest, { replace: true });
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid code. Please check and try again.');
    } finally {
      setBusy(false);
    }
  };

  // ── Resend OTP ──────────────────────────────────────────────
  const handleResend = async () => {
    if (countdown > 0) return;
    setBusy(true);
    try {
      await sendMagicLinkEmail(email.trim());
      setCountdown(60);
      setOtpCode(['', '', '', '', '', '']);
      toast.success('New code sent!');
    } catch {
      toast.error('Failed to resend code');
    } finally {
      setBusy(false);
    }
  };

  // ── Admin login ─────────────────────────────────────────────
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login({ email: email.trim(), password: adminPassword });
      toast.success('Welcome, Admin!', { duration: 2000 });
      navigate('/admin', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Invalid admin credentials');
    } finally {
      setBusy(false);
    }
  };

  // ─── RENDER ─────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .auth-input:focus { outline: none; border-color: #166534 !important; box-shadow: 0 0 0 3px rgba(22,101,52,0.08) !important; }
        .auth-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.12) !important; }
        .auth-btn:active:not(:disabled) { transform: translateY(0); }
        .role-opt:hover { border-color: #a7f3d0 !important; background: #f0fdf4 !important; }
        .otp-box:focus { border-color: #166534 !important; box-shadow: 0 0 0 3px rgba(22,101,52,0.12) !important; }
        .link-btn:hover { color: #166534 !important; }
      `}</style>

      <div style={S.card}>
        {/* ── Header ──────────────────────── */}
        <div style={S.header}>
          <div style={S.logo}>
            <img src="/icon-192.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} />
          </div>
          <h1 style={S.title}>
            {step === 'otp' ? 'Check your email' : step === 'admin' ? 'Admin Access' : 'Welcome to iRent'}
          </h1>
          <p style={S.subtitle}>
            {step === 'otp'
              ? <>Enter the 6-digit code sent to <strong style={{color:'#0f172a'}}>{email}</strong></>
              : step === 'admin'
              ? 'Enter your admin password'
              : 'Sign in or create your account'}
          </p>
        </div>

        <div style={S.body}>
          {/* ── Step: ENTRY ─────────────────── */}
          {step === 'entry' && (
            <div style={S.fadeIn}>
              {/* Google button */}
              <button className="auth-btn" onClick={handleGoogle} disabled={busy} style={S.googleBtn}>
                {busy ? <span style={S.spinner}/> : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* Divider */}
              <div style={S.divider}><span style={S.dividerText}>or</span></div>

              {/* Email form */}
              <form onSubmit={handleEmailSubmit}>
                <label style={S.label}>Email address</label>
                <input
                  className="auth-input"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@example.com"
                  style={S.input}
                  autoComplete="email"
                  required
                />
                <button className="auth-btn" type="submit" disabled={busy || !email.trim()} style={S.primaryBtn}>
                  {busy ? <span style={S.spinnerW}/> : 'Continue with email'}
                </button>
              </form>

              {/* Role selector */}
              <div style={{ marginTop: '1.5rem' }}>
                <p style={S.roleLabel}>I want to</p>
                <div style={S.roleRow}>
                  {([
                    ['tenant', '🏠', 'Find a home'],
                    ['landlord', '🔑', 'List property'],
                    ['property_manager', '🏢', 'Manage properties'],
                  ] as const).map(([val, icon, lbl]) => (
                    <button
                      key={val}
                      className="role-opt"
                      onClick={() => setSelectedRole(val)}
                      style={selectedRole === val ? {...S.roleBtn, ...S.roleBtnActive} : S.roleBtn}
                    >
                      <span style={{fontSize:'1.25rem'}}>{icon}</span>
                      <span style={{fontSize:'0.75rem',fontWeight:600,color: selectedRole===val ? '#166534':'#64748b'}}>{lbl}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p style={S.error}>{error}</p>}

              <p style={S.terms}>
                By continuing, you agree to our <a href="/terms" style={S.link}>Terms</a> and <a href="/privacy" style={S.link}>Privacy Policy</a>
              </p>
            </div>
          )}

          {/* ── Step: OTP ──────────────────── */}
          {step === 'otp' && (
            <div style={S.fadeIn}>
              <div style={S.otpRow} onPaste={handleOtpPaste}>
                {otpCode.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    className="otp-box"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    style={S.otpInput}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                className="auth-btn"
                onClick={handleVerifyOtp}
                disabled={busy || otpCode.join('').length !== 6}
                style={S.primaryBtn}
              >
                {busy ? <span style={S.spinnerW}/> : 'Verify & Sign In'}
              </button>

              {error && <p style={S.error}>{error}</p>}

              <div style={{textAlign:'center',marginTop:'1.25rem'}}>
                <button className="link-btn" onClick={handleResend} disabled={countdown > 0 || busy} style={S.textBtn}>
                  {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
                </button>
              </div>

              <button className="link-btn" onClick={() => { setStep('entry'); setOtpCode(['','','','','','']); setError(''); }} style={{...S.textBtn, marginTop:'0.5rem', display:'block', margin:'0.5rem auto 0'}}>
                ← Use a different email
              </button>
            </div>
          )}

          {/* ── Step: ADMIN ────────────────── */}
          {step === 'admin' && (
            <div style={S.fadeIn}>
              <form onSubmit={handleAdminLogin}>
                <label style={S.label}>Password</label>
                <input
                  className="auth-input"
                  type="password"
                  value={adminPassword}
                  onChange={e => { setAdminPassword(e.target.value); setError(''); }}
                  placeholder="Enter admin password"
                  style={S.input}
                  autoFocus
                  required
                />
                <button className="auth-btn" type="submit" disabled={busy || !adminPassword} style={S.primaryBtn}>
                  {busy ? <span style={S.spinnerW}/> : 'Sign In as Admin'}
                </button>
              </form>

              {error && <p style={S.error}>{error}</p>}

              <button className="link-btn" onClick={() => { setStep('entry'); setError(''); }} style={{...S.textBtn, display:'block', margin:'1rem auto 0'}}>
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Trust badge */}
      <div style={S.trust}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span>256-bit encrypted · Verified properties</span>
      </div>
    </div>
  );
};

// ── STYLES ────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem 1rem',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    background: 'linear-gradient(135deg, #f8faf9 0%, #ecfdf5 50%, #f0fdf4 100%)',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#ffffff',
    borderRadius: '20px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 50px -12px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    border: '1px solid rgba(0,0,0,0.04)',
  },
  header: {
    padding: '2.5rem 2rem 1rem',
    textAlign: 'center',
  },
  logo: {
    width: '52px',
    height: '52px',
    background: 'linear-gradient(135deg, #166534, #15803d)',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.25rem',
    boxShadow: '0 8px 20px rgba(22,101,52,0.25)',
  },
  title: {
    fontSize: '1.625rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 0.375rem',
    letterSpacing: '-0.025em',
  },
  subtitle: {
    fontSize: '0.9375rem',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
  },
  body: {
    padding: '1.25rem 2rem 2rem',
  },
  fadeIn: {
    animation: 'fadeUp 0.3s ease-out',
  },
  googleBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.625rem',
    padding: '0.875rem 1rem',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#0f172a',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  divider: {
    position: 'relative',
    height: '1px',
    background: '#f1f5f9',
    margin: '1.25rem 0',
    textAlign: 'center',
  },
  dividerText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#ffffff',
    padding: '0 0.75rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#94a3b8',
  },
  label: {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '0.375rem',
  },
  input: {
    width: '100%',
    padding: '0.8125rem 0.875rem',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '0.9375rem',
    color: '#0f172a',
    background: '#fafbfc',
    transition: 'all 0.15s ease',
    marginBottom: '0.75rem',
    boxSizing: 'border-box',
  },
  primaryBtn: {
    width: '100%',
    padding: '0.875rem 1rem',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #166534, #15803d)',
    color: '#ffffff',
    fontSize: '0.9375rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 2px 8px rgba(22,101,52,0.25)',
  },
  roleLabel: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#94a3b8',
    margin: '0 0 0.5rem',
    textAlign: 'center',
  },
  roleRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
  },
  roleBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.625rem 0.375rem',
    borderRadius: '10px',
    border: '1.5px solid #f1f5f9',
    background: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  roleBtnActive: {
    borderColor: '#166534',
    background: '#f0fdf4',
    boxShadow: '0 0 0 3px rgba(22,101,52,0.06)',
  },
  otpRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
    marginBottom: '1.25rem',
  },
  otpInput: {
    width: '3rem',
    height: '3.25rem',
    textAlign: 'center',
    fontSize: '1.375rem',
    fontWeight: 700,
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    background: '#fafbfc',
    color: '#0f172a',
    transition: 'all 0.15s ease',
    outline: 'none',
  },
  textBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '0.25rem',
    transition: 'color 0.15s ease',
  },
  error: {
    color: '#dc2626',
    fontSize: '0.8125rem',
    fontWeight: 500,
    textAlign: 'center',
    margin: '0.75rem 0 0',
    padding: '0.5rem 0.75rem',
    background: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca',
  },
  terms: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: '1.5rem',
    lineHeight: 1.5,
  },
  link: {
    color: '#166534',
    textDecoration: 'underline',
    fontWeight: 500,
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #e2e8f0',
    borderTopColor: '#166534',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    margin: '0 auto',
    display: 'block',
  },
  spinnerW: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    margin: '0 auto',
    display: 'block',
  },
  trust: {
    marginTop: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontWeight: 500,
  },
};

export default LoginPage;
