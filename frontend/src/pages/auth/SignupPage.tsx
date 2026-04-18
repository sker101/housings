import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { User, Home, Building, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

export default function SignupPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialRole = searchParams.get('role') as 'tenant' | 'landlord' | 'property_manager' | null;

  const [role, setRole] = useState<'tenant' | 'landlord' | 'property_manager' | null>(initialRole);
  const [step, setStep] = useState(initialRole ? 1 : 1);
  const [formData, setFormData] = useState({
    fullName: '', phone: '', password: '', 
    tenantType: 'student', occupation: '', employerOrInstitution: '',
    businessName: ''
  });
  const [loading, setLoading] = useState(false);
  const { registerStudent, registerLandlord } = useAuth(); // registerRole mapping happens internally
  const navigate = useNavigate();

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step, role]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
    else if (step === 1 && !initialRole) setRole(null);
    else navigate(-1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (role === 'tenant') {
        // Assume registerStudent handles tenant internally
        await registerStudent({ ...formData, email: `${formData.phone}@campusstay.tz` });
      } else {
        await registerLandlord({ ...formData, listerType: role === 'property_manager' ? 'dalali' : 'owner', email: `${formData.phone}@campusstay.tz` });
      }
      toast.success('Registration successful. Welcome to CampusStay TZ!');
      navigate('/auth/login');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, type = "text", ...props }: any) => (
    <div className="mb-5">
      <label className="block text-sm font-semibold text-ink mb-1.5">{label}</label>
      <input 
        type={type} 
        className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-ink focus:bg-white focus:border-jade focus:ring-2 focus:ring-jade focus:ring-opacity-20 transition-all duration-200 outline-none" 
        {...props} 
      />
    </div>
  );

  if (!role) {
    return (
      <div className="min-h-screen bg-cream py-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-ink tracking-tight mb-4">
              Join <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22c55e] to-[#15803d]">CampusStay TZ</span>
            </h1>
            <p className="text-lg text-mid max-w-2xl mx-auto">
              Select how you want to use the platform. Whether you're searching for your next home or managing properties, we have the perfect tools for you.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button 
              onClick={() => { setRole('tenant'); setStep(1); }} 
              className="flex flex-col items-center p-8 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-jade hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-100 transition-all">
                <User size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-ink mb-3 group-hover:text-[#22c55e] transition-colors">I am looking for a room</h3>
              <p className="text-mid text-sm text-center line-clamp-2">Find, compare and securely book verified rooms, hostels, or apartments.</p>
            </button>

            <button 
              onClick={() => { setRole('landlord'); setStep(1); }} 
              className="flex flex-col items-center p-8 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-jade hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group ring-2 ring-transparent hover:ring-[#22c55e]/10"
            >
              <div className="w-16 h-16 rounded-full bg-green-50 text-[#22c55e] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-green-100 transition-all">
                <Home size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-ink mb-3 group-hover:text-[#22c55e] transition-colors">Become a host</h3>
              <p className="text-mid text-sm text-center line-clamp-2">List your properties, find reliable tenants, and manage bookings easily.</p>
            </button>

            <button 
              onClick={() => { setRole('property_manager'); setStep(1); }} 
              className="flex flex-col items-center p-8 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-jade hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-purple-100 transition-all">
                <Building size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-ink mb-3 group-hover:text-[#22c55e] transition-colors">I manage properties</h3>
              <p className="text-mid text-sm text-center line-clamp-2">Professional dashboard to manage multiple listings on behalf of owners.</p>
            </button>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-mid">
              Already have an account? <Link to="/auth/login" className="font-semibold text-[#22c55e] hover:text-[#15803d] transition">Log in here</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const roleTitle = role === 'tenant' ? 'Tenant Registration' : role === 'landlord' ? 'Landlord Registration' : 'Property Manager Registration';
  const roleSubtitle = role === 'tenant' ? 'Find your perfect home' : role === 'landlord' ? 'Start earning from your property' : 'Manage properties professionally';

  return (
    <div className="min-h-screen bg-cream flex flex-col py-10 px-4 sm:px-6">
      
      <div className="w-full max-w-md mx-auto mb-6">
        <button onClick={handleBack} className="flex items-center text-sm font-medium text-mid hover:text-ink transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Back
        </button>
      </div>

      <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#22c55e] to-[#15803d] px-8 py-10 text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10"></div>
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-black opacity-10"></div>
          
          <h2 className="text-2xl sm:text-3xl font-extrabold relative z-10">{roleTitle}</h2>
          <p className="text-green-50 font-medium mt-2 relative z-10 opacity-90">{roleSubtitle}</p>
          
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-6 relative z-10">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-white' : 'bg-white/30'}`}></div>
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-white' : 'bg-white/30'}`}></div>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-xl font-bold text-ink mb-6">Basic Information</h3>
                
                <InputField 
                  label="Full Name" 
                  required 
                  value={formData.fullName} 
                  onChange={(e: any) => setFormData({...formData, fullName: e.target.value})} 
                  placeholder="John Doe"
                />
                
                <InputField 
                  label="Phone Number" 
                  type="tel" 
                  required 
                  value={formData.phone} 
                  onChange={(e: any) => setFormData({...formData, phone: e.target.value})} 
                  placeholder="07XXXXXXXX"
                />
                
                <InputField 
                  label="Password" 
                  type="password" 
                  required 
                  value={formData.password} 
                  onChange={(e: any) => setFormData({...formData, password: e.target.value})} 
                  placeholder="Create a strong password"
                />

                {role === 'property_manager' && (
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mt-6 flex gap-3">
                    <CheckCircle className="text-blue-500 shrink-0 mt-0.5" size={20} />
                    <p className="text-sm text-blue-800 leading-relaxed">
                      You list and manage properties on behalf of landlords. Landlords must authorize you before you can manage their properties.
                    </p>
                  </div>
                )}

                <button 
                  type="button" 
                  onClick={handleNext} 
                  disabled={!formData.fullName || !formData.phone || !formData.password} 
                  className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-[0_4px_14px_0_rgba(34,197,94,0.39)] text-base font-semibold text-white bg-[#22c55e] hover:bg-[#16a34a] hover:shadow-[0_6px_20px_rgba(34,197,94,0.23)] transition-all duration-200 mt-8 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  Continue <ArrowRight size={18} className="ml-2" />
                </button>
              </div>
            )}
            
            {step === 2 && role === 'tenant' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-xl font-bold text-ink mb-6">Tell us more about yourself</h3>
                
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-ink mb-3">I am a:</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['student', 'professional', 'family', 'other'].map(t => (
                      <button 
                        type="button" 
                        key={t} 
                        onClick={() => setFormData({...formData, tenantType: t})} 
                        className={`px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all duration-200 outline-none ${
                          formData.tenantType === t 
                            ? 'bg-green-50 text-[#15803d] border-[#22c55e]' 
                            : 'bg-white text-ink border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {(formData.tenantType === 'student' || formData.tenantType === 'professional') && (
                  <InputField 
                    label={formData.tenantType === 'student' ? 'University / College Name' : 'Employer Name'} 
                    required 
                    value={formData.employerOrInstitution} 
                    onChange={(e: any) => setFormData({...formData, employerOrInstitution: e.target.value})} 
                    placeholder={formData.tenantType === 'student' ? 'e.g. University of Dar es Salaam' : 'e.g. Vodacom'}
                  />
                )}

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-[0_4px_14px_0_rgba(34,197,94,0.39)] text-base font-semibold text-white bg-[#22c55e] hover:bg-[#16a34a] hover:shadow-[0_6px_20px_rgba(34,197,94,0.23)] transition-all duration-200 mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Creating account...</>
                  ) : 'Create Account'}
                </button>
              </div>
            )}

            {step === 2 && role === 'landlord' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-xl font-bold text-ink mb-6">Professional Details</h3>
                
                <InputField 
                  label="Business/Company Name (Optional)" 
                  value={formData.businessName} 
                  onChange={(e: any) => setFormData({...formData, businessName: e.target.value})} 
                  placeholder="e.g. Skyline Properties Ltd"
                />

                <div className="bg-gray-50 border border-gray-100 p-5 rounded-xl mt-6">
                  <h4 className="font-semibold text-sm mb-1.5 text-ink">What's next?</h4>
                  <p className="text-sm text-mid leading-relaxed">After creating your account, you will be able to immediately list your properties and set up your payout methods.</p>
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-[0_4px_14px_0_rgba(34,197,94,0.39)] text-base font-semibold text-white bg-[#22c55e] hover:bg-[#16a34a] hover:shadow-[0_6px_20px_rgba(34,197,94,0.23)] transition-all duration-200 mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Creating account...</>
                  ) : 'Create Account'}
                </button>
              </div>
            )}

            {step === 2 && role === 'property_manager' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-xl font-bold text-ink mb-6">Verification Preparation</h3>
                
                <div className="bg-amber-50 border border-amber-100 p-5 rounded-xl mb-6">
                  <div className="flex gap-3">
                    <CheckCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-semibold text-amber-800 text-sm mb-1.5">ID Verification Required</h4>
                      <p className="text-sm text-amber-700 leading-relaxed">
                        To maintain trust, all property managers must verify their identity. Please prepare to upload your National ID (NIDA) or valid Passport after creating your account.
                      </p>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-[0_4px_14px_0_rgba(34,197,94,0.39)] text-base font-semibold text-white bg-[#22c55e] hover:bg-[#16a34a] hover:shadow-[0_6px_20px_rgba(34,197,94,0.23)] transition-all duration-200 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Creating account...</>
                  ) : 'Create Account'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
      
      <div className="mt-8 text-center pb-8">
        <p className="text-mid text-sm">
          By signing up, you agree to our <Link to="/terms" className="font-medium text-[#22c55e] hover:underline">Terms of Service</Link> and <Link to="/privacy" className="font-medium text-[#22c55e] hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
