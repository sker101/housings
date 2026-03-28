import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { selectRows } from '../lib/supabase';
import PaymentModal from '../components/PaymentModal';

type Tier = 'free' | 'verified' | 'premium';

export default function LandlordUpgradePage() {
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
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} .up-page{padding:2rem} .up-hdr{text-align:center;margin-bottom:2rem} .plans-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px} .plan-card{background:#ffffff;border:0.5px solid var(--border);border-radius:20px;padding:24px 20px;display:flex;flex-direction:column;gap:16px;position:relative} .plan-card.rec{border:2px solid var(--jade)} .rec-badge{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:var(--jade);color:#fff;font-size:10px;font-weight:700;padding:3px 14px;border-radius:20px;white-space:nowrap} .plan-name{font-size:18px;font-weight:700;color:var(--ink)} .plan-name.jade{color:var(--jade)} .curr-tag{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;background:#EAF3DE;color:#27500A;margin-top:4px} .plan-price{font-size:26px;font-weight:800;color:var(--ink);line-height:1} .plan-price-sub{font-size:13px;font-weight:400;color:var(--mid)} .feat-list{display:flex;flex-direction:column;gap:9px;flex:1} .feat-item{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--ink)} .feat-check{width:16px;height:16px;border-radius:50%;background:#EAF3DE;color:#27500A;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0;margin-top:1px} .feat-check.off{background:var(--cream);color:var(--mid)} .feat-item.off{opacity:0.4} .plan-btn{padding:10px;border-radius:10px;border:0.5px solid var(--border);background:#ffffff;font-size:13px;font-weight:600;cursor:pointer;color:var(--ink);width:100%;transition:background 0.15s} .plan-btn:hover{background:var(--cream)} .plan-btn.primary{background:var(--jade);color:#ffffff;border-color:transparent} .plan-btn.current{background:var(--cream);color:var(--mid);cursor:default} @media(max-width:768px){.plans-grid{grid-template-columns:1fr}.up-page{padding:1rem}}`}</style>

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
