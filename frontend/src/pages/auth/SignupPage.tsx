import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

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
  const { registerStudent, registerLandlord } = useAuth(); // TODO: update AuthContext full methods
  const navigate = useNavigate();

  const handleNext = () => setStep(s => s + 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (role === 'tenant') {
        await registerStudent({ ...formData, email: `${formData.phone}@campusstay.tz` });
      } else {
        await registerLandlord({ ...formData, listerType: role === 'property_manager' ? 'dalali' : 'owner', email: `${formData.phone}@campusstay.tz` });
      }
      toast.success('Registration successful. Please verify your phone.');
      navigate('/auth/login');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (!role) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-ink text-center mb-8">Join CampusStay TZ</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button onClick={() => { setRole('tenant'); setStep(1); }} className="p-6 border rounded-xl hover:border-jade hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">I am looking for a room</h3>
            <p className="text-mid text-sm">Find and book verified rooms and apartments.</p>
          </button>
          <button onClick={() => { setRole('landlord'); setStep(1); }} className="p-6 border rounded-xl hover:border-jade hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">Become a host</h3>
            <p className="text-mid text-sm">List your rooms and manage bookings directly.</p>
          </button>
          <button onClick={() => { setRole('property_manager'); setStep(1); }} className="p-6 border rounded-xl hover:border-jade hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-2">I manage properties</h3>
            <p className="text-mid text-sm">Manage listings on behalf of property owners.</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-6">
      <h2 className="text-3xl font-extrabold text-ink mb-6">
        {role === 'tenant' ? 'Tenant Registration' : role === 'landlord' ? 'Landlord Registration' : 'Property Manager Registration'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 && (
          <>
            <div>
              <label className="block text-sm font-medium text-ink">Full Name</label>
              <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-jade focus:ring-jade sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Phone Number</label>
              <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="07XXXXXXXX" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-jade focus:ring-jade sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Password</label>
              <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-jade focus:ring-jade sm:text-sm p-2 border" />
            </div>
            {role === 'property_manager' && (
              <div className="bg-blue-50 p-4 rounded-md mt-4">
                <p className="text-sm text-blue-800">You list and manage properties on behalf of landlords. Landlords must authorize you before you can manage their properties.</p>
              </div>
            )}
            <button type="button" onClick={handleNext} disabled={!formData.fullName || !formData.phone || !formData.password} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-cream bg-jade hover:bg-opacity-90 mt-6">
              Next Step
            </button>
          </>
        )}
        
        {step === 2 && role === 'tenant' && (
          <>
            <div>
              <label className="block text-sm font-medium text-ink mb-2">I am a:</label>
              <div className="flex gap-2 mb-4">
                {['student', 'professional', 'family', 'other'].map(t => (
                  <button type="button" key={t} onClick={() => setFormData({...formData, tenantType: t})} className={`px-4 py-2 rounded-full text-sm font-medium border ${formData.tenantType === t ? 'bg-jade text-cream border-jade' : 'bg-white text-ink border-gray-300 hover:bg-gray-50'}`}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {(formData.tenantType === 'student' || formData.tenantType === 'professional') && (
              <div>
                <label className="block text-sm font-medium text-ink">{formData.tenantType === 'student' ? 'University / College' : 'Employer'}</label>
                <input type="text" required value={formData.employerOrInstitution} onChange={e => setFormData({...formData, employerOrInstitution: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-jade focus:ring-jade sm:text-sm p-2 border" />
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-cream bg-jade hover:bg-opacity-90 mt-6">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </>
        )}

        {step === 2 && role === 'landlord' && (
          <>
            <div>
              <label className="block text-sm font-medium text-ink">Business Name (Optional)</label>
              <input type="text" value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-jade focus:ring-jade sm:text-sm p-2 border" />
            </div>
            <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-cream bg-jade hover:bg-opacity-90 mt-6">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </>
        )}

        {step === 2 && role === 'property_manager' && (
          <>
            <p className="text-sm text-mid mb-4">Please prepare to upload your national ID after creating your account to verify your profile.</p>
            <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-cream bg-jade hover:bg-opacity-90 mt-6">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
