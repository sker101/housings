import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { normalizeAuthError } from '../lib/authErrors';

const useListerTypes = (t) => [
  { value: 'owner', label: t('auth.owner') },
  { value: 'manager', label: t('auth.manager') },
  { value: 'dalali', label: t('auth.dalali') }
];

export default function RegisterLandlordPage() {
  const { registerLandlord, loading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const LISTER_TYPES = useListerTypes(t);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    nidaNumber: '',
    listerType: 'owner',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

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

    if (!/^[0-9]{20}$/.test(formData.nidaNumber)) {
      setError('NIDA number must be exactly 20 digits (numbers only).');
      return;
    }

    try {
      await registerLandlord({ ...formData, preferredLanguage: i18n.language });
      navigate('/', { replace: true });
    } catch (err) {
      setError(normalizeAuthError(err, 'register'));
    }
  };

  return (
    <div className="container section auth-page">
      <section className="card auth-form-card">
        <h1>{t('auth.listerRegTitle')}</h1>
        <p>{t('auth.listerRegSubtitle')}</p>

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
              placeholder="07XXXXXXXX"
              value={formData.phone}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, phone: event.target.value }))
              }
            />
          </label>

          <label>
            NIDA Number
            <input
              required
              inputMode="numeric"
              placeholder="20 digits, numbers only"
              value={formData.nidaNumber}
              maxLength={20}
              onChange={(event) =>
                setFormData((prev) => ({ 
                  ...prev, 
                  nidaNumber: event.target.value.replace(/\D/g, '').slice(0, 20)
                }))
              }
            />
          </label>

          <label>
            {t('auth.listerType')}
            <select
              value={formData.listerType}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, listerType: event.target.value }))
              }
            >
              {LISTER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t('auth.password')}
            <input
              type="password"
              minLength={8}
              required
              value={formData.password}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, password: event.target.value }))
              }
            />
          </label>

          <label>
            {t('auth.confirmPassword') || 'Confirm Password'}
            <input
              type="password"
              minLength={8}
              required
              value={formData.confirmPassword}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, confirmPassword: event.target.value }))
              }
            />
          </label>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? t('auth.creatingAccount') : t('auth.createLister')}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">{t('auth.alreadyHaveAccount')}</Link>
        </div>
      </section>
    </div>
  );
}
