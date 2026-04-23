import { useState } from 'react';
import { X, Smartphone, Share, Download, Plus } from 'lucide-react';

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  isAndroid: boolean;
}

export default function InstallPwaModal({ isOpen, onClose, onInstall, isAndroid: initialIsAndroid }: InstallPwaModalProps) {
  const [platform, setPlatform] = useState<'ios' | 'android'>(initialIsAndroid ? 'android' : 'ios');

  if (!isOpen) return null;

  const iosSteps = [
    { num: '1', title: 'Open in Safari', desc: 'Make sure you are using Safari browser on your iPhone or iPad.', icon: <Smartphone size={20} /> },
    { num: '2', title: 'Tap the Share button', desc: 'Tap the share icon (square with arrow) at the bottom of the screen.', icon: <Share size={20} /> },
    { num: '3', title: 'Select "Add to Home Screen"', desc: 'Scroll down in the share menu and tap "Add to Home Screen".', icon: <Plus size={20} /> },
    { num: '4', title: 'Tap "Add"', desc: 'Confirm by tapping "Add" in the top right corner. Done!', icon: <Download size={20} /> },
  ];

  const androidSteps = [
    { num: '1', title: 'Open in Chrome', desc: 'Make sure you are using Chrome browser on your phone.', icon: <Smartphone size={20} /> },
    { num: '2', title: 'Tap the menu (⋮)', desc: 'Tap the three dots in the top right corner of Chrome.', icon: <Smartphone size={20} /> },
    { num: '3', title: 'Tap "Install app"', desc: 'Select "Install app" or "Add to Home screen" from the menu.', icon: <Download size={20} /> },
    { num: '4', title: 'Confirm Install', desc: 'Tap "Install" on the popup. The app will appear on your home screen!', icon: <Plus size={20} /> },
  ];

  const steps = platform === 'ios' ? iosSteps : androidSteps;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out',
        padding: '0',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      <div style={{
        background: '#fff', borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: '480px', maxHeight: '90vh',
        overflowY: 'auto', animation: 'slideUp 0.3s ease-out',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          position: 'relative', padding: '1.5rem',
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          borderRadius: '24px 24px 0 0', color: '#fff',
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'rgba(255,255,255,0.2)', border: 'none',
            borderRadius: '50%', width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff',
          }}>
            <X size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <img src="/icon-192.png" alt="iRent" style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>Install iRent</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.85, fontFamily: "'Inter', sans-serif" }}>Get the app on your device</p>
            </div>
          </div>
        </div>

        {/* Platform Toggle */}
        <div style={{ padding: '1rem 1.5rem 0' }}>
          <div style={{
            display: 'flex', background: '#f3f4f6', borderRadius: '12px', padding: '4px',
          }}>
            <button onClick={() => setPlatform('ios')} style={{
              flex: 1, padding: '0.6rem', borderRadius: '10px', border: 'none',
              background: platform === 'ios' ? '#fff' : 'transparent',
              boxShadow: platform === 'ios' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              color: platform === 'ios' ? '#22c55e' : '#9ca3af',
              fontFamily: "'Inter', sans-serif", transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}>
              <Smartphone size={15} /> iPhone / iPad
            </button>
            <button onClick={() => setPlatform('android')} style={{
              flex: 1, padding: '0.6rem', borderRadius: '10px', border: 'none',
              background: platform === 'android' ? '#fff' : 'transparent',
              boxShadow: platform === 'android' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              color: platform === 'android' ? '#22c55e' : '#9ca3af',
              fontFamily: "'Inter', sans-serif", transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}>
              <Smartphone size={15} /> Android
            </button>
          </div>
        </div>

        {/* Steps */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          {steps.map((step, idx) => (
            <div key={idx} style={{
              display: 'flex', gap: '1rem', marginBottom: idx < steps.length - 1 ? '1.25rem' : '0',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
                fontFamily: "'Inter', sans-serif",
              }}>
                {step.num}
              </div>
              <div style={{ flex: 1, borderBottom: idx < steps.length - 1 ? '1px solid #f3f4f6' : 'none', paddingBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#111', fontFamily: "'Inter', sans-serif" }}>{step.title}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          {platform === 'android' && (
            <button onClick={() => { onInstall(); onClose(); }} style={{
              width: '100%', padding: '0.9rem', borderRadius: '14px', border: 'none',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff', fontWeight: 700, fontSize: '0.95rem',
              cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(34,197,94,0.3)', marginBottom: '0.75rem',
            }}>
              <Download size={18} /> Install Now
            </button>
          )}

          {platform === 'ios' && (
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px',
              padding: '0.85rem', display: 'flex', gap: '0.6rem', marginBottom: '0.75rem',
            }}>
              <Smartphone size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#92400e', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
                <strong>Note:</strong> Apple requires you to use Safari. Open this website in Safari, then follow the steps above.
              </p>
            </div>
          )}

          <button onClick={onClose} style={{
            width: '100%', padding: '0.75rem', borderRadius: '14px',
            border: 'none', background: '#f3f4f6', color: '#9ca3af',
            fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
