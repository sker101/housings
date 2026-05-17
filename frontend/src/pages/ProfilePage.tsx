import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { invokeFunction, selectRows, updateRows } from '../lib/supabase';
import { humanizeRole } from '../lib/roles';
import { sanitizeInput } from '../utils/format';
import { 
  User, Phone, Mail, Shield, AlertTriangle, CheckCircle, XCircle, Clock, 
  LogOut, Trash2, ChevronRight, ChevronLeft, Camera, FileText, RefreshCw, 
  Repeat, Building2, Home, UserCog, LayoutDashboard, Settings, HelpCircle, 
  Users, Gift, Bell 
} from 'lucide-react';

function humanizeReason(value) {
  if (!value) return 'Unable to verify phone number.';
  return String(value).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function MenuItem({ icon, title, onClick, dot = false }) {
  return (
    <div 
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.2rem 0',
        borderBottom: '1px solid #f1f5f9',
        cursor: 'pointer',
        background: 'transparent'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ color: '#475569', position: 'relative' }}>
          {icon}
          {dot && <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, background: '#ef4444', borderRadius: '50%' }} />}
        </div>
        <span style={{ fontSize: '1.05rem', color: '#1e293b', fontWeight: 400 }}>{title}</span>
      </div>
      <ChevronRight size={18} color="#94a3b8" />
    </div>
  );
}

