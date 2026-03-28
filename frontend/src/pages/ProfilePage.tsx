import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      setError(err.message || 'Failed to delete account. Please contact support@campusstaytz.com.');
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
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} .prof-page{padding:2rem;max-width:640px} .prof-hdr{margin-bottom:1.5rem} .badge-row{display:flex;gap:8px;margin-bottom:1.5rem;flex-wrap:wrap} .prof-badge{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:20px;font-size:11px;font-weight:600} .pb-role{background:#E6F1FB;color:#0C447C} .pb-phone-ok{background:#EAF3DE;color:#27500A} .pb-phone-no{background:#FAEEDA;color:#633806} .pb-plan{background:#EEEDFE;color:#3C3489} .pb-ver-ok{background:#EAF3DE;color:#27500A} .pb-ver-pend{background:#FAEEDA;color:#633806} .pb-ver-rej{background:#FCEBEB;color:#791F1F} .prof-sec{background:#ffffff;border:0.5px solid var(--border);border-radius:16px;padding:18px 20px;margin-bottom:12px} .prof-sec-title{font-size:13px;font-weight:600;color:var(--ink);margin-bottom:14px} .prof-field{display:flex;flex-direction:column;gap:5px;margin-bottom:14px} .prof-field label{font-size:11px;font-weight:600;color:var(--mid);text-transform:uppercase;letter-spacing:.04em} .prof-field input{padding:9px 12px;border-radius:9px;border:0.5px solid var(--border);background:#fff;font-size:13px;color:var(--ink);outline:none;width:100%} .prof-save-btn{padding:9px 20px;border-radius:9px;border:none;background:var(--jade);color:#fff;font-size:13px;font-weight:600;cursor:pointer;margin-top:2px} .otp-section{margin-top:14px;padding-top:14px;border-top:0.5px solid var(--border)} .otp-title{font-size:12px;font-weight:600;color:var(--ink);margin-bottom:5px} .otp-hint{font-size:11px;color:var(--mid);margin-bottom:10px;line-height:1.5} .otp-send-btn{padding:7px 14px;border-radius:9px;border:0.5px solid var(--border);background:var(--cream);font-size:12px;cursor:pointer;color:var(--ink);font-weight:500} .otp-verify-row{display:flex;gap:8px;margin-top:8px} .otp-verify-row input{flex:1;padding:8px 12px;border-radius:9px;border:0.5px solid var(--border);font-size:13px;outline:none} .otp-verify-btn{padding:8px 14px;border-radius:9px;border:0.5px solid var(--border);background:#fff;font-size:12px;cursor:pointer;color:var(--ink);white-space:nowrap;font-weight:500} .rejected-box{background:#FEF2F1;border:0.5px solid #F09595;border-radius:12px;padding:14px 16px;margin-bottom:14px} .rejected-title{font-size:13px;font-weight:600;color:#791F1F;margin-bottom:6px} .rejected-hint{font-size:12px;color:#791F1F;margin-bottom:10px;line-height:1.5;opacity:0.8} .danger-sec{background:#ffffff;border:0.5px solid #F09595;border-radius:16px;padding:18px 20px;margin-bottom:12px} .danger-title{font-size:13px;font-weight:600;color:#791F1F;margin-bottom:8px} .danger-hint{font-size:12px;color:var(--mid);margin-bottom:12px;line-height:1.5} .danger-toggle-btn{padding:7px 14px;border-radius:9px;border:0.5px solid #F09595;background:#fff;font-size:12px;color:#791F1F;cursor:pointer;font-weight:500} .danger-confirm-field{margin-bottom:12px} .danger-confirm-field label{font-size:11px;color:var(--mid);display:block;margin-bottom:6px} .danger-confirm-field input{padding:8px 12px;border-radius:9px;border:0.5px solid #F09595;font-size:13px;outline:none;width:100%} .danger-delete-btn{padding:8px 16px;border-radius:9px;border:none;background:#A32D2D;color:#fff;font-size:12px;font-weight:600;cursor:pointer} .danger-cancel-btn{padding:8px 14px;border-radius:9px;border:0.5px solid var(--border);background:#fff;font-size:12px;cursor:pointer;color:var(--ink)} .msg-success{font-size:13px;color:#27500A;background:#EAF3DE;padding:10px 14px;border-radius:9px;margin-bottom:12px} .msg-error{font-size:13px;color:#791F1F;background:#FCEBEB;padding:10px 14px;border-radius:9px;margin-bottom:12px} @media(max-width:768px){.prof-page{padding:1rem}}`}</style>

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
                <label>New ID document URL</label>
                <input value={idDocUrl} onChange={(e) => setIdDocUrl(e.target.value)} />
              </div>
              <div className="prof-field">
                <label>New selfie URL</label>
                <input value={selfieUrl} onChange={(e) => setSelfieUrl(e.target.value)} />
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
              <label>{t('auth.fullName')}</label>
              <input
                value={form.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
                required
              />
            </div>

            <div className="prof-field">
              <label>{t('auth.phone')}</label>
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
            </div>

            <div className="prof-field">
              <label>{t('auth.universityOptional')}</label>
              <input
                value={form.university}
                onChange={(event) => updateField('university', event.target.value)}
              />
            </div>

            <button className="prof-save-btn" type="submit" disabled={saving}>
              {saving ? t('dashboard.saving') : t('dashboard.saveProfile')}
            </button>
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
                <label>Type DELETE to confirm</label>
                <input
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
