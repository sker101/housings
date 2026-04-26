import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Share, PlusSquare, MoreVertical, LayoutGrid } from 'lucide-react';

export default function SmartInstallBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    // 1. Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    
    if (isStandalone) return;

    // 2. Check dismissal
    const lastDismissed = localStorage.getItem('pwa_banner_dismissed');
    if (lastDismissed) {
      const daysSince = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }

    const ua = window.navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    
    if (isIOS) setPlatform('ios');
    else if (isAndroid) setPlatform('android');
    else return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setIsVisible(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (isIOS) {
      setTimeout(() => setIsVisible(true), 4000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setShowInstructions(false);
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    if (platform === 'android' && deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      } else {
        // If they decline the native prompt, show our nice styled instructions as backup
        setShowInstructions(true);
      }
    } else {
      setShowInstructions(true);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      <style>{`
        @keyframes bannerSlideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* THE BANNER */}
      {!showInstructions && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '12px', right: '12px',
          background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)',
          borderRadius: '20px', padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: '12px', zIndex: 9999,
          border: '1px solid rgba(255,255,255,0.3)', animation: 'bannerSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{
            width: '42px', height: '42px', background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', flexShrink: 0, boxShadow: '0 4px 10px rgba(22,163,74,0.3)'
          }}>
            <Smartphone size={24} strokeWidth={2.5} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Install iRent</h4>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Fast access & offline support</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={handleInstall} style={{
              background: '#16a34a', color: 'white', border: 'none', borderRadius: '10px',
              padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              {platform === 'ios' ? <PlusSquare size={16} /> : <Download size={16} />}
              {platform === 'ios' ? 'Add' : 'Install'}
            </button>
            <button onClick={handleDismiss} style={{
              background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'
            }}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* THE EYE-CATCHING INSTRUCTION POPUP */}
      {showInstructions && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', animation: 'overlayFadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'white', borderRadius: '24px', width: '100%', maxWidth: '340px',
            padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            animation: 'modalFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative', overflow: 'hidden'
          }}>
            {/* Header Decor */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '6px',
              background: 'linear-gradient(90deg, #22c55e, #16a34a)'
            }} />

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '56px', height: '56px', background: '#f0fdf4', borderRadius: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#16a34a', margin: '0 auto 12px'
              }}>
                <Smartphone size={32} />
              </div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Install iRent</h3>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                {platform === 'ios' ? 'Follow these simple steps for iPhone:' : 'Follow these simple steps for Android:'}
              </p>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Step 1 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%', background: '#16a34a',
                  color: 'white', fontSize: '12px', fontWeight: 700, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>1</div>
                <div>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                    {platform === 'ios' ? (
                      <>Tap the <span style={{ color: '#3b82f6', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}><Share size={18} style={{ margin: '0 4px' }} /> Share</span> button</>
                    ) : (
                      <>Tap the <span style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}><MoreVertical size={18} style={{ margin: '0 4px' }} /> Menu</span> icon</>
                    )}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                    {platform === 'ios' ? 'at the bottom of Safari' : 'at the top right of Chrome'}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%', background: '#16a34a',
                  color: 'white', fontSize: '12px', fontWeight: 700, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>2</div>
                <div>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                    {platform === 'ios' ? (
                      <>Select <span style={{ fontWeight: 800 }}>"Add to Home Screen"</span></>
                    ) : (
                      <>Select <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}><Download size={18} style={{ margin: '0 4px' }} /> Install App</span></>
                    )}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                    {platform === 'ios' ? 'scroll down to find it' : 'or "Add to Home screen"'}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              style={{
                width: '100%', marginTop: '24px', padding: '14px',
                background: '#16a34a', border: 'none', borderRadius: '14px',
                fontSize: '15px', fontWeight: 700, color: 'white', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(22,163,74,0.2)'
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
