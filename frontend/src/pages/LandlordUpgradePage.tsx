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
        return () => { mounted = false; };
    }, [user?.userId, token]);

    const handleUpgradeClick = (tier: Tier, amount: number) => {
        setSelectedTier(tier);
        setSelectedAmount(amount);
        setModalOpen(true);
    };

    const handlePaymentSuccess = () => {
        if (!selectedTier) return;
        // In a real implementation this would trigger an updateRows call to profiles
        // We'll just update the local state to simulate success
        setCurrentPlan(selectedTier);
        alert(`Successfully upgraded to ${selectedTier.toUpperCase()} plan!`);
    };

    if (loading) return <div className="container section"><p>Loading...</p></div>;

    const plans = [
        {
            id: 'free',
            name: 'Free',
            price: 0,
            features: [
                'Up to 3 listings',
                'Basic visibility',
                'No featured boosts',
                'Standard support'
            ]
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
        <div className="container section">
            <div className="section__header">
                <div>
                    <h1>Upgrade Plan</h1>
                    <p>Grow your property business with a verified or premium plan.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                {plans.map(plan => {
                    const isCurrent = currentPlan === plan.id;
                    return (
                        <div key={plan.id} className="card" style={{
                            border: plan.recommended ? '2px solid var(--jade)' : '1px solid var(--border)',
                            position: 'relative',
                            display: 'flex', flexDirection: 'column'
                        }}>
                            {plan.recommended && (
                                <span style={{
                                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                                    background: 'var(--jade)', color: 'white', padding: '0.2rem 1rem', borderRadius: '12px',
                                    fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase'
                                }}>Most Popular</span>
                            )}
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{plan.name}</h2>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <span style={{ fontSize: '2rem', fontWeight: 800 }}>TZS {new Intl.NumberFormat('en-TZ').format(plan.price)}</span>
                                <span className="muted"> / month</span>
                            </div>

                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', flex: 1 }}>
                                {plan.features.map((feature, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <span style={{ color: 'var(--jade)', fontWeight: 'bold' }}>✓</span> {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                className={`btn ${!isCurrent && !plan.recommended ? 'btn--ghost' : ''}`}
                                disabled={isCurrent}
                                onClick={() => handleUpgradeClick(plan.id as Tier, plan.price)}
                                style={{ width: '100%', marginTop: 'auto' }}
                            >
                                {isCurrent ? 'Current Plan' : 'Upgrade'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {selectedTier && (
                <PaymentModal
                    isOpen={modalOpen}
                    amount={selectedAmount}
                    description={`Subscription Upgrade: ${selectedTier.toUpperCase()} Plan (Monthly)`}
                    onClose={() => { setModalOpen(false); setSelectedTier(null); }}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
}
