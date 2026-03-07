import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterStudentPage() {
  const { registerStudent, loading } = useAuth();
  const navigate = useNavigate();

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
      await registerStudent(formData);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container section auth-page">
      <section className="card auth-form-card">
        <h1>Student Registration</h1>
        <p>Create your account to save listings and message listers.</p>

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
            University (optional)
            <input
              value={formData.university}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, university: event.target.value }))
              }
              placeholder="UDSM, MUHAS, IFM..."
            />
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
            {loading ? 'Creating account...' : 'Create student account'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">I already have an account</Link>
        </div>
      </section>
    </div>
  );
}