export default function ProfilePage() {
  const { user, token, refreshMe, logout, switchRole, canSwitchRoles } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // 'menu' | 'settings' | 'referral'
  const [view, setView] = useState('menu');

  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    nidaNumber: user?.nidaNumber || '',
    university: user?.university || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(user?.landlordVerificationStatus || '');
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
      if (!user?.userId || !token) return;
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
        if (mounted) setError(err.message);
      }
    }
    loadProfile();
    return () => { mounted = false; };
  }, [user?.userId, token]);

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user?.userId || !token) return;
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
        { filters: [{ column: 'id', op: 'eq', value: user.userId }], accessToken: token }
      );

      if (phoneChanged) {
        setPhoneVerified(false);
        setStoredPhone(nextPhone);
        setOtpCode('');
        setOtpHint('');
      }

      await refreshMe();
      setSuccess(phoneChanged ? 'Profile updated. Verify your updated phone number.' : 'Profile updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const sendOtp = async () => {
    if (!user?.userId || !token) return;
    const phone = form.phone.trim();
    if (!phone) { setError('Enter your phone number first.'); return; }
    setSendingOtp(true); setError(''); setSuccess(''); setOtpHint('');
    try {
      const response = await invokeFunction('verify-phone-otp', { action: 'send', phone }, token);
      setSuccess('OTP sent. Enter the code to complete verification.');
      if (response?.code) setOtpHint(`Dev OTP code: ${response.code}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!user?.userId || !token) return;
    const phone = form.phone.trim();
    const code = otpCode.trim();
    if (!phone) { setError('Enter your phone number first.'); return; }
    if (!code) { setError('Enter the OTP code.'); return; }
    setVerifyingOtp(true); setError(''); setSuccess('');
    try {
      const response = await invokeFunction('verify-phone-otp', { action: 'verify', phone, code }, token);
      if (!response?.verified) throw new Error(humanizeReason(response?.reason));
      setPhoneVerified(true); setStoredPhone(phone); setOtpCode(''); setOtpHint('');
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
      setError('Please type DELETE to confirm account deletion.'); return;
    }
    setDeletingAccount(true); setError('');
    try {
      await invokeFunction('delete-account', {}, token);
      await logout();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to delete account.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleResubmitDocs = async () => {
    if (!idDocUrl || !selfieUrl) { setError('Please provide both ID and Selfie documents.'); return; }
    setResubmitting(true); setError('');
    try {
      await updateRows('profiles', { id_doc_url: idDocUrl, selfie_url: selfieUrl, verification_status: 'pending' }, { filters: [{ column: 'id', op: 'eq', value: user.userId }], accessToken: token });
      setVerificationStatus('PENDING'); setSuccess('Documents submitted successfully. Awaiting admin review.');
    } catch (err: any) {
      setError(err.message || 'Failed to resubmit documents.');
    } finally {
      setResubmitting(false);
    }
  };

  const handleLogout = async () => {
    try { await logout(); navigate('/auth/login'); } catch (err) { setError('Failed to sign out.'); }
  };

  const handleSwitchRole = () => {
    if (canSwitchRoles && user?.roles && user.roles.length > 1) {
      const otherRoles = user.roles.filter(r => r !== user.role);
      const targetRole = otherRoles.includes('landlord') ? 'landlord' : otherRoles[0];
      switchRole(targetRole);
      navigate('/');
    }
  };

  // Airbnb style UI
  if (view === 'menu') {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '100px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 1.5rem 1rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, color: '#000' }}>Profile</h1>
          <button style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Bell size={20} color="#000" />
          </button>
        </div>

        {/* Profile Identity Card */}
        <div style={{ background: '#fff', margin: '0 1.5rem 1.5rem', padding: '2rem 1rem', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#ede9fe', color: '#5b21b6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 600, marginBottom: '1rem' }}>
            {(form.fullName || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.25rem', color: '#000' }}>{form.fullName || 'User'}</h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>{humanizeRole(user?.role)}</p>
        </div>

        {/* Quick Links Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '0 1.5rem 1.5rem' }}>
          <div 
            onClick={() => navigate('/tenant/dashboard')} 
            style={{ background: '#fff', padding: '1.25rem', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position: 'relative', cursor: 'pointer' }}
          >
            <span style={{ position: 'absolute', top: 12, right: 12, background: '#334155', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '3px 6px', borderRadius: '4px' }}>NEW</span>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🧳</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#000' }}>Past bookings</div>
          </div>
          
          <div 
            onClick={() => navigate('/messages')} 
            style={{ background: '#fff', padding: '1.25rem', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position: 'relative', cursor: 'pointer' }}
          >
            <span style={{ position: 'absolute', top: 12, right: 12, background: '#334155', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '3px 6px', borderRadius: '4px' }}>NEW</span>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💬</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#000' }}>Connections</div>
          </div>
        </div>

        {/* Become a Host Card */}
        {(!user?.roles?.includes('landlord')) && (
          <div 
            onClick={() => navigate('/become-host')} 
            style={{ background: '#fff', margin: '0 1.5rem 1.5rem', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '2.5rem' }}>🏠</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.2rem', color: '#000' }}>Become a host</div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>It's easy to start hosting and earn extra income.</div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div style={{ margin: '0 1.5rem' }}>
          <MenuItem icon={<User size={22} />} title="View profile" onClick={() => setView('settings')} dot={!phoneVerified} />
          <MenuItem icon={<HelpCircle size={22} />} title="Get help" onClick={() => window.open('tel:+255800000000')} />
          <MenuItem icon={<Settings size={22} />} title="Account settings" onClick={() => navigate('/tenant/dashboard')} />
          <MenuItem icon={<Shield size={22} />} title="Privacy" onClick={() => {}} />
          
          <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '1rem 0' }} />
          
          <MenuItem icon={<Users size={22} />} title="Refer a host" onClick={() => setView('referral')} />
          <MenuItem icon={<UserCog size={22} />} title="Find a co-host" onClick={() => navigate('/search?type=dalali')} />
          <MenuItem icon={<Gift size={22} />} title="Gift cards" onClick={() => setView('referral')} />
          <MenuItem icon={<FileText size={22} />} title="Legal" onClick={() => {}} />
          <MenuItem icon={<LogOut size={22} />} title="Log out" onClick={handleLogout} />
        </div>

        {/* Floating Switch Button */}
        {canSwitchRoles && user?.roles && user.roles.length > 1 && (
          <div style={{ position: 'fixed', bottom: 85, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 50 }}>
            <button 
              onClick={handleSwitchRole} 
              style={{ pointerEvents: 'auto', background: '#222222', color: '#fff', padding: '0.9rem 1.5rem', borderRadius: '30px', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', cursor: 'pointer' }}
            >
              <Repeat size={16} /> Switch to hosting
            </button>
          </div>
        )}
      </div>
    );
  }

  // Referral View
  if (view === 'referral') {
    const referralLink = `${window.location.origin}/auth/register/landlord?ref=${user?.userId?.slice(0, 8)}`;
    
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '100px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
        <header style={{ background: 'white', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setView('menu')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <ChevronLeft size={24} color="#1e293b" />
          </button>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#1e293b' }}>Refer & Earn</h1>
        </header>
        
        <div style={{ padding: '1.5rem', textAlign: 'center', animation: 'slideInRight 0.3s ease-out' }}>
          <div style={{ width: 120, height: 120, background: '#fef08a', borderRadius: '50%', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem' }}>
            🎁
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>Earn rewards for referring hosts</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            Invite property owners or landlords to list their rooms on iRent. Once they successfully register and list their first property, you'll receive a reward directly to your mobile wallet.
          </p>
          
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Your referral link</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                readOnly 
                value={referralLink} 
                style={{ flex: 1, padding: '0.75rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', color: '#334155', outline: 'none' }}
              />
              <button 
                onClick={async () => {
                  if (navigator.clipboard) {
                    await navigator.clipboard.writeText(referralLink);
                    alert('Referral link copied!');
                  }
                }}
                style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 1rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Copy
              </button>
            </div>
          </div>
          
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', textAlign: 'left' }}>
            <Gift size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', fontWeight: 600, color: '#166534' }}>How it works</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#15803d', lineHeight: 1.5 }}>
                Share your link. When a landlord signs up using your link and their property is approved, you get TZS 10,000!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Account Settings View
  return (
    <>
      <style>{`
        .settings-container { padding: 1rem; max-width: 600px; margin: 0 auto; animation: slideInRight 0.3s ease-out; }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .section-card { background: #ffffff; border-radius: 16px; padding: 1.25rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
        .section-title { display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; font-weight: 700; color: #1f2937; margin: 0 0 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e5e7eb; }
        .form-field { margin-bottom: 1rem; }
        .form-field label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; }
        .form-field input { width: 100%; padding: 0.75rem 1rem; border: 1.5px solid #e5e7eb; border-radius: 12px; font-size: 0.9rem; outline: none; background: #f9fafb; }
        .form-field input:focus { border-color: #16a34a; background: #ffffff; box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1); }
        .btn-primary { width: 100%; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #16a34a, #166534); color: #ffffff; border: none; border-radius: 12px; font-size: 0.9rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; height: 44px; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary { padding: 0.6rem 1rem; background: #f9fafb; color: #6b7280; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; height: 42px; }
        .btn-danger { width: 100%; padding: 0.75rem 1.5rem; background: #fee2e2; color: #991b1b; border: none; border-radius: 12px; font-size: 0.9rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; height: 44px; }
        .otp-section { background: #f0fdf4; border-radius: 12px; padding: 1rem; margin-top: 1rem; }
        .otp-inputs { display: flex; gap: 0.5rem; margin-top: 0.75rem; justify-content: center; }
        .otp-inputs input { flex: 1; padding: 0.6rem; border: 1.5px solid #d1fae5; border-radius: 8px; text-align: center; font-weight: 600; outline: none; }
        .message-success { background: #dcfce7; color: #166534; padding: 0.75rem 1rem; border-radius: 10px; margin-bottom: 1rem; font-size: 0.85rem; }
        .message-error { background: #fee2e2; color: #991b1b; padding: 0.75rem 1rem; border-radius: 10px; margin-bottom: 1rem; font-size: 0.85rem; }
        .danger-section { border: 1.5px solid #fee2e2; background: #fef2f2; }
      `}</style>

      {/* Header */}
      <header style={{ background: 'white', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => setView('menu')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
          <ChevronLeft size={24} color="#1e293b" />
        </button>
        <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#1e293b' }}>Account settings</h1>
      </header>

      <div className="settings-container">
        {success && <div className="message-success">{success}</div>}
        {error && <div className="message-error">{error}</div>}

        {/* Profile Information Section */}
        <div className="section-card">
          <div className="section-title">
            <User size={18} /> Profile information
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="fullName"><User size={14} /> Full Name</label>
              <input id="fullName" value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} required />
            </div>
            <div className="form-field">
              <label htmlFor="phone"><Phone size={14} /> Phone Number</label>
              <input id="phone" value={form.phone} onChange={(e) => {
                updateField('phone', e.target.value);
                if (e.target.value.trim() !== String(storedPhone || '').trim()) setPhoneVerified(false);
              }} required />
            </div>
            <div className="form-field">
              <label htmlFor="nidaNumber"><Shield size={14} /> NIDA Number</label>
              <input id="nidaNumber" inputMode="numeric" value={form.nidaNumber} onChange={(e) => updateField('nidaNumber', e.target.value.replace(/\D/g, '').slice(0, 20))} maxLength={20} />
            </div>
            <div className="form-field">
              <label htmlFor="university"><FileText size={14} /> University (Optional)</label>
              <input id="university" value={form.university} onChange={(e) => updateField('university', e.target.value)} />
            </div>
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>

          <div className="otp-section">
            <div className="section-title" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              <Shield size={16} /> Phone verification
            </div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.75rem' }}>
              {phoneVerified ? 'Your number is verified. Re-verify if you change it.' : 'Verify your phone number to receive important SMS alerts.'}
            </p>
            <button type="button" className="btn-secondary" onClick={sendOtp} disabled={sendingOtp} style={{ width: '100%' }}>
              {sendingOtp ? <RefreshCw size={14} className="animate-spin" /> : <Phone size={14} />}
              {sendingOtp ? 'Sending...' : 'Send OTP'}
            </button>
            <div className="otp-inputs">
              <input placeholder="Enter OTP" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} inputMode="numeric" maxLength={6} />
              <button type="button" className="btn-primary" onClick={verifyOtp} disabled={verifyingOtp} style={{ width: 'auto' }}>
                {verifyingOtp ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />} Verify
              </button>
            </div>
            {otpHint && <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.5rem', fontWeight: 600 }}>{otpHint}</p>}
          </div>
        </div>

        {/* Verification Rejected Section */}
        {verificationStatus === 'REJECTED' && (
          <div className="section-card">
            <div className="section-title" style={{ color: '#991b1b' }}>
              <AlertTriangle size={18} /> Verification rejected
            </div>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
              Your previous documents were rejected. Provide a clear ID photo and a matching selfie to request verification again.
            </p>
            <div className="form-field">
              <label htmlFor="idDocUrl"><Camera size={14} /> New ID document URL</label>
              <input id="idDocUrl" value={idDocUrl} onChange={(e) => setIdDocUrl(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="selfieUrl"><Camera size={14} /> New selfie URL</label>
              <input id="selfieUrl" value={selfieUrl} onChange={(e) => setSelfieUrl(e.target.value)} />
            </div>
            <button type="button" className="btn-primary" onClick={handleResubmitDocs} disabled={resubmitting || !idDocUrl || !selfieUrl}>
              {resubmitting ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {resubmitting ? 'Submitting...' : 'Resubmit documents'}
            </button>
          </div>
        )}

        {/* Danger Zone */}
        <div className="section-card danger-section">
          <div className="section-title" style={{ color: '#991b1b' }}>
            <AlertTriangle size={18} /> Danger zone
          </div>
          {!showDeleteSection ? (
            <button type="button" className="btn-danger" onClick={() => setShowDeleteSection(true)}>
              <Trash2 size={16} /> Delete my account
            </button>
          ) : (
            <div>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
                This will permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <div className="form-field">
                <label htmlFor="deleteConfirm"><AlertTriangle size={14} /> Type DELETE to confirm</label>
                <input id="deleteConfirm" type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn-danger" disabled={deletingAccount || deleteConfirmText.toUpperCase() !== 'DELETE'} onClick={handleDeleteAccount}>
                  {deletingAccount ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Delete account
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setShowDeleteSection(false); setDeleteConfirmText(''); }}>
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

