import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  Phone, 
  User, 
  Briefcase, 
  Building2, 
  ArrowRight, 
  ShieldCheck,
  CheckCircle2 
} from 'lucide-react';
import { updateRows } from '../../lib/supabase';
import { dashboardDefaultPath } from '../../lib/roles';

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const { user, profile, token, refreshMe } = useAuth();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    fullName: profile?.full_name || user?.fullName || '',
    tenantType: 'student',
    employerOrInstitution: '',
    businessName: '',
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth/login', { replace: true });
    }
  }, [user, navigate]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData(prev => ({ ...prev, [key]: e.target.value }));

  const handleContinue = () => {
    if (step === 1 && !formData.phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    if (step === 1 && formData.phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !user?.userId) {
      toast.error('Authentication required');
      return;
    }

    setLoading(true);
    try {
      // Update profile with phone and additional info
      const updateData: Record<string, unknown> = {
        phone: formData.phone.trim(),
        full_name: formData.fullName.trim() || profile?.full_name || user?.fullName,
        verification_status: 'pending', // Ready for phone verification
      };

      // Add role-specific data
      if (profile?.role === 'tenant') {
        updateData.university = formData.tenantType === 'student' 
          ? formData.employerOrInstitution 
          : '';
      } else if (profile?.role === 'landlord' && formData.businessName) {
        updateData.business_name = formData.businessName;
      }

      await updateRows('profiles', updateData, {
        filters: [{ column: 'id', op: 'eq', value: user.userId }],
        accessToken: token,
      });

      // Refresh user data
      await refreshMe();

      toast.success('Profile updated! Welcome to iRent 🎉');
      
      // Redirect to dashboard
      navigate(dashboardDefaultPath(profile?.role || 'tenant'), { replace: true });
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const role = profile?.role || 'tenant';
  const isTenant = role === 'tenant';
  const isLandlord = role === 'landlord';

  const progressStepStyle = (active: boolean): React.CSSProperties => ({
    height: '4px',
    flex: 1,
    borderRadius: '99px',
    background: active ? 'var(--jade)' : 'var(--border)',
    transition: 'background 0.35s',
  });

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.7rem 1rem',
    borderRadius: '10px',
    border: `2px solid ${active ? 'var(--jade)' : 'var(--border)'}`,
    background: active ? 'rgba(22,163,74,0.1)' : '#fff',
    color: active ? 'var(--jade)' : 'var(--ink)',
    fontWeight: active ? 600 : 500,
    fontSize: '0.9rem',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.18s',
  });

  const pageStyle: React.CSSProperties = {
    minHeight: 'calc(100vh - 64px)',
    background: 'var(--cream, #fafaf9)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2rem 1rem 4rem',
  };

  const wrapperStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '460px',
  };

  const brandStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '1.5rem',
  };

  const logoStyle: React.CSSProperties = {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'var(--jade)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--ink)',
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '0.95rem',
    color: 'var(--mid)',
    margin: '0.4rem 0 0',
  };

  const progressBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '20px',
    border: '1px solid var(--border)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.07)',
    overflow: 'hidden',
  };

  const stepStyle: React.CSSProperties = {
    padding: '2rem',
  };

  const stepHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
  };

  const stepTitleStyle: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--ink)',
    margin: 0,
  };

  const stepDescStyle: React.CSSProperties = {
    fontSize: '0.9rem',
    color: 'var(--mid)',
    marginBottom: '1.5rem',
    lineHeight: 1.5,
  };

  const fieldStyle: React.CSSProperties = {
    marginBottom: '1.25rem',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 600,
    fontSize: '0.85rem',
    color: 'var(--ink)',
    marginBottom: '0.45rem',
  };

  const requiredStyle: React.CSSProperties = {
    color: '#ef4444',
    marginLeft: '2px',
  };

  const inputWrapStyle: React.CSSProperties = {
    position: 'relative',
  };

  const inputIconStyle: React.CSSProperties = {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--mid)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1.5px solid var(--border)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    paddingLeft: '2.75rem',
    fontSize: '0.95rem',
    color: 'var(--ink)',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const hintStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    color: 'var(--mid)',
    margin: '0.35rem 0 0',
  };

  const chipGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.6rem',
  };

  const infoBoxStyle: React.CSSProperties = {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '1rem 1.1rem',
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1.5rem',
    color: 'var(--jade)',
    fontSize: '0.88rem',
    lineHeight: 1.55,
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--jade)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '0.95rem 1rem',
    fontSize: '0.98rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'background 0.2s, transform 0.15s',
  };

  const buttonSecondaryStyle: React.CSSProperties = {
    flex: 1,
    background: 'transparent',
    color: 'var(--mid)',
    border: '1.5px solid var(--border)',
    borderRadius: '12px',
    padding: '0.95rem 1rem',
    fontSize: '0.98rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.75rem',
  };

  const spinnerStyle: React.CSSProperties = {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  };

  return (
    <div style={pageStyle}>
      <div style={wrapperStyle}>
        {/* Header */}
        <div style={brandStyle}>
          <div style={logoStyle}>
            <ShieldCheck size={28} />
          </div>
          <h1 style={titleStyle}>Complete Your Profile</h1>
          <p style={subtitleStyle}>
            Just a few more details to get you started
          </p>
        </div>

        {/* Progress */}
        <div style={progressBarStyle}>
          <div style={progressStepStyle(step >= 1)} />
          <div style={progressStepStyle(step >= 2)} />
        </div>

        {/* Card */}
        <div style={cardStyle}>
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div style={stepStyle}>
              <div style={stepHeaderStyle}>
                <Phone size={24} color="var(--jade)" />
                <h2 style={stepTitleStyle}>Contact Information</h2>
              </div>
              
              <p style={stepDescStyle}>
                We need your phone number to verify your account and keep you updated on your bookings.
              </p>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Phone Number <span style={requiredStyle}>*</span>
                </label>
                <div style={inputWrapStyle}>
                  <Phone size={18} style={inputIconStyle} />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={set('phone')}
                    placeholder="07XXXXXXXX"
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <p style={hintStyle}>Format: 07XX XXX XXX (Tanzanian number)</p>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Full Name</label>
                <div style={inputWrapStyle}>
                  <User size={18} style={inputIconStyle} />
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={set('fullName')}
                    placeholder="Your full name"
                    style={inputStyle}
                  />
                </div>
              </div>

              <button 
                onClick={handleContinue}
                style={buttonStyle}
                disabled={!formData.phone.trim() || formData.phone.length < 10}
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* Step 2: Role-specific Info */}
          {step === 2 && (
            <form onSubmit={handleSubmit} style={stepStyle}>
              <div style={stepHeaderStyle}>
                {isTenant ? (
                  <Briefcase size={24} color="var(--jade)" />
                ) : (
                  <Building2 size={24} color="var(--jade)" />
                )}
                <h2 style={stepTitleStyle}>
                  {isTenant ? 'About You' : isLandlord ? 'Property Details' : 'Profile Details'}
                </h2>
              </div>

              {isTenant && (
                <>
                  <p style={stepDescStyle}>
                    This helps us show you the most relevant listings near your campus or workplace.
                  </p>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>I am a:</label>
                    <div style={chipGridStyle}>
                      {(['student', 'professional', 'family', 'other'] as const).map(t => (
                        <button
                          type="button"
                          key={t}
                          onClick={() => setFormData(prev => ({ ...prev, tenantType: t }))}
                          style={chipStyle(formData.tenantType === t)}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(formData.tenantType === 'student' || formData.tenantType === 'professional') && (
                    <div style={fieldStyle}>
                      <label style={labelStyle}>
                        {formData.tenantType === 'student' ? 'University / College' : 'Employer'}
                      </label>
                      <input
                        type="text"
                        value={formData.employerOrInstitution}
                        onChange={set('employerOrInstitution')}
                        placeholder={formData.tenantType === 'student' 
                          ? 'e.g. University of Dar es Salaam' 
                          : 'e.g. Vodacom Tanzania'}
                        style={inputStyle}
                      />
                    </div>
                  )}
                </>
              )}

              {isLandlord && (
                <>
                  <p style={stepDescStyle}>
                    Add your business details to build trust with potential tenants.
                  </p>

                  <div style={fieldStyle}>
                    <label style={labelStyle}>Business / Company Name (optional)</label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={set('businessName')}
                      placeholder="e.g. Skyline Properties Ltd"
                      style={inputStyle}
                    />
                  </div>

                  <div style={infoBoxStyle}>
                    <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>
                      After completing your profile, you can immediately add your listings. 
                      A verification badge helps you earn more bookings faster.
                    </span>
                  </div>
                </>
              )}

              <div style={buttonGroupStyle}>
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  style={buttonSecondaryStyle}
                >
                  Back
                </button>
                <button 
                  type="submit"
                  style={buttonStyle}
                  disabled={loading}
                >
                  {loading ? (
                    <span style={spinnerStyle} />
                  ) : (
                    <>Complete Profile <ArrowRight size={18} /></>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
