import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { normalizeAuthError } from '../lib/authErrors';

export default function RegisterStudentPage() {
  const { registerStudent, loading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    university: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords must match.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    try {
      await registerStudent({ ...formData, preferredLanguage: i18n.language });
      navigate('/', { replace: true });
    } catch (err) {
      setError(normalizeAuthError(err, 'register'));
    }
  };

  return (
    <div className="container section auth-page" style={{ display: 'flex', justifyContent: 'center' }}>
      <section
        className="card auth-form-card"
        style={{
          maxWidth: 760,
          width: '100%',
          padding: '2rem',
          borderRadius: 20,
          boxShadow: '0 18px 48px rgba(25, 45, 32, 0.18)',
          border: '1px solid var(--border)',
          background: '#fff'
        }}
      >
        <div style={{ marginBottom: '0.5rem' }}>
          <p
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.25rem 0.7rem',
              borderRadius: 999,
              background: 'rgba(42,143,99,0.12)',
              color: '#2a8f63',
              fontWeight: 700,
              fontSize: '0.78rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            {t('auth.studentRegTitle')}
          </p>
          <h1 style={{ margin: '0.35rem 0 0.2rem', fontSize: '1.8rem', fontWeight: 800 }}>
            {t('auth.studentRegTitle')}
          </h1>
          <p style={{ color: 'var(--mid)', margin: 0 }}>{t('auth.studentRegSubtitle')}</p>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <form onSubmit={onSubmit}>
          <label>
            {t('auth.fullName')}
            <input
              required
              value={formData.fullName}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, fullName: event.target.value }))
              }
            />
          </label>

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
            {t('auth.phone')}
            <input
              required
              placeholder="+2557XXXXXXXX"
              value={formData.phone}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, phone: event.target.value }))
              }
            />
          </label>

          <label>
            {t('auth.universityOptional')}
            <input
              value={formData.university}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, university: event.target.value }))
              }
              placeholder="UDSM, MUHAS, IFM..."
            />
          </label>

          <label>
            {t('auth.password')}
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                minLength={8}
                required
                value={formData.password}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder="Minimum 8 characters"
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

          <label>
            {t('auth.confirmPassword') || 'Confirm password'}
            <div className="password-field">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                minLength={8}
                required
                value={formData.confirmPassword}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, confirmPassword: event.target.value }))
                }
                placeholder="Re-enter password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                {showConfirmPassword ? t('auth.hide') : t('auth.show')}
              </button>
            </div>
          </label>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? t('auth.creatingAccount') : t('auth.createStudent')}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">{t('auth.alreadyHaveAccount')}</Link>
        </div>
      </section>
    </div>
  );
}
