import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function RegisterStudentPage() {
  const { registerStudent, loading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    university: '',
    password: ''
  });
  const [error, setError] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await registerStudent({ ...formData, preferredLanguage: i18n.language });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container section auth-page">
      <section className="card auth-form-card">
        <h1>{t('auth.studentRegTitle')}</h1>
        <p>{t('auth.studentRegSubtitle')}</p>

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
