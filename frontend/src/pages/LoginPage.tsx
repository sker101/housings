import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { normalizeAuthError } from '../lib/authErrors';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);

  const hasMinLength = formData.password.length >= 8;
  const hasNoLeadingTrailingSpace =
    formData.password.length > 0 && formData.password === formData.password.trim();

  const redirectAfterLogin = () => {
    const pathFromState = location.state?.from?.pathname;
    if (pathFromState) {
      navigate(pathFromState, { replace: true });
      return;
    }
    navigate('/', { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setEmailNotConfirmed(false);

    if (!hasMinLength) { setError('Password must be at least 8 characters.'); return; }
    if (!hasNoLeadingTrailingSpace) { setError('Password cannot start or end with spaces.'); return; }

    try {
      await login(
        { email: formData.email.trim().toLowerCase(), password: formData.password },
        { rememberMe: formData.rememberMe }
      );
      redirectAfterLogin();
    } catch (err) {
      const msg: string = (err as any).message || '';
      if (msg.toLowerCase().includes('email not confirmed')) {
        setEmailNotConfirmed(true);
        setError(normalizeAuthError(err, 'login'));
      } else {
        setError(normalizeAuthError(err, 'login'));
      }
    }
  };

  return (
    <div className="container section auth-page">
      <section className="auth-shell">
        <aside className="auth-shell__intro">
          <p className="auth-shell__eyebrow">{t('auth.welcomeBack')}</p>
          <h1>{t('auth.signInTitle')}</h1>
          <p>{t('auth.signInSubtitle')}</p>
        </aside>

        <article className="auth-shell__form card">
          <h2>{t('auth.login')}</h2>
          {error ? <p className="error-text">{error}</p> : null}

          {emailNotConfirmed ? (
            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--surface-2, #f8f9fa)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Check your inbox for a verification link. Didn&apos;t receive it?
              </p>
              <Link
                to={`/reset-password?resend=1&email=${encodeURIComponent(formData.email)}`}
                className="btn btn--small btn--ghost"
              >
                Resend verification email
              </Link>
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <label>
              {t('auth.email')}
              <input
                type="email"
                required
                value={formData.email}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, email: event.target.value }))
                }
              />
            </label>

            <label>
              {t('auth.password')}
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, password: event.target.value }))
                  }
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? t('auth.hide') : t('auth.show')}
                </button>
              </div>
            </label>

            <div className="password-checklist">
              <span className={hasMinLength ? 'is-pass' : 'is-pending'}>
                {hasMinLength ? 'OK' : '...'} {t('auth.minPassword')}
              </span>
              <span className={hasNoLeadingTrailingSpace ? 'is-pass' : 'is-pending'}>
                {hasNoLeadingTrailingSpace ? 'OK' : '...'} {t('auth.noSpaces')}
              </span>
            </div>

            <label className="remember-me">
              <input
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, rememberMe: event.target.checked }))
                }
              />
              <span>{t('auth.rememberMe')}</span>
            </label>

            <button className="btn" type="submit" disabled={loading}>
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>

          <div className="auth-links">
            <Link to="/reset-password">Forgot password?</Link>
            <Link to="/auth/signup?role=tenant">{t('auth.createStudent')}</Link>
            <Link to="/auth/signup?role=landlord">{t('auth.createLister')}</Link>
          </div>
        </article>
      </section>
    </div>
  );
}
