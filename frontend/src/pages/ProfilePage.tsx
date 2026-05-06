import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { invokeFunction, selectRows, updateRows } from '../lib/supabase';
import { humanizeRole } from '../lib/roles';
import { sanitizeInput } from '../utils/format';
import { User, Phone, Mail, Shield, AlertTriangle, CheckCircle, XCircle, Clock, LogOut, Trash2, ChevronRight, Camera, FileText, RefreshCw, Repeat, Building2, Home, UserCog, LayoutDashboard } from 'lucide-react';

// Breadcrumb styles
const breadcrumbHeaderStyle = {
  background: 'white',
  borderRadius: '12px',
  padding: '1rem 1.25rem',
  margin: '1rem 1rem 1.25rem',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
};

const breadcrumbNavStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.9rem'
};

const breadcrumbItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
  color: '#64748b',
  textDecoration: 'none',
  transition: 'color 0.2s ease'
};

const breadcrumbSeparatorStyle = {
  color: '#cbd5e1'
};

const breadcrumbCurrentStyle = {
  color: '#1e293b',
  fontWeight: 600
};

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
  const { user, token, refreshMe, logout, switchRole, canSwitchRoles } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDashboardActive, setIsDashboardActive] = useState(false);

  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    nidaNumber: user?.nidaNumber || '',
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
          select: 'id,full_name,phone,phone_verified,nida_number,university,verification_status,subscription_plan',
          filters: [{ column: 'id', op: 'eq', value: user.userId }],
          limit: 1,
          accessToken: token
        });

        if (mounted && rows[0]) {
          setForm({
            fullName: rows[0].full_name || '',
            phone: rows[0].phone || '',
            nidaNumber: rows[0].nida_number || '',
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
          nida_number: sanitizeInput(form.nidaNumber),
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
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .profile-container {
          padding: 1rem;
          max-width: 600px;
          margin: 0 auto;
          animation: fadeInUp 0.5s ease-out;
        }
        .profile-header {
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
          border-radius: 20px;
          padding: 1.5rem;
          margin-bottom: 1rem;
          text-align: center;
          animation: fadeIn 0.6s ease-out;
        }
        .profile-avatar {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #16a34a, #166534);
          border-radius: 50%;
          margin: 0 auto 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.7s ease-out;
        }
        .profile-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: #166534;
          margin: 0 0 0.25rem;
        }
        .profile-email {
          font-size: 0.85rem;
          color: #6b7280;
          margin: 0;
        }
        .badge-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: 0.4rem;
          justify-content: center;
          margin-top: 1rem;
          animation: fadeIn 0.8s ease-out;
        }
        .badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          padding: 0.3rem 0.2rem;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
          animation: slideIn 0.3s ease-out;
          transition: all 0.2s;
        }
        .badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .badge-success {
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          color: #166534;
          border: 1px solid #86efac;
        }
        .badge-warning {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          color: #92400e;
          border: 1px solid #fcd34d;
        }
        .badge-error {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #991b1b;
          border: 1px solid #fca5a5;
        }
        .badge-info {
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          color: #166534;
          border: 1px solid #86efac;
        }
        .section-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 1.25rem;
          margin-bottom: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          animation: fadeInUp 0.5s ease-out;
          animation-fill-mode: both;
        }
        .section-card:nth-child(1) { animation-delay: 0.1s; }
        .section-card:nth-child(2) { animation-delay: 0.2s; }
        .section-card:nth-child(3) { animation-delay: 0.3s; }
        .section-card:nth-child(4) { animation-delay: 0.4s; }
        .section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .form-field {
          margin-bottom: 1rem;
        }
        .form-field label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.4rem;
        }
        .form-field input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          font-size: 0.9rem;
          color: #1f2937;
          outline: none;
          transition: all 0.2s;
          background: #f9fafb;
        }
        .form-field input:focus {
          border-color: #16a34a;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
        }
        .btn-primary {
          width: 100%;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #16a34a, #166534);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          height: 44px;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-secondary {
          padding: 0.6rem 1rem;
          background: #f9fafb;
          color: #6b7280;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          height: 42px;
        }
        .btn-secondary:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }
        .btn-danger {
          width: 100%;
          padding: 0.75rem 1.5rem;
          background: #fee2e2;
          color: #991b1b;
          border: none;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          height: 44px;
        }
        .btn-danger:hover {
          background: #fecaca;
        }
        .otp-section {
          background: #f0fdf4;
          border-radius: 12px;
          padding: 1rem;
          margin-top: 1rem;
        }
        .otp-inputs {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
          justify-content: center;
          max-width: 350px;
          margin-left: auto;
          margin-right: auto;
        }
        .otp-inputs input {
          flex: 1;
          max-width: 200px;
          padding: 0.6rem;
          border: 1.5px solid #d1fae5;
          border-radius: 8px;
          text-align: center;
          font-size: 1rem;
          font-weight: 600;
          outline: none;
        }
        .otp-inputs button {
          flex: 0 0 auto;
          min-width: 120px;
          width: auto !important;
        }
        .otp-inputs input:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
        }
        .message-success {
          background: #dcfce7;
          color: #166534;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          margin-bottom: 1rem;
          font-size: 0.85rem;
          animation: fadeIn 0.3s ease-out;
        }
        .message-error {
          background: #fee2e2;
          color: #991b1b;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          margin-bottom: 1rem;
          font-size: 0.85rem;
          animation: fadeIn 0.3s ease-out;
        }
        .danger-section {
          border: 1.5px solid #fee2e2;
          background: #fef2f2;
        }
      `}</style>

      {/* Breadcrumb Header */}
      <header style={breadcrumbHeaderStyle}>
        <nav style={{display:'flex',alignItems:'center',gap:'0.5rem',fontSize:'0.9rem'}}>
          <Link 
            to="/tenant/dashboard" 
            className={`topbar-action-btn ${isDashboardActive ? 'is-active' : ''}`}
            onClick={() => setIsDashboardActive(true)}
            style={{display:'flex',alignItems:'center',gap:'0.35rem',color:'#64748b',textDecoration:'none',padding:'4px 8px',background:'transparent',border:'none',borderRadius:'8px'}}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
          <ChevronRight size={16} style={breadcrumbSeparatorStyle} />
          <span style={breadcrumbCurrentStyle}>Profile</span>
        </nav>
      </header>

      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            <User size={36} style={{ color: '#ffffff' }} />
          </div>
          <h2 className="profile-name">{form.fullName || 'Your Name'}</h2>
          <p className="profile-email">{user?.email || 'user@example.com'}</p>
          
          <div className="badge-container">
            <span className="badge badge-info">
              <Shield size={14} />
              {humanizeRole(user?.role)}
            </span>
            <span className={`badge ${phoneVerified ? 'badge-success' : 'badge-warning'}`}>
              {phoneVerified ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {phoneVerified ? 'Phone verified' : 'Phone unverified'}
            </span>
            {planName && (
              <span className="badge badge-info">
                <FileText size={14} />
                {String(planName).charAt(0).toUpperCase() + String(planName).slice(1)}
              </span>
            )}
            {verificationStatus && (
              <span
                className={`badge ${
                  verificationStatus === 'APPROVED'
                    ? 'badge-success'
                    : verificationStatus === 'REJECTED'
                      ? 'badge-error'
                      : 'badge-warning'
                }`}
              >
                {verificationStatus === 'APPROVED' && <CheckCircle size={14} />}
                {verificationStatus === 'REJECTED' && <XCircle size={14} />}
                {verificationStatus === 'PENDING' && <Clock size={14} />}
                {verificationStatus}
              </span>
            )}
          </div>
        </div>

        {success && <div className="message-success">{success}</div>}
        {error && <div className="message-error">{error}</div>}

        {/* Verification Rejected Section */}
        {verificationStatus === 'REJECTED' && (
          <div className="section-card">
            <div className="section-title" style={{ color: '#991b1b' }}>
              <AlertTriangle size={18} />
              Verification rejected
            </div>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.6, marginBottom: '1rem' }}>
              Your previous documents were rejected. Provide a clear ID photo and a matching selfie to request verification again.
            </p>
            <div className="form-field">
              <label htmlFor="idDocUrl">
                <Camera size={14} />
                New ID document URL
              </label>
              <input
                id="idDocUrl"
                value={idDocUrl}
                onChange={(e) => setIdDocUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="form-field">
              <label htmlFor="selfieUrl">
                <Camera size={14} />
                New selfie URL
              </label>
              <input
                id="selfieUrl"
                value={selfieUrl}
                onChange={(e) => setSelfieUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={handleResubmitDocs}
              disabled={resubmitting || !idDocUrl || !selfieUrl}
            >
              {resubmitting ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {resubmitting ? 'Submitting...' : 'Resubmit documents'}
            </button>
          </div>
        )}

        {/* Profile Information Section */}
        <div className="section-card">
          <div className="section-title">
            <User size={18} />
            Profile information
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="fullName">
                <User size={14} />
                {t('auth.fullName')}
              </label>
              <input
                id="fullName"
                value={form.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-field">
              <label htmlFor="phone">
                <Phone size={14} />
                {t('auth.phone')}
              </label>
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
                placeholder="+255 123 456 789"
              />
            </div>

            <div className="form-field">
              <label htmlFor="nidaNumber">
                <Shield size={14} />
                NIDA Number
              </label>
              <input
                id="nidaNumber"
                value={form.nidaNumber}
                onChange={(event) => updateField('nidaNumber', event.target.value)}
                placeholder="20-digit National ID"
                maxLength={20}
              />
            </div>

            <div className="form-field">
              <label htmlFor="university">
                <FileText size={14} />
                {t('auth.universityOptional')}
              </label>
              <input
                id="university"
                value={form.university}
                onChange={(event) => updateField('university', event.target.value)}
                placeholder="University name"
              />
            </div>

            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {saving ? t('dashboard.saving') : t('dashboard.saveProfile')}
            </button>
          </form>

          {/* Phone Verification */}
          <div className="otp-section">
            <div className="section-title" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              <Shield size={16} />
              Phone verification
            </div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.5, marginBottom: '0.75rem' }}>
              {phoneVerified 
                ? 'Your number is verified. Re-verify if you change it.' 
                : t('dashboard.phoneOtpMsg')}
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={sendOtp}
              disabled={sendingOtp}
              style={{ width: '100%' }}
            >
              {sendingOtp ? <RefreshCw size={14} className="animate-spin" /> : <Phone size={14} />}
              {sendingOtp ? t('dashboard.sending') : t('dashboard.sendOtp')}
            </button>
            <div className="otp-inputs">
              <input
                placeholder={t('dashboard.enterOtp')}
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                inputMode="numeric"
                maxLength={6}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={verifyOtp}
                disabled={verifyingOtp}
              >
                {verifyingOtp ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {verifyingOtp ? t('dashboard.verifying') : t('dashboard.verifyCode')}
              </button>
            </div>
            {otpHint && <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.5rem', fontWeight: 600 }}>{otpHint}</p>}
          </div>
        </div>

        {/* Switch Account Section - Only show if user has multiple roles */}
        {canSwitchRoles && user?.roles && user.roles.length > 1 && (
          <div className="section-card">
            <div className="section-title">
              <Repeat size={18} />
              Switch account
            </div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.75rem' }}>
              You have {user.roles.length} accounts. Select one to switch:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {user.roles.filter(role => role !== user.role).map((role) => (
                <button
                  key={role}
                  type="button"
                  className="btn-secondary"
                  onClick={() => switchRole(role)}
                  style={{ 
                    width: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {role === 'tenant' && <Home size={16} color="#22c55e" />}
                    {role === 'landlord' && <Building2 size={16} color="#3b82f6" />}
                    {role === 'property_manager' && <UserCog size={16} color="#f59e0b" />}
                    {role === 'admin' && <Shield size={16} color="#ef4444" />}
                    <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>
                      {role === 'property_manager' ? 'Property Manager' : role}
                    </span>
                  </div>
                  <ChevronRight size={16} color="#9ca3af" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sign Out Section */}
        <div className="section-card">
          <div className="section-title">
            <LogOut size={18} />
            Account actions
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              try {
                await logout();
                navigate('/auth/login');
              } catch (err) {
                setError('Failed to sign out.');
              }
            }}
            style={{ width: '100%' }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>

        {/* Danger Zone */}
        <div className="section-card danger-section">
          <div className="section-title" style={{ color: '#991b1b' }}>
            <AlertTriangle size={18} />
            Danger zone
          </div>
          {!showDeleteSection ? (
            <button
              type="button"
              className="btn-danger"
              onClick={() => setShowDeleteSection(true)}
            >
              <Trash2 size={16} />
              Delete my account
            </button>
          ) : (
            <div>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.5, marginBottom: '1rem' }}>
                This will permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <div className="form-field">
                <label htmlFor="deleteConfirm">
                  <AlertTriangle size={14} />
                  Type DELETE to confirm
                </label>
                <input
                  id="deleteConfirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-danger"
                  disabled={deletingAccount || deleteConfirmText.toUpperCase() !== 'DELETE'}
                  onClick={handleDeleteAccount}
                >
                  {deletingAccount ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  {deletingAccount ? 'Deleting...' : 'Delete account'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
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
