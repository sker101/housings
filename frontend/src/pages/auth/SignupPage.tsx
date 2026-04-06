import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { friendlyError } from '../../utils/format';

type RoleOption = 'student' | 'landlord' | 'dalali';

// ─── Validation helpers ───────────────────────────────────────
function isValidPhone(phone: string): boolean {
  // Tanzanian: +255XXXXXXXXX or 07XXXXXXXX or 06XXXXXXXX
  return /^(\+255[67]\d{8}|0[67]\d{8})$/.test(phone.trim());
}

function isValidPassword(pw: string): { length: boolean; number: boolean } {
  return {
    length: pw.length >= 8,
    number: /\d/.test(pw),
  };
}

export default function SignupPage() {
  const { registerStudent, registerLandlord } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'role' | 'form'>('role');
  const [selectedRole, setSelectedRole] = useState<RoleOption>('student');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [university, setUniversity] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pwChecks = isValidPassword(password);
  const pwValid = pwChecks.length && pwChecks.number;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidPhone(phone)) {
      setError('Please enter a valid Tanzanian phone number (e.g. 0712345678 or +255712345678).');
      return;
    }

    if (!pwValid) {
      setError('Password must be at least 8 characters and contain a number.');
      return;
    }

    setLoading(true);
    try {
      if (selectedRole === 'student') {
        await registerStudent({ fullName, email, phone, password, university, preferredLanguage });
        navigate('/tenant/dashboard', { replace: true });
      } else {
        // landlord and dalali both use registerLandlord for now;
        // role stored in DB as 'lister' or 'dalali' per listerType
        const listerType = selectedRole === 'dalali' ? 'dalali' : 'owner';
        await registerLandlord({ fullName, email, phone, password, listerType, preferredLanguage });
        const dest = selectedRole === 'dalali' ? '/dalali/dashboard' : '/landlord/dashboard';
        navigate(dest, { replace: true });
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const roles: { value: RoleOption; label: string; desc: string; emoji: string }[] = [
    { value: 'student',  label: 'Student / Tenant', desc: 'Looking for a room near campus', emoji: '🎓' },
    { value: 'landlord', label: 'Landlord',          desc: 'I own rooms and want to rent them out', emoji: '🏠' },
    { value: 'dalali',   label: 'Dalali (Broker)',   desc: 'I list rooms on behalf of property owners', emoji: '🤝' },
  ];

  if (step === 'role') {
    return (
      <div className="auth-page">
        <div className="container narrow">
          <div className="auth-shell">
            <div className="auth-shell__intro">
              <p className="auth-shell__eyebrow">CampusStay TZ</p>
              <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 1.9rem)', marginTop: '0.4rem' }}>
                Create your account
              </h1>
              <p>First, tell us how you plan to use CampusStay.</p>
            </div>

            <div className="card" style={{ display: 'grid', gap: '0.6rem' }}>
              {roles.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setSelectedRole(r.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    padding: '0.9rem 1rem',
                    border: selectedRole === r.value
                      ? '2px solid var(--jade)'
                      : '2px solid var(--border)',
                    borderRadius: 12,
                    background: selectedRole === r.value ? 'var(--jade-muted)' : '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border 0.15s, background 0.15s',
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{r.emoji}</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>{r.label}</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--mid)' }}>{r.desc}</p>
                  </div>
                  {selectedRole === r.value && (
                    <Check size={16} style={{ color: 'var(--jade)', marginLeft: 'auto', flexShrink: 0 }} />
                  )}
                </button>
              ))}

              <button
                type="button"
                className="btn"
                onClick={() => setStep('form')}
                style={{ marginTop: '0.25rem' }}
              >
                Continue
              </button>

              <div style={{ textAlign: 'center' }}>
                <Link to="/auth/login" style={{ fontSize: '0.86rem', color: 'var(--jade)', fontWeight: 600 }}>
                  Already have an account? Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="container narrow">
        <div className="auth-shell">
          <div className="auth-shell__intro">
            <p className="auth-shell__eyebrow">CampusStay TZ — Sign up</p>
            <h1 style={{ fontSize: 'clamp(1.3rem, 4vw, 1.8rem)', marginTop: '0.35rem' }}>
              {selectedRole === 'student' ? 'Student account' :
               selectedRole === 'dalali' ? 'Dalali account' : 'Landlord account'}
            </h1>
            <button
              type="button"
              onClick={() => setStep('role')}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(243,237,227,0.7)',
                cursor: 'pointer',
                fontSize: '0.82rem',
                padding: 0,
              }}
            >
              ← Change role
            </button>
          </div>

          <div className="card auth-form-card">
            <form onSubmit={handleSubmit}>
              <label htmlFor="signup-name">
                Full name
                <input
                  id="signup-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Amina Juma"
                  required
                />
              </label>

              <label htmlFor="signup-email">
                Email address
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="amina@example.com"
                  required
                />
              </label>

              <label htmlFor="signup-phone">
                Phone number
                <input
                  id="signup-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678 or +255712345678"
                  required
                />
                {phone && !isValidPhone(phone) && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--red)', marginTop: '0.2rem' }}>
                    Please enter a valid Tanzanian number
                  </span>
                )}
              </label>

              {selectedRole === 'student' && (
                <label htmlFor="signup-uni">
                  University (optional)
                  <input
                    id="signup-uni"
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="e.g. UDSM, ARDHI, MUHAS"
                  />
                </label>
              )}

              <label htmlFor="signup-password">
                Password
                <div className="password-field">
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
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

              {password.length > 0 && (
                <div className="password-checklist">
                  <span className={pwChecks.length ? 'is-pass' : 'is-pending'}>
                    {pwChecks.length ? '✓' : '○'} At least 8 characters
                  </span>
                  <span className={pwChecks.number ? 'is-pass' : 'is-pending'}>
                    {pwChecks.number ? '✓' : '○'} Contains a number
                  </span>
                </div>
              )}

              {error && (
                <p
                  role="alert"
                  style={{ color: 'var(--red)', fontSize: '0.86rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}
                >
                  <AlertCircle size={14} /> {error}
                </p>
              )}

              <button
                type="submit"
                className="btn"
                disabled={loading || !pwValid}
                style={{ width: '100%' }}
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
              <Link to="/auth/login" style={{ fontSize: '0.86rem', color: 'var(--jade)', fontWeight: 600 }}>
                Already have an account? Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
