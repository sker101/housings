import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { APP_ROLE } from '../lib/roles';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const hasMinLength = formData.password.length >= 8;
  const hasNoLeadingTrailingSpace =
    formData.password.length > 0 && formData.password === formData.password.trim();

  const redirectAfterLogin = (role) => {
    const pathFromState = location.state?.from?.pathname;
    if (pathFromState) {
      navigate(pathFromState, { replace: true });
      return;
    }

    if (role === APP_ROLE.ADMIN) {
      navigate('/admin', { replace: true });
      return;
    }

    if (role === APP_ROLE.LISTER) {
      navigate('/landlord', { replace: true });
      return;
    }

    navigate('/', { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!hasMinLength) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!hasNoLeadingTrailingSpace) {
      setError('Password cannot start or end with spaces.');
      return;
    }

    try {
      const response = await login(
        {
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        },
        { rememberMe: formData.rememberMe }
      );

      redirectAfterLogin(response.role);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container section auth-page">
      <section className="auth-shell">
        <aside className="auth-shell__intro">
          <p className="auth-shell__eyebrow">Welcome back</p>
          <h1>Sign in to CampusStay TZ</h1>
          <p>Access verified listings, saved homes, and conversations in one place.</p>
        </aside>

        <article className="auth-shell__form card">
          <h2>Login</h2>
          {error ? <p className="error-text">{error}</p> : null}

          <form onSubmit={handleSubmit}>
            <label>
              Email
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
              Password
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
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            <div className="password-checklist">
              <span className={hasMinLength ? 'is-pass' : 'is-pending'}>
                {hasMinLength ? 'OK' : '...'} At least 8 characters
              </span>
              <span className={hasNoLeadingTrailingSpace ? 'is-pass' : 'is-pending'}>
                {hasNoLeadingTrailingSpace ? 'OK' : '...'} No leading/trailing spaces
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
              <span>Remember password</span>
            </label>

            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="auth-links">
            <Link to="/register/student">Create student account</Link>
            <Link to="/register/landlord">Create lister account</Link>
          </div>
        </article>
      </section>
    </div>
  );
}
