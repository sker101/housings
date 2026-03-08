import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { invokeFunction, selectRows, updateRows } from '../lib/supabase';
import { humanizeRole } from '../lib/roles';

function humanizeReason(value) {
  if (!value) {
    return 'Unable to verify phone number.';
  }

  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ProfilePage() {
  const { user, token, refreshMe } = useAuth();
  const { t } = useTranslation();

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
  const [phoneVerified, setPhoneVerified] = useState(Boolean(user?.phoneVerified));
  const [storedPhone, setStoredPhone] = useState(user?.phone || '');
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpHint, setOtpHint] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!user?.userId || !token) {
        return;
      }

      try {
        const rows = await selectRows('profiles', {
          select: 'id,full_name,phone,phone_verified,university,verification_status',
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
          setStoredPhone(rows[0].phone || '');
          setPhoneVerified(Boolean(rows[0].phone_verified));
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
      const nextPhone = form.phone.trim();
      const previousPhone = String(storedPhone || '').trim();
      const phoneChanged = nextPhone !== previousPhone;

      await updateRows(
        'profiles',
        {
          full_name: form.fullName.trim(),
          phone: nextPhone,
          phone_verified: phoneChanged ? false : phoneVerified,
          university: form.university.trim() || null
        },
        {
          filters: [{ column: 'id', op: 'eq', value: user.userId }],
          accessToken: token
        }
      );

      if (phoneChanged) {
        setPhoneVerified(false);
        setStoredPhone(nextPhone);
        setOtpCode('');
        setOtpHint('');
      }

      await refreshMe();
      setSuccess(
        phoneChanged ? 'Profile updated. Verify your updated phone number.' : 'Profile updated.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const sendOtp = async () => {
    if (!user?.userId || !token) {
      return;
    }

    const phone = form.phone.trim();
    if (!phone) {
      setError('Enter your phone number first.');
      return;
    }

    setSendingOtp(true);
    setError('');
    setSuccess('');
    setOtpHint('');

    try {
      const response = await invokeFunction(
        'verify-phone-otp',
        { action: 'send', phone },
        token
      );

      setSuccess('OTP sent. Enter the code to complete verification.');
      if (response?.code) {
        setOtpHint(`Dev OTP code: ${response.code}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!user?.userId || !token) {
      return;
    }

    const phone = form.phone.trim();
    const code = otpCode.trim();

    if (!phone) {
      setError('Enter your phone number first.');
      return;
    }

    if (!code) {
      setError('Enter the OTP code.');
      return;
    }

    setVerifyingOtp(true);
    setError('');
    setSuccess('');

    try {
      const response = await invokeFunction(
        'verify-phone-otp',
        { action: 'verify', phone, code },
        token
      );

      if (!response?.verified) {
        throw new Error(humanizeReason(response?.reason));
      }

      setPhoneVerified(true);
      setStoredPhone(phone);
      setOtpCode('');
      setOtpHint('');
      await refreshMe();
      setSuccess('Phone number verified.');
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="container section">
      <div className="section__header">
        <div>
          <h1>{t('dashboard.profile')}</h1>
          <p>{t('dashboard.manageAccount')}</p>
        </div>
      </div>

      <section className="card profile-card">
        <div className="profile-card__meta">
          <p>
            {t('dashboard.role')}: <strong>{humanizeRole(user?.role)}</strong>
          </p>
          <p>
            {t('dashboard.phone')}: <strong>{phoneVerified ? t('dashboard.verified') : t('dashboard.unverified')}</strong>
          </p>
          {verificationStatus ? (
            <p>
              {t('dashboard.verification')}: <strong>{verificationStatus}</strong>
            </p>
          ) : null}
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            {t('auth.fullName')}
            <input
              value={form.fullName}
              onChange={(event) => updateField('fullName', event.target.value)}
              required
            />
          </label>

          <label>
            {t('auth.phone')}
            <input
              value={form.phone}
              onChange={(event) => {
                updateField('phone', event.target.value);
                if (event.target.value.trim() !== String(storedPhone || '').trim()) {
                  setPhoneVerified(false);
                }
              }}
              required
            />
          </label>

          <label>
            {t('auth.universityOptional')}
            <input
              value={form.university}
              onChange={(event) => updateField('university', event.target.value)}
            />
          </label>

          <button className="btn" type="submit" disabled={saving}>
            {saving ? t('dashboard.saving') : t('dashboard.saveProfile')}
          </button>
        </form>

        <div className="profile-otp">
          <p className="muted">
            {t('dashboard.phoneOtpMsg')}
          </p>
          <div className="profile-otp__actions">
            <button type="button" className="btn btn--ghost" onClick={sendOtp} disabled={sendingOtp}>
              {sendingOtp ? t('dashboard.sending') : t('dashboard.sendOtp')}
            </button>
          </div>
          <div className="profile-otp__verify">
            <input
              placeholder={t('dashboard.enterOtp')}
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
              inputMode="numeric"
              maxLength={6}
            />
            <button
              type="button"
              className="btn btn--small"
              onClick={verifyOtp}
              disabled={verifyingOtp}
            >
              {verifyingOtp ? t('dashboard.verifying') : t('dashboard.verifyCode')}
            </button>
          </div>
          {otpHint ? <p className="muted">{otpHint}</p> : null}
        </div>
      </section>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}
    </div>
  );
}
