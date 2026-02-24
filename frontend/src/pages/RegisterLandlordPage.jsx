import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterLandlordPage() {
  const { registerLandlord, loading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    identityDocumentPlaceholder: '',
    password: ''
  });
  const [error, setError] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await registerLandlord(formData);
      navigate('/landlord', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container narrow">
      <section className="auth-card">
        <h1>Landlord onboarding</h1>
        <p>
          Your account and first listing require admin verification before public visibility.
        </p>

        {error ? <p className="error-text">{error}</p> : null}

        <form onSubmit={onSubmit}>
          <label>
            Full name
            <input
              required
              value={formData.fullName}
              onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              required
              value={formData.email}
              onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>

          <label>
            Phone number (required)
            <input
              required
              placeholder="+2557XXXXXXXX"
              value={formData.phone}
              onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </label>

          <label>
            ID document placeholder
            <input
              required
              placeholder="NIDA-XXXXXX or file reference"
              value={formData.identityDocumentPlaceholder}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, identityDocumentPlaceholder: event.target.value }))
              }
            />
          </label>

          <label>
            Password
            <input
              type="password"
              minLength={8}
              required
              value={formData.password}
              onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
            />
          </label>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit onboarding'}
          </button>
        </form>
      </section>
    </div>
  );
}
