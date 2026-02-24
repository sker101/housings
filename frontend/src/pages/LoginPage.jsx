import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const redirectAfterLogin = (role) => {
    const pathFromState = location.state?.from?.pathname;
    if (pathFromState) {
      navigate(pathFromState, { replace: true });
      return;
    }

    if (role === 'ADMIN') {
      navigate('/admin', { replace: true });
      return;
    }

    if (role === 'LANDLORD') {
      navigate('/landlord', { replace: true });
      return;
    }

    navigate('/', { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await login(formData);
      redirectAfterLogin(response.role);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container login-page">
      <section className="login-shell">
        <aside className="login-shell__intro">
          <p className="login-shell__eyebrow">Welcome back</p>
          <h1>Sign in to CampusStay TZ</h1>
          <p>
            Access verified housing tools, manage listings, and keep your student housing journey scam-free.
          </p>
          <ul className="login-benefits">
            <li>Verified listings only</li>
            <li>Direct contact with landlords</li>
            <li>No brokers. No scams.</li>
          </ul>
        </aside>

        <article className="login-shell__form">
          <h2>Account login</h2>
          <p>Use your registered email and password.</p>

          {error ? <p className="error-text">{error}</p> : null}

          <form onSubmit={handleSubmit}>
            <label>
              Email address
              <input
                type="email"
                required
                value={formData.email}
                onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="you@example.com"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                required
                value={formData.password}
                onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="••••••••"
              />
            </label>

            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="auth-links">
            <Link to="/register/student">Create student account</Link>
            <Link to="/register/landlord">Create landlord account</Link>
          </div>
        </article>
      </section>
    </div>
  );
}
