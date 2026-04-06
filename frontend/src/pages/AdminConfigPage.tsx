import React, { useState, useEffect } from 'react';
import { selectRows, updateRows, upsertRows } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Sliders, Save, AlertCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

interface ConfigItem {
  key: string;
  value: string;
  value_type: string;
  description: string;
}

export default function AdminConfigPage() {
  const { user } = useAuth();
  const [config, setConfig] = useState<Record<string, ConfigItem>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [showPaymentWarning, setShowPaymentWarning] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const data = await selectRows('system_config', {});
      const configMap: Record<string, ConfigItem> = {};
      data.forEach((item: ConfigItem) => {
        configMap[item.key] = item;
      });
      setConfig(configMap);
    } catch (error) {
      toast.error('Failed to load system configuration');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = async (key: string, newValue: string) => {
    if (key === 'payment_env' && newValue === 'live' && config[key]?.value !== 'live') {
      setShowPaymentWarning(true);
      return;
    }

    const updatedConfig = { ...config };
    updatedConfig[key] = { ...updatedConfig[key], value: newValue };
    setConfig(updatedConfig);
    setIsDirty(true);
  };

  const saveConfig = async () => {
    try {
      for (const [key, item] of Object.entries(config)) {
        await upsertRows('system_config', {
          key,
          value: item.value,
          value_type: item.value_type,
          description: item.description,
          updated_by: user?.userId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });
      }

      toast.success('Configuration saved');
      setIsDirty(false);
    } catch (error) {
      toast.error('Failed to save configuration');
      console.error(error);
    }
  };

  const getInputComponent = (key: string) => {
    const item = config[key];
    if (!item) return null;

    switch (item.value_type) {
      case 'boolean':
        return (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={item.value === 'true'}
              onChange={(e) => updateConfig(key, e.target.checked ? 'true' : 'false')}
              style={{ width: '18px', height: '18px' }}
            />
            {item.value === 'true' ? 'Enabled' : 'Disabled'}
          </label>
        );
      case 'number':
        return (
          <input
            type="number"
            value={item.value}
            onChange={(e) => updateConfig(key, e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontFamily: 'inherit',
              width: '100%'
            }}
          />
        );
      case 'string':
        if (key === 'payment_env') {
          return (
            <select
              value={item.value}
              onChange={(e) => updateConfig(key, e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                width: '100%'
              }}
            >
              <option value="mock">Mock (Testing)</option>
              <option value="sandbox">Sandbox (Pre-Prod)</option>
              <option value="live">Live (Production)</option>
            </select>
          );
        }
        return (
          <input
            type="text"
            value={item.value}
            onChange={(e) => updateConfig(key, e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontFamily: 'inherit',
              width: '100%'
            }}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        <Loader size={32} style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
        Loading configuration...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>System Configuration</h1>
          <p style={{ color: '#6b7280' }}>Manage platform settings, features, and fees</p>
        </div>
        {isDirty && (
          <button
            onClick={saveConfig}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#0d7a6e',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Save size={18} />
            Save Changes
          </button>
        )}
      </div>

      {/* Platform toggles */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '2px solid #e5e7eb' }}>
          Platform Toggles
        </h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {['registrations_open', 'email_verification_required', 'dalali_subscriptions_enabled', 'sms_enabled', 'maintenance_mode'].map((key) => {
            const item = config[key];
            if (!item) return null;
            return (
              <div
                key={key}
                style={{
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                    {item.key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>{item.description}</p>
                </div>
                {getInputComponent(key)}
              </div>
            );
          })}
        </div>
      </section>

      {/* Fee Configuration */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '2px solid #e5e7eb' }}>
          Fee Configuration
        </h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {['platform_commission_pct', 'dalali_pro_monthly_tzs', 'featured_listing_boost_tzs'].map((key) => {
            const item = config[key];
            if (!item) return null;
            return (
              <div
                key={key}
                style={{
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                    {item.key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>{item.description}</p>
                </div>
                <div style={{ width: '150px' }}>
                  {getInputComponent(key)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Payment Environment */}
      <section>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '2px solid #e5e7eb' }}>
          Payment Environment
        </h2>
        <div style={{
          padding: '1rem',
          background: config['payment_env']?.value === 'live' ? '#fef2f2' : '#f9fafb',
          borderRadius: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: config['payment_env']?.value === 'live' ? '2px solid #ef4444' : '1px solid #e5e7eb'
        }}>
          <div>
            <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Active Environment</p>
            <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
              {config['payment_env']?.value === 'live' && '⚠️ PRODUCTION MODE - All payments are real'}
              {config['payment_env']?.value === 'sandbox' && 'Pre-production environment for testing'}
              {config['payment_env']?.value === 'mock' && 'Testing environment with mock payments'}
            </p>
          </div>
          <div style={{ width: '200px' }}>
            {getInputComponent('payment_env')}
          </div>
        </div>
      </section>

      {/* Payment Warning Modal */}
      {showPaymentWarning && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 50
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '400px'
          }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <AlertCircle size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Switching to Live Payment Mode</h3>
            </div>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              This will enable REAL payment processing. All transactions will be charged to actual customer cards. This cannot be undone without explicit confirmation.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowPaymentWarning(false); loadConfig(); }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateConfig('payment_env', 'live');
                  setShowPaymentWarning(false);
                  setIsDirty(true);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                I Understand - Switch to Live
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
