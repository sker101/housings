import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Check, UserPlus, Mail, Lock, Phone, GraduationCap, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { friendlyError } from '../../utils/format';
import { APP_ROLE, dashboardDefaultPath } from '../../lib/roles';

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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [university, setUniversity] = useState('');
  const [preferredLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  // Trigger entrance animations
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const pwChecks = isValidPassword(password);
  const pwValid = pwChecks.length && pwChecks.number;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidPhone(phone)) {
      setError('Please enter a valid Tanzanian phone number (e.g. 0712345678 or +255712345678).');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
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
        navigate(dashboardDefaultPath(APP_ROLE.STUDENT), { replace: true });
      } else {
        const listerType = selectedRole === 'dalali' ? 'dalali' : 'owner';
        await registerLandlord({ fullName, email, phone, password, listerType, preferredLanguage });
        const appRole = selectedRole === 'dalali' ? APP_ROLE.DALALI : APP_ROLE.LISTER;
        navigate(dashboardDefaultPath(appRole), { replace: true });
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const roles: { value: RoleOption; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: 'student',  label: 'Student / Tenant', desc: 'Looking for a room near campus', icon: <GraduationCap size={24} /> },
    { value: 'landlord', label: 'Landlord',          desc: 'I own rooms and want to rent them out', icon: <span style={{ fontSize: '1.5rem' }}>🏠</span> },
    { value: 'dalali',   label: 'Dalali (Broker)',   desc: 'I list rooms on behalf of property owners', icon: <span style={{ fontSize: '1.5rem' }}>🤝</span> },
  ];

  if (step === 'role') {
    return (
      <div className="signup-page">
        {/* Animated Background Elements */}
        <div className="signup-bg-shapes">
          <div className="shape shape-1" />
          <div className="shape shape-2" />
          <div className="shape shape-3" />
        </div>

        <div className={`signup-wrapper ${isVisible ? 'is-visible' : ''}`}>
          {/* Brand Header */}
          <div className="signup-brand" style={{ animationDelay: '0.1s' }}>
            <div className="signup-logo">
              <UserPlus size={28} />
            </div>
            <h1 className="signup-title">Create Account</h1>
            <p className="signup-subtitle">Choose how you want to use CampusStay</p>
          </div>

          {/* Role Selection Card */}
          <div className="signup-card" style={{ animationDelay: '0.2s' }}>
            <div className="signup-role-list">
              {roles.map((r, index) => (
                <button
                  key={r.value}
                  type="button"
                  className={`signup-role-option ${selectedRole === r.value ? 'is-selected' : ''}`}
                  onClick={() => setSelectedRole(r.value)}
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                >
                  <div className="signup-role-icon">{r.icon}</div>
                  <div className="signup-role-info">
                    <p className="signup-role-label">{r.label}</p>
                    <p className="signup-role-desc">{r.desc}</p>
                  </div>
                  {selectedRole === r.value && (
                    <Check size={20} className="signup-role-check" />
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="signup-submit"
              onClick={() => setStep('form')}
              style={{ animationDelay: '0.6s' }}
            >
              Continue <ArrowRight size={18} />
            </button>
          </div>

          {/* Sign In Link */}
          <p className="signup-footer-text" style={{ animationDelay: '0.7s' }}>
            Already have an account?{' '}
            <Link to="/auth/login" className="signup-signin-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-page">
      {/* Animated Background Elements */}
      <div className="signup-bg-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>

      <div className={`signup-wrapper ${isVisible ? 'is-visible' : ''}`}>
        {/* Back Button */}
        <button
          type="button"
          className="signup-back-btn"
          onClick={() => setStep('role')}
          style={{ animationDelay: '0.1s' }}
        >
          <ArrowLeft size={18} /> Back to roles
        </button>

        {/* Brand Header */}
        <div className="signup-brand" style={{ animationDelay: '0.1s' }}>
          <div className="signup-logo">
            <UserPlus size={28} />
          </div>
          <h1 className="signup-title">
            {selectedRole === 'student' ? 'Student Account' :
             selectedRole === 'dalali' ? 'Dalali Account' : 'Landlord Account'}
          </h1>
          <p className="signup-subtitle">Fill in your details to get started</p>
        </div>

        {/* Signup Form Card */}
        <div className="signup-card" style={{ animationDelay: '0.2s' }}>
          <form onSubmit={handleSubmit} className="signup-form">
            {/* Full Name Field */}
            <div className="signup-field" style={{ animationDelay: '0.3s' }}>
              <label htmlFor="signup-name" className="signup-label">Full name</label>
              <div className="signup-input-wrap">
                <UserPlus size={18} className="signup-input-icon" />
                <input
                  id="signup-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Amina Juma"
                  required
                  className="signup-input"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="signup-field" style={{ animationDelay: '0.35s' }}>
              <label htmlFor="signup-email" className="signup-label">Email address</label>
              <div className="signup-input-wrap">
                <Mail size={18} className="signup-input-icon" />
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="amina@example.com"
                  required
                  className="signup-input"
                />
              </div>
            </div>

            {/* Phone Field */}
            <div className="signup-field" style={{ animationDelay: '0.4s' }}>
              <label htmlFor="signup-phone" className="signup-label">Phone number</label>
              <div className="signup-input-wrap">
                <Phone size={18} className="signup-input-icon" />
                <input
                  id="signup-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712345678 or +255712345678"
                  required
                  className="signup-input"
                />
              </div>
              {phone && !isValidPhone(phone) && (
                <span className="signup-field-error">Please enter a valid Tanzanian number</span>
              )}
            </div>

            {/* University Field (only for students) */}
            {selectedRole === 'student' && (
              <div className="signup-field" style={{ animationDelay: '0.45s' }}>
                <label htmlFor="signup-uni" className="signup-label">University (optional)</label>
                <div className="signup-input-wrap">
                  <GraduationCap size={18} className="signup-input-icon" />
                  <input
                    id="signup-uni"
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="e.g. UDSM, ARDHI, MUHAS"
                    className="signup-input"
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div className="signup-field" style={{ animationDelay: '0.5s' }}>
              <label htmlFor="signup-password" className="signup-label">Password</label>
              <div className="signup-input-wrap">
                <Lock size={18} className="signup-input-icon" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="signup-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="signup-toggle-password"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="signup-field" style={{ animationDelay: '0.52s' }}>
              <label htmlFor="signup-confirm-password" className="signup-label">Confirm password</label>
              <div className="signup-input-wrap">
                <Lock size={18} className="signup-input-icon" />
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="signup-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="signup-toggle-password"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <span className="signup-field-error">Passwords do not match</span>
              )}
            </div>

            {/* Password Checklist */}
            {password.length > 0 && (
              <div className="signup-password-checklist" style={{ animationDelay: '0.55s' }}>
                <span className={pwChecks.length ? 'is-pass' : 'is-pending'}>
                  {pwChecks.length ? '✓' : '○'} At least 8 characters
                </span>
                <span className={pwChecks.number ? 'is-pass' : 'is-pending'}>
                  {pwChecks.number ? '✓' : '○'} Contains a number
                </span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="signup-error" style={{ animationDelay: '0.55s' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !pwValid || password !== confirmPassword}
              className="signup-submit"
              style={{ animationDelay: '0.6s' }}
            >
              {loading ? (
                <>
                  <span className="signup-spinner" />
                  Creating account…
                </>
              ) : (
                <>
                  Create account <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sign In Link */}
        <p className="signup-footer-text" style={{ animationDelay: '0.7s' }}>
          Already have an account?{' '}
          <Link to="/auth/login" className="signup-signin-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
