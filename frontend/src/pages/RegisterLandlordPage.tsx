import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LISTER_TYPES = [
  { value: 'owner', label: 'Property Owner' },
  { value: 'manager', label: 'Property Manager' },
  { value: 'dalali', label: 'Dalali / Agent' }
];

export default function RegisterLandlordPage() {
  const { registerLandlord, loading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    listerType: 'owner',
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
    <div className="container section auth-page">
      <section className="card auth-form-card">
        <h1>Lister Registration</h1>
        <p>Register as an owner, manager, or dalali to submit verified listings.</p>

        {error ? <p className="error-text">{error}</p> : null}

        <form onSubmit={onSubmit}>
          <label>
            Full name
            <input
              required
              value={formData.fullName}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, fullName: event.target.value }))
              }
            />
          </label>

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
            Phone number
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
            Lister type
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
            Password
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
            {loading ? 'Creating account...' : 'Create lister account'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">I already have an account</Link>
        </div>
      </section>
    </div>
  );
}
