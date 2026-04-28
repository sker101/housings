import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { selectRows } from '../lib/supabase';
import PaymentModal from '../components/PaymentModal';

type Tier = 'free' | 'verified' | 'premium';

export default function LandlordUpgradePage() {
  const navigate = useNavigate();
  const [isDashboardActive, setIsDashboardActive] = useState(false);
  const { user, token } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<Tier>('free');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [selectedAmount, setSelectedAmount] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function fetchPlan() {
      if (!user?.userId || !token) return;
      try {
        const rows = await selectRows('profiles', {
          select: 'subscription_plan',
          filters: [{ column: 'id', op: 'eq', value: user.userId }],
          accessToken: token
        });
        if (mounted && rows.length > 0) {
          setCurrentPlan(rows[0].subscription_plan || 'free');
        }
      } catch (err) {
        console.error('Failed to load plan', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchPlan();
    return () => {
      mounted = false;
    };
  }, [user?.userId, token]);

  const handleUpgradeClick = (tier: Tier, amount: number) => {
    setSelectedTier(tier);
    setSelectedAmount(amount);
    setModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    if (!selectedTier) return;
    setCurrentPlan(selectedTier);
    alert(`Successfully upgraded to ${selectedTier.toUpperCase()} plan!`);
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      features: ['Up to 3 listings', 'Basic visibility', 'No featured boosts', 'Standard support']
    },
    {
      id: 'verified',
      name: 'Verified',
      price: 15000,
      recommended: true,
      features: [
        'Unlimited listings',
        'Instant approval',
        '1 free boost per month',
        'Verified badge on profile',
        'Priority support'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 35000,
      features: [
        'Unlimited listings',
        'Instant approval',
        '5 free boosts per month',
        'Verified badge on profile',
        'Dedicated account manager',
        'Advanced analytics export'
      ]
    }
  ];

  return (
    <>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} .up-page{padding:2rem;animation:fadeUp 0.35s ease} .up-hdr{margin-bottom:2rem} .up-hdr h1{font-size:1.4rem;font-weight:700;margin:0 0 4px} .up-hdr p{font-size:13px;color:var(--mid);margin:0} .plans-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem} .plan-card{background:#fff;border:0.5px solid var(--border);border-radius:16px;padding:1.5rem;position:relative;transition:all 0.2s} .plan-card.rec{border-color:#97C459;box-shadow:0 0 0 1px #97C459} .rec-badge{position:absolute;top:-10px;right:20px;background:#EAF3DE;color:#27500A;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600} .plan-name{font-size:1.1rem;font-weight:700;margin:0 0 0.5rem} .plan-price{font-size:2rem;font-weight:800;margin:0 0 0.25rem} .plan-price span{font-size:14px;font-weight:400;color:var(--mid)} .plan-desc{font-size:13px;color:var(--mid);margin:0 0 1.25rem} .feat-list{display:flex;flex-direction:column;gap:0.6rem;margin-bottom:1.25rem} .feat-item{display:flex;alignItems:center;gap:0.5rem;font-size:13px} .feat-item.off{color:var(--mid);opacity:0.6} .feat-check{width:18px;height:18px;border-radius:50%;display:flex;alignItems:center;justifyContent:center;font-size:12px;font-weight:600} .feat-check:not(.off){background:#EAF3DE;color:#27500A} .feat-check.off{background:#F1EFE8;color:#444441} .up-btn{width:100%;padding:0.75rem 1rem;border-radius:10px;border:none;background:linear-gradient(135deg,#16a34a,#166534);color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s} .up-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(22,163,74,0.3)} .up-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;box-shadow:none}`}</style>

      {/* Breadcrumb Header */}
      <header style={{background:'white',borderRadius:'12px',padding:'1rem 1.25rem',margin:'1rem 1rem 0',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
        <nav style={{display:'flex',alignItems:'center',gap:'0.5rem',fontSize:'0.9rem'}}>
          <Link 
            to="/landlord/dashboard" 
            className={`topbar-action-btn ${isDashboardActive ? 'is-active' : ''}`}
            onClick={() => setIsDashboardActive(true)}
            style={{display:'flex',alignItems:'center',gap:'0.35rem',color:'#64748b',textDecoration:'none',padding:'4px 8px',background:'transparent',border:'none',borderRadius:'8px'}}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
          <ChevronRight size={16} style={{color:'#cbd5e1'}} />
          <span style={{color:'#1e293b',fontWeight:600}}>Upgrade Plan</span>
        </nav>
      </header>

      <div className="up-page">
        <div className="up-hdr">
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Choose your plan</h1>
          <p style={{ fontSize: 13, color: 'var(--mid)', marginTop: 6 }}>
            Grow your property business with Verified or Premium
          </p>
        </div>

        {loading ? (
          <div className="plans-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`plan-skel-${i}`}
                style={{
                  height: 380,
                  borderRadius: 20,
                  background: 'var(--cream)',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}
              />
            ))}
          </div>
        ) : (
          <div className="plans-grid">
            {plans.map((plan) => {
              const isCurrent = currentPlan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`plan-card${plan.recommended ? ' rec' : ''}`}
                >
                  {plan.recommended ? <span className="rec-badge">Most popular</span> : null}

                  <div>
                    <p className={`plan-name${plan.recommended ? ' jade' : ''}`} style={{ margin: 0 }}>
                      {plan.name}
                    </p>
                    {isCurrent ? <span className="curr-tag">Current plan</span> : null}
                  </div>

                  <div>
                    <p className="plan-price" style={{ margin: 0 }}>
                      {plan.price === 0
                        ? 'TZS 0'
                        : `TZS ${new Intl.NumberFormat('sw-TZ').format(plan.price)}`}
                    </p>
                    <span className="plan-price-sub">/ month</span>
                  </div>

                  <div className="feat-list">
                    {plan.features.map((feature, idx) => {
                      const isOff = feature.trim().toLowerCase().startsWith('no ');
                      return (
                        <div key={idx} className={`feat-item${isOff ? ' off' : ''}`}>
                          <div className={`feat-check${isOff ? ' off' : ''}`}>{isOff ? '✗' : '✓'}</div>
                          <span>{feature}</span>
                        </div>
                      );
                    })}
                  </div>

                  {isCurrent ? (
                    <button className="plan-btn current" disabled>
                      Current plan
                    </button>
                  ) : (
                    <button
                      className={`plan-btn${plan.recommended ? ' primary' : ''}`}
                      onClick={() => handleUpgradeClick(plan.id as Tier, plan.price)}
                    >
                      Upgrade to {plan.name}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedTier && (
          <PaymentModal
            isOpen={modalOpen}
            amount={selectedAmount}
            description={`Subscription Upgrade: ${selectedTier.toUpperCase()} Plan (Monthly)`}
            onClose={() => {
              setModalOpen(false);
              setSelectedTier(null);
            }}
            onSuccess={handlePaymentSuccess}
          />
        )}
      </div>
    </>
  );
}
