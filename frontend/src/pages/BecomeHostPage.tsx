import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateRows } from '../lib/supabase';
import { Building2, Home, ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function BecomeHostPage() {
  const { user, token, refreshMe, switchRole } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'landlord' | 'property_manager' | null>(null);
  const [saving, setSaving] = useState(false);

  const handleRegister = async () => {
    if (!selectedRole || !user?.userId || !token) return;
    setSaving(true);
    try {
      // Get current roles array, ensure it's an array
      const currentRoles = Array.isArray(user.roles) ? [...user.roles] : ['tenant'];
      
      // If they don't already have the target role, add it
      if (!currentRoles.includes(selectedRole)) {
        currentRoles.push(selectedRole);
        
        await updateRows(
          'profiles',
          { 
            roles: currentRoles
          },
          { filters: [{ column: 'id', op: 'eq', value: user.userId }], accessToken: token }
        );
      }

      await refreshMe();
      toast.success('Successfully registered as a host!');
      
      // Switch active role to the newly registered role and navigate to dashboard
      switchRole(selectedRole);
      navigate(selectedRole === 'landlord' ? '/landlord/dashboard' : '/manager/dashboard');

    } catch (err: any) {
      toast.error(err.message || 'Failed to register. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '100px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      <header style={{ background: 'white', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #f1f5f9' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
          <ArrowLeft size={24} color="#1e293b" />
        </button>
        <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#1e293b' }}>Become a Host</h1>
      </header>

      <div style={{ padding: '1.5rem', animation: 'slideInRight 0.3s ease-out' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Choose your hosting style</h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '2rem' }}>
          Whether you own the property or manage it on behalf of someone else, iRent makes it easy to list and find great tenants.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
          
          <div 
            onClick={() => setSelectedRole('landlord')}
            style={{ 
              border: selectedRole === 'landlord' ? '2px solid #16a34a' : '2px solid #e2e8f0',
              background: selectedRole === 'landlord' ? '#f0fdf4' : '#fff',
              borderRadius: '16px', padding: '1.5rem', cursor: 'pointer', display: 'flex', gap: '1rem', alignItems: 'flex-start',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ background: selectedRole === 'landlord' ? '#16a34a' : '#f1f5f9', color: selectedRole === 'landlord' ? '#fff' : '#64748b', padding: '0.75rem', borderRadius: '12px', display: 'flex' }}>
              <Home size={24} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Property Owner (Landlord)</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', lineHeight: 1.4 }}>
                I own the property and want to list rooms or houses directly to tenants.
              </p>
            </div>
            <div style={{ marginLeft: 'auto', marginTop: '0.5rem' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: selectedRole === 'landlord' ? 'none' : '2px solid #cbd5e1', background: selectedRole === 'landlord' ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selectedRole === 'landlord' && <CheckCircle size={16} color="#fff" />}
              </div>
            </div>
          </div>

          <div 
            onClick={() => setSelectedRole('property_manager')}
            style={{ 
              border: selectedRole === 'property_manager' ? '2px solid #16a34a' : '2px solid #e2e8f0',
              background: selectedRole === 'property_manager' ? '#f0fdf4' : '#fff',
              borderRadius: '16px', padding: '1.5rem', cursor: 'pointer', display: 'flex', gap: '1rem', alignItems: 'flex-start',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ background: selectedRole === 'property_manager' ? '#16a34a' : '#f1f5f9', color: selectedRole === 'property_manager' ? '#fff' : '#64748b', padding: '0.75rem', borderRadius: '12px', display: 'flex' }}>
              <Building2 size={24} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Property Manager (Dalali)</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', lineHeight: 1.4 }}>
                I manage properties for owners and help them find tenants professionally.
              </p>
            </div>
            <div style={{ marginLeft: 'auto', marginTop: '0.5rem' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: selectedRole === 'property_manager' ? 'none' : '2px solid #cbd5e1', background: selectedRole === 'property_manager' ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selectedRole === 'property_manager' && <CheckCircle size={16} color="#fff" />}
              </div>
            </div>
          </div>

        </div>

        <button 
          onClick={handleRegister}
          disabled={!selectedRole || saving}
          style={{
            width: '100%',
            padding: '1rem',
            background: !selectedRole ? '#cbd5e1' : 'linear-gradient(135deg, #16a34a, #166534)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: !selectedRole || saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          {saving ? <RefreshCw size={20} className="animate-spin" /> : null}
          {saving ? 'Registering...' : 'Register as Host'}
        </button>
      </div>
    </div>
  );
}
