import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { User, Home, Building2, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

/* ─── tiny style-in-JS objects to avoid Tailwind dependency ─── */
const S = {
  page: {
    minHeight: 'calc(100vh - 64px)',
    background: 'var(--cream)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '2rem 1rem 4rem',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    background: 'none',
    border: 'none',
    color: 'var(--mid)',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    padding: '0.4rem 0',
    marginBottom: '1.25rem',
    transition: 'color 0.2s',
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    background: '#fff',
    borderRadius: '20px',
    border: '1px solid var(--border)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.07)',
    overflow: 'hidden',
  },
  cardHeader: {
    background: 'linear-gradient(135deg, var(--jade) 0%, var(--jade-light) 100%)',
    padding: '2rem 2rem 1.75rem',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  cardHeaderDecor1: {
    position: 'absolute' as const,
    top: '-28px', right: '-28px',
    width: '100px', height: '100px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.12)',
  },
  cardHeaderDecor2: {
    position: 'absolute' as const,
    bottom: '-20px', left: '30px',
    width: '70px', height: '70px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.08)',
  },
  cardHeaderTitle: {
    color: '#fff',
    fontSize: '1.6rem',
    fontWeight: 700,
    margin: 0,
    position: 'relative' as const,
    zIndex: 1,
    letterSpacing: '-0.02em',
  },
  cardHeaderSub: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: '0.9rem',
    margin: '0.4rem 0 0',
    position: 'relative' as const,
    zIndex: 1,
  },
  stepBar: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1.25rem',
    position: 'relative' as const,
    zIndex: 1,
  },
  stepDot: (active: boolean) => ({
    height: '4px',
    flex: 1,
    borderRadius: '99px',
    background: active ? '#fff' : 'rgba(255,255,255,0.3)',
    transition: 'background 0.35s',
  }),
  body: {
    padding: '2rem',
  },

  /* Role picker specific */
  rolePickerPage: {
    minHeight: 'calc(100vh - 64px)',
    background: 'var(--cream)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem 4rem',
  },
  rolePickerWrap: {
    width: '100%',
    maxWidth: '720px',
  },
  rolePickerTitle: {
    textAlign: 'center' as const,
    fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
    fontWeight: 800,
    color: 'var(--ink)',
    letterSpacing: '-0.03em',
    marginBottom: '0.6rem',
  },
  rolePickerSub: {
    textAlign: 'center' as const,
    color: 'var(--mid)',
    fontSize: '1rem',
    marginBottom: '2.5rem',
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  roleCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    padding: '2rem 1.5rem',
    background: '#fff',
    border: '2px solid var(--border)',
    borderRadius: '18px',
    cursor: 'pointer',
    transition: 'all 0.22s ease',
    boxShadow: 'var(--shadow-card)',
  },
  roleIconWrap: (color: string, bg: string) => ({
    width: '64px',
    height: '64px',
    borderRadius: '18px',
    background: bg,
    color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.25rem',
    transition: 'transform 0.22s ease',
  }),
  roleTitle: {
    fontWeight: 700,
    fontSize: '1.05rem',
    color: 'var(--ink)',
    marginBottom: '0.4rem',
  },
  roleDesc: {
    color: 'var(--mid)',
    fontSize: '0.85rem',
    lineHeight: 1.55,
  },

  /* Form fields */
  fieldGroup: {
    marginBottom: '1.1rem',
  },
  label: {
    display: 'block',
    fontWeight: 600,
    fontSize: '0.85rem',
    color: 'var(--ink)',
    marginBottom: '0.45rem',
  },
  input: {
    width: '100%',
    border: '1.5px solid var(--border)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    fontSize: '0.95rem',
    color: 'var(--ink)',
    background: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box' as const,
  },
  inputFocus: {
    borderColor: 'var(--jade-light)',
    boxShadow: '0 0 0 3px rgba(21,128,61,0.14)',
  },
  passwordWrap: {
    position: 'relative' as const,
  },
  eyeBtn: {
    position: 'absolute' as const,
    top: '50%',
    right: '0.75rem',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--mid)',
    display: 'flex',
    alignItems: 'center',
    padding: '0.25rem',
  },

  /* Primary button */
  btn: {
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
    marginTop: '1.5rem',
    transition: 'background 0.2s, transform 0.15s, box-shadow 0.2s',
    boxShadow: '0 4px 14px rgba(22,101,52,0.35)',
  },
  btnDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },

  /* Tenant type chips */
  chipGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.6rem',
    marginBottom: '1.1rem',
  },
  chip: (active: boolean) => ({
    padding: '0.7rem 1rem',
    borderRadius: '10px',
    border: `2px solid ${active ? 'var(--jade-light)' : 'var(--border)'}`,
    background: active ? 'var(--jade-muted)' : '#fff',
    color: active ? 'var(--jade)' : 'var(--ink)',
    fontWeight: active ? 600 : 500,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.18s',
    textAlign: 'center' as const,
  }),

  infoBox: (color: string, bg: string, border: string) => ({
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: '12px',
    padding: '1rem 1.1rem',
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '0.5rem',
    color,
    fontSize: '0.88rem',
    lineHeight: 1.55,
  }),

  divider: {
    height: '1px',
    background: 'var(--border)',
    margin: '1.5rem 0',
  },

  loginLink: {
    textAlign: 'center' as const,
    color: 'var(--mid)',
    fontSize: '0.9rem',
    marginTop: '1.5rem',
    maxWidth: '460px',
    width: '100%',
  },
  loginLinkA: {
    color: 'var(--jade)',
    fontWeight: 600,
    textDecoration: 'none',
  },

  sectionTitle: {
    fontWeight: 700,
    fontSize: '1.05rem',
    color: 'var(--ink)',
    marginBottom: '1rem',
  },

  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
};

