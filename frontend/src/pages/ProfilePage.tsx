import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { invokeFunction, selectRows, updateRows } from '../lib/supabase';
import { humanizeRole } from '../lib/roles';
import { sanitizeInput } from '../utils/format';

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
  const { user, token, refreshMe, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

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

  const [resubmitting, setResubmitting] = useState(false);
  const [idDocUrl, setIdDocUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');

  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteSection, setShowDeleteSection] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!user?.userId || !token) {
        return;
      }

      try {
        const rows = await selectRows('profiles', {
          select: 'id,full_name,phone,phone_verified,university,verification_status,subscription_plan',
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
          setVerificationStatus(String(rows[0].verification_status || '').toUpperCase());
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
          full_name: sanitizeInput(form.fullName),
          phone: sanitizeInput(form.phone),
          phone_verified: phoneChanged ? false : phoneVerified,
          university: sanitizeInput(form.university) || null
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toUpperCase() !== 'DELETE') {
      setError('Please type DELETE to confirm account deletion.');
      return;
    }
    setDeletingAccount(true);
    setError('');
    try {
      await invokeFunction('delete-account', {}, token);
      await logout();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to delete account. Please contact support@irent.co.tz.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleResubmitDocs = async () => {
    if (!idDocUrl || !selfieUrl) {
      setError('Please provide both ID and Selfie documents.');
      return;
    }
    setResubmitting(true);
    setError('');
    try {
      await updateRows(
        'profiles',
        {
          id_doc_url: idDocUrl,
          selfie_url: selfieUrl,
          verification_status: 'pending'
        },
        { filters: [{ column: 'id', op: 'eq', value: user.userId }], accessToken: token }
      );
      setVerificationStatus('PENDING');
      setSuccess('Documents submitted successfully. Awaiting admin review.');
    } catch (err: any) {
      setError(err.message || 'Failed to resubmit documents.');
    } finally {
      setResubmitting(false);
    }
  };

  const planName =
    (user as any)?.subscriptionPlan ||
    (user as any)?.subscription_plan ||
    (user as any)?.subscriptionPlanName ||
    '';

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} .prof-page{padding:3rem 2rem;max-width:800px;margin:0 auto} .prof-hdr{margin-bottom:2.5rem;text-align:center} .badge-row{display:flex;gap:10px;margin-bottom:2rem;flex-wrap:wrap;justify-content:center} .prof-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:24px;font-size:12px;font-weight:600} .pb-role{background:#E6F1FB;color:#0C447C} .pb-phone-ok{background:#EAF3DE;color:#27500A} .pb-phone-no{background:#FAEEDA;color:#633806} .pb-plan{background:#EEEDFE;color:#3C3489} .pb-ver-ok{background:#EAF3DE;color:#27500A} .pb-ver-pend{background:#FAEEDA;color:#633806} .pb-ver-rej{background:#FCEBEB;color:#791F1F} .prof-sec{background:#ffffff;border:0.5px solid var(--border);border-radius:20px;padding:24px 28px;margin-bottom:20px;box-shadow:var(--shadow-soft)} .prof-sec-title{font-size:14px;font-weight:700;color:var(--ink);margin-bottom:18px;border-bottom:0.5px solid var(--border);padding-bottom:10px} .prof-field{display:flex;flex-direction:column;gap:6px;margin-bottom:18px} .prof-field label{font-size:12px;font-weight:600;color:var(--mid);text-transform:uppercase;letter-spacing:.05em} .prof-field input{padding:10px 14px;border-radius:10px;border:0.5px solid var(--border);background:#fff;font-size:14px;color:var(--ink);outline:none;width:100%;transition:border-color 0.2s} .prof-field input:focus{border-color:var(--jade)} .prof-save-btn{padding:10px 24px;border-radius:10px;border:none;background:var(--jade);color:#fff;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px;transition:opacity 0.2s} .prof-save-btn:hover{opacity:0.9} .otp-section{margin-top:20px;padding-top:20px;border-top:0.5px solid var(--border)} .otp-title{font-size:13px;font-weight:600;color:var(--ink);margin-bottom:6px} .otp-hint{font-size:12px;color:var(--mid);margin-bottom:12px;line-height:1.6} .otp-send-btn{padding:8px 16px;border-radius:10px;border:0.5px solid var(--border);background:var(--cream);font-size:13px;cursor:pointer;color:var(--ink);font-weight:500} .otp-verify-row{display:flex;gap:10px;margin-top:10px} .otp-verify-row input{flex:1;padding:9px 14px;border-radius:10px;border:0.5px solid var(--border);font-size:14px;outline:none} .otp-verify-btn{padding:9px 16px;border-radius:10px;border:0.5px solid var(--border);background:#fff;font-size:13px;cursor:pointer;color:var(--ink);white-space:nowrap;font-weight:600} .rejected-box{background:#FEF2F1;border:0.5px solid #F09595;border-radius:14px;padding:16px 18px;margin-bottom:18px} .rejected-title{font-size:14px;font-weight:700;color:#791F1F;margin-bottom:8px} .rejected-hint{font-size:13px;color:#791F1F;margin-bottom:12px;line-height:1.6;opacity:0.9} .danger-sec{background:#ffffff;border:0.5px solid #F09595;border-radius:20px;padding:24px 28px;margin-bottom:20px;box-shadow:var(--shadow-soft)} .danger-title{font-size:14px;font-weight:700;color:#791F1F;margin-bottom:10px} .danger-hint{font-size:13px;color:var(--mid);margin-bottom:16px;line-height:1.6} .danger-toggle-btn{padding:8px 18px;border-radius:10px;border:0.5px solid #F09595;background:#fff;font-size:13px;color:#791F1F;cursor:pointer;font-weight:500} .danger-confirm-field{margin-bottom:16px} .danger-confirm-field label{font-size:12px;color:var(--mid);display:block;margin-bottom:8px} .danger-confirm-field input{padding:10px 14px;border-radius:10px;border:0.5px solid #F09595;font-size:14px;outline:none;width:100%} .danger-delete-btn{padding:10px 20px;border-radius:10px;border:none;background:#A32D2D;color:#fff;font-size:13px;font-weight:600;cursor:pointer} .danger-cancel-btn{padding:10px 16px;border-radius:10px;border:0.5px solid var(--border);background:#fff;font-size:13px;cursor:pointer;color:var(--ink)} .msg-success{font-size:14px;color:#27500A;background:#EAF3DE;padding:12px 16px;border-radius:10px;margin-bottom:16px;text-align:center} .msg-error{font-size:14px;color:#791F1F;background:#FCEBEB;padding:12px 16px;border-radius:10px;margin-bottom:16px;text-align:center} @media(max-width:768px){.prof-page{padding:1.5rem 1rem}}`}</style>

      <div className="prof-page">
        <div className="prof-hdr">
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Account settings</h1>
          <p style={{ fontSize: 12, color: 'var(--mid)', marginTop: 4 }}>
            Manage your profile and verification
          </p>
        </div>

        {success ? <p className="msg-success">{success}</p> : null}
        {error ? <p className="msg-error">{error}</p> : null}

        <div className="badge-row">
          <span className="prof-badge pb-role">{humanizeRole(user?.role)}</span>
          <span className={`prof-badge ${phoneVerified ? 'pb-phone-ok' : 'pb-phone-no'}`}>
            {phoneVerified ? '✓ Phone verified' : 'Phone unverified'}
          </span>
          {planName ? (
            <span className="prof-badge pb-plan">{String(planName).charAt(0).toUpperCase() + String(planName).slice(1)}</span>
          ) : null}
          {verificationStatus ? (
            <span
              className={`prof-badge ${
                verificationStatus === 'APPROVED'
                  ? 'pb-ver-ok'
                  : verificationStatus === 'REJECTED'
                    ? 'pb-ver-rej'
                    : 'pb-ver-pend'
              }`}
            >
              {verificationStatus}
            </span>
          ) : null}
        </div>

        {verificationStatus === 'REJECTED' ? (
          <div className="prof-sec">
            <div className="rejected-box">
              <p className="rejected-title">Verification rejected</p>
              <p className="rejected-hint">
                Your previous documents were rejected. Provide a clear ID photo and a matching selfie to
                request verification again.
              </p>
              <div className="prof-field">
                <label htmlFor="idDocUrl">New ID document URL</label>
                <input
                  id="idDocUrl"
                  value={idDocUrl}
                  onChange={(e) => setIdDocUrl(e.target.value)}
                />
              </div>
              <div className="prof-field">
                <label htmlFor="selfieUrl">New selfie URL</label>
                <input
                  id="selfieUrl"
                  value={selfieUrl}
                  onChange={(e) => setSelfieUrl(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="prof-save-btn"
                onClick={handleResubmitDocs}
                disabled={resubmitting || !idDocUrl || !selfieUrl}
              >
                {resubmitting ? 'Submitting...' : 'Resubmit documents'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="prof-sec">
          <p className="prof-sec-title">Profile information</p>
          <form onSubmit={handleSubmit}>
            <div className="prof-field">
              <label htmlFor="fullName">{t('auth.fullName')}</label>
              <input
                id="fullName"
                value={form.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
                required
              />
            </div>

            <div className="prof-field">
              <label htmlFor="phone">{t('auth.phone')}</label>
              <input
                id="phone"
                value={form.phone}
                onChange={(event) => {
                  updateField('phone', event.target.value);
                  if (event.target.value.trim() !== String(storedPhone || '').trim()) {
                    setPhoneVerified(false);
                  }
                }}
                required
              />
            </div>

            <div className="prof-field">
              <label htmlFor="university">{t('auth.universityOptional')}</label>
              <input
                id="university"
                value={form.university}
                onChange={(event) => updateField('university', event.target.value)}
              />
            </div>

            <button className="prof-save-btn" type="submit" disabled={saving}>
              {saving ? t('dashboard.saving') : t('dashboard.saveProfile')}
            </button>
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await logout();
                    navigate('/auth/login');
                  } catch (err) {
                    setError('Failed to sign out.');
                  }
                }}
                style={{
                  marginLeft: 8,
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: '#fff',
                  color: '#b91c1c',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Sign out
              </button>
            </div>
          </form>

          <div className="otp-section">
            <p className="otp-title">Phone verification</p>
            <p className="otp-hint">
              {phoneVerified ? 'Your number is verified. Re-verify if you change it.' : t('dashboard.phoneOtpMsg')}
            </p>
            <button
              type="button"
              className="otp-send-btn"
              onClick={sendOtp}
              disabled={sendingOtp}
            >
              {sendingOtp ? t('dashboard.sending') : t('dashboard.sendOtp')}
            </button>
            <div className="otp-verify-row">
              <input
                placeholder={t('dashboard.enterOtp')}
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                inputMode="numeric"
                maxLength={6}
              />
              <button
                type="button"
                className="otp-verify-btn"
                onClick={verifyOtp}
                disabled={verifyingOtp}
              >
                {verifyingOtp ? t('dashboard.verifying') : t('dashboard.verifyCode')}
              </button>
            </div>
            {otpHint ? <p className="otp-hint" style={{ marginTop: 6 }}>{otpHint}</p> : null}
          </div>
        </div>

        <div className="danger-sec">
          <p className="danger-title">Danger zone</p>
          {!showDeleteSection ? (
            <button
              type="button"
              className="danger-toggle-btn"
              onClick={() => setShowDeleteSection(true)}
            >
              Delete my account
            </button>
          ) : (
            <div>
              <p className="danger-hint">
                This will permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <div className="danger-confirm-field">
                <label htmlFor="deleteConfirm">Type DELETE to confirm</label>
                <input
                  id="deleteConfirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="danger-delete-btn"
                  disabled={deletingAccount || deleteConfirmText.toUpperCase() !== 'DELETE'}
                  onClick={handleDeleteAccount}
                >
                  {deletingAccount ? 'Deleting...' : 'Delete account'}
                </button>
                <button
                  type="button"
                  className="danger-cancel-btn"
                  onClick={() => {
                    setShowDeleteSection(false);
                    setDeleteConfirmText('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
