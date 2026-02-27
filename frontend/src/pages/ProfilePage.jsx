import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { selectRows, updateRows } from '../lib/supabase';
import { humanizeRole } from '../lib/roles';

export default function ProfilePage() {
  const { user, token, refreshMe } = useAuth();

  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    university: user?.university || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(
    user?.landlordVerificationStatus || ''
  );

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!user?.userId || !token) {
        return;
      }

      try {
        const rows = await selectRows('profiles', {
          select: 'id,full_name,phone,university,verification_status',
          filters: [{ column: 'id', op: 'eq', value: user.userId }],
          limit: 1,
          accessToken: token
        });

        if (mounted && rows[0]) {
          setForm({
            fullName: rows[0].full_name || '',
            phone: rows[0].phone || '',
            university: rows[0].university || ''
          });
          setVerificationStatus(
            String(rows[0].verification_status || '').toUpperCase()
          );
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [user?.userId, token]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user?.userId || !token) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateRows(
        'profiles',
        {
          full_name: form.fullName.trim(),
          phone: form.phone.trim(),
          university: form.university.trim() || null
        },
        {
          filters: [{ column: 'id', op: 'eq', value: user.userId }],
          accessToken: token
        }
      );

      await refreshMe();
      setSuccess('Profile updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container section">
      <div className="section__header">
        <div>
          <h1>Profile</h1>
          <p>Manage your account and preferences.</p>
        </div>
      </div>

      <section className="card profile-card">
        <div className="profile-card__meta">
          <p>
            Role: <strong>{humanizeRole(user?.role)}</strong>
          </p>
          {verificationStatus ? (
            <p>
              Verification: <strong>{verificationStatus}</strong>
            </p>
          ) : null}
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              value={form.fullName}
              onChange={(event) => updateField('fullName', event.target.value)}
              required
            />
          </label>

          <label>
            Phone
            <input
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              required
            />
          </label>

          <label>
            University (optional)
            <input
              value={form.university}
              onChange={(event) => updateField('university', event.target.value)}
            />
          </label>

          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </section>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}
    </div>
  );
}