/* ─── Reusable field component ─── */
function Field({ label, type = 'text', value, onChange, placeholder, required }: any) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPw = type === 'password';
  const inputType = isPw ? (showPw ? 'text' : 'password') : type;

  return (
    <div style={S.fieldGroup}>
      <label style={S.label}>{label}{required && <span style={{ color: 'var(--red)', marginLeft: '2px' }}>*</span>}</label>
      <div style={isPw ? S.passwordWrap : undefined}>
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          style={{ ...S.input, ...(focused ? S.inputFocus : {}) }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {isPw && (
          <button type="button" style={S.eyeBtn} onClick={() => setShowPw(p => !p)} tabIndex={-1}>
            {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Submit / Next button ─── */
function PrimaryBtn({ children, disabled, type = 'button', onClick }: any) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...S.btn,
        ...(disabled ? S.btnDisabled : {}),
        ...(hover && !disabled ? { background: 'var(--jade-light)', transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(22,101,52,0.28)' } : {}),
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  );
}

/* ─── Main Component ─── */
export default function SignupPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialRole = searchParams.get('role') as 'tenant' | 'landlord' | 'property_manager' | null;

  const [role, setRole] = useState<'tenant' | 'landlord' | 'property_manager' | null>(initialRole);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '', phone: '', password: '',
    tenantType: 'student', employerOrInstitution: '', businessName: '',
  });
  const [loading, setLoading] = useState(false);
  const { registerStudent, registerLandlord } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step, role]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (role === 'tenant') {
        await registerStudent({ ...formData, email: `${formData.phone}@campusstay.tz` });
      } else {
        await registerLandlord({
          ...formData,
          listerType: role === 'property_manager' ? 'dalali' : 'owner',
          email: `${formData.phone}@campusstay.tz`,
        });
      }
      toast.success('Account created! Welcome to CampusStay TZ 🎉');
      navigate('/auth/login');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ════════════════════════════════════════════
   * ROLE PICKER SCREEN
   * ════════════════════════════════════════════ */
  if (!role) {
    return (
      <div style={S.rolePickerPage}>
        <div style={S.rolePickerWrap}>
          <h1 style={S.rolePickerTitle}>
            Join <span style={{ color: 'var(--jade-light)' }}>CampusStay TZ</span>
          </h1>
          <p style={S.rolePickerSub}>
            Choose how you want to use the platform to get started.
          </p>

          <div style={S.roleGrid}>
            <RoleCard
              icon={<User size={28} />}
              iconColor="#3b82f6"
              iconBg="#eff6ff"
              title="I'm looking for a room"
              desc="Find and book verified rooms, hostels, and apartments near your campus."
              onClick={() => setRole('tenant')}
            />
            <RoleCard
              icon={<Home size={28} />}
              iconColor="var(--jade)"
              iconBg="var(--jade-muted)"
              title="Become a host"
              desc="List your rooms, find reliable tenants and manage bookings in one place."
              onClick={() => setRole('landlord')}
            />
            <RoleCard
              icon={<Building2 size={28} />}
              iconColor="#7c3aed"
              iconBg="#f5f3ff"
              title="I manage properties"
              desc="Professional tools to manage listings on behalf of multiple owners."
              onClick={() => setRole('property_manager')}
            />
          </div>

          <p style={{ ...S.loginLink, margin: '2rem auto 0', textAlign: 'center' }}>
            Already have an account?{' '}
            <Link to="/auth/login" style={S.loginLinkA}>Sign in →</Link>
          </p>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
   * FORM SCREENS
   * ════════════════════════════════════════════ */
  const titleMap = {
    tenant: 'Create your account',
    landlord: 'Become a host',
    property_manager: 'Join as Manager',
  };
  const subMap = {
    tenant: 'Find your perfect home in Tanzania',
    landlord: 'Start earning from your property today',
    property_manager: 'Manage properties professionally',
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={S.page}>
        {/* Back */}
        <div style={{ width: '100%', maxWidth: '460px', marginBottom: '0.25rem' }}>
          <button
            style={S.backBtn}
            onClick={() => step > 1 ? setStep(s => s - 1) : (initialRole ? navigate(-1) : setRole(null))}
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        <div style={S.card}>
          {/* ── Card Header ── */}
          <div style={S.cardHeader}>
            <div style={S.cardHeaderDecor1} />
            <div style={S.cardHeaderDecor2} />
            <h2 style={S.cardHeaderTitle}>{titleMap[role]}</h2>
            <p style={S.cardHeaderSub}>{subMap[role]}</p>
            {/* Step indicator */}
            <div style={S.stepBar}>
              <div style={S.stepDot(step >= 1)} />
              <div style={S.stepDot(step >= 2)} />
            </div>
          </div>

          {/* ── Card Body ── */}
          <div style={S.body}>
            <form onSubmit={handleSubmit}>

              {/* ── STEP 1: Basic info ── */}
              {step === 1 && (
                <>
                  <p style={S.sectionTitle}>Basic Information</p>

                  <Field label="Full Name" required value={formData.fullName} onChange={set('fullName')} placeholder="e.g. Amina Rashidi" />
                  <Field label="Phone Number" type="tel" required value={formData.phone} onChange={set('phone')} placeholder="07XXXXXXXX" />
                  <Field label="Password" type="password" required value={formData.password} onChange={set('password')} placeholder="At least 8 characters" />

                  {role === 'property_manager' && (
                    <div style={S.infoBox('var(--blue)', 'var(--blue-light)', '#bfdbfe')}>
                      <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span>You will manage listings on behalf of property owners. An ID verification step follows account creation.</span>
                    </div>
                  )}

                  <PrimaryBtn
                    onClick={() => setStep(2)}
                    disabled={!formData.fullName.trim() || !formData.phone.trim() || formData.password.length < 6}
                  >
                    Continue <ArrowRight size={17} />
                  </PrimaryBtn>
                </>
              )}

              {/* ── STEP 2: Tenant details ── */}
              {step === 2 && role === 'tenant' && (
                <>
                  <p style={S.sectionTitle}>Tell us about yourself</p>
                  <p style={{ color: 'var(--mid)', fontSize: '0.88rem', marginBottom: '1rem' }}>
                    This helps us show you the most relevant listings.
                  </p>

                  <div style={{ marginBottom: '0.5rem' }}>
                    <label style={S.label}>I am a:</label>
                    <div style={S.chipGrid}>
                      {(['student', 'professional', 'family', 'other'] as const).map(t => (
                        <button
                          type="button"
                          key={t}
                          style={S.chip(formData.tenantType === t)}
                          onClick={() => setFormData(prev => ({ ...prev, tenantType: t }))}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(formData.tenantType === 'student' || formData.tenantType === 'professional') && (
                    <Field
                      label={formData.tenantType === 'student' ? 'University / College' : 'Employer'}
                      required
                      value={formData.employerOrInstitution}
                      onChange={set('employerOrInstitution')}
                      placeholder={formData.tenantType === 'student' ? 'e.g. University of Dar es Salaam' : 'e.g. Vodacom Tanzania'}
                    />
                  )}

                  <div style={S.divider} />

                  <PrimaryBtn type="submit" disabled={loading}>
                    {loading
                      ? <><span style={S.spinner} /> Creating account…</>
                      : <> Create Account <ArrowRight size={17} /></>
                    }
                  </PrimaryBtn>
                </>
              )}

              {/* ── STEP 2: Landlord details ── */}
              {step === 2 && role === 'landlord' && (
                <>
                  <p style={S.sectionTitle}>Property details</p>

                  <Field
                    label="Business / Company Name (optional)"
                    value={formData.businessName}
                    onChange={set('businessName')}
                    placeholder="e.g. Skyline Properties Ltd"
                  />

                  <div style={S.infoBox('var(--jade)', '#f0fdf4', '#bbf7d0')}>
                    <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>
                      After signup you can immediately add your listings and configure payouts. A verification badge helps you earn more bookings faster.
                    </span>
                  </div>

                  <div style={S.divider} />

                  <PrimaryBtn type="submit" disabled={loading}>
                    {loading
                      ? <><span style={S.spinner} /> Creating account…</>
                      : <> Create Account <ArrowRight size={17} /></>
                    }
                  </PrimaryBtn>
                </>
              )}

              {/* ── STEP 2: Property Manager ── */}
              {step === 2 && role === 'property_manager' && (
                <>
                  <p style={S.sectionTitle}>Verification Required</p>

                  <div style={S.infoBox('#92400e', '#fffbeb', '#fde68a')}>
                    <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '1px', color: 'var(--amber)' }} />
                    <div>
                      <strong style={{ display: 'block', marginBottom: '0.3rem' }}>ID Verification Required</strong>
                      To maintain trust on the platform, all property managers must verify their identity. Please have your National ID (NIDA) or valid Passport ready to upload after creating your account.
                    </div>
                  </div>

                  <div style={S.divider} />

                  <PrimaryBtn type="submit" disabled={loading}>
                    {loading
                      ? <><span style={S.spinner} /> Creating account…</>
                      : <> Create Account <ArrowRight size={17} /></>
                    }
                  </PrimaryBtn>
                </>
              )}
            </form>
          </div>
        </div>

        {/* Login link */}
        <p style={S.loginLink}>
          Already have an account?{' '}
          <Link to="/auth/login" style={S.loginLinkA}>Sign in →</Link>
        </p>

        {/* Terms */}
        <p style={{ ...S.loginLink, fontSize: '0.8rem', marginTop: '0.75rem' }}>
          By signing up you agree to our{' '}
          <Link to="/terms" style={{ ...S.loginLinkA, fontWeight: 500 }}>Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" style={{ ...S.loginLinkA, fontWeight: 500 }}>Privacy Policy</Link>
        </p>
      </div>
    </>
  );
}

/* ─── Role Picker Card ─── */
function RoleCard({ icon, iconColor, iconBg, title, desc, onClick }: any) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        ...S.roleCard,
        ...(hover ? { borderColor: 'var(--jade-light)', boxShadow: 'var(--shadow-soft)', transform: 'translateY(-3px)' } : {}),
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{
        ...S.roleIconWrap(iconColor, iconBg),
        ...(hover ? { transform: 'scale(1.1)' } : {}),
      }}>
        {icon}
      </div>
      <p style={S.roleTitle}>{title}</p>
      <p style={S.roleDesc}>{desc}</p>
    </button>
  );
}
