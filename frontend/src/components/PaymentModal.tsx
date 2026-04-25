import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPaymentProvider } from '../lib/payments/factory';

export interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
    description: string;
    onSuccess: () => void;
    metadata?: Record<string, any>;
}

export default function PaymentModal({ isOpen, onClose, amount, description, onSuccess, metadata = {} }: PaymentModalProps) {
    const { token, user, refreshMe } = useAuth();
    const [step, setStep] = useState<1 | 2>(1);
    const [phone, setPhone] = useState(user?.phone || '');
    const [method, setMethod] = useState<'azampay' | 'selcom'>('azampay');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setProcessing(false);
            setError('');
            if (user?.phone) setPhone(user.phone);
        }
    }, [isOpen, user?.phone]);

    if (!isOpen) return null;

    const handlePay = async () => {
        if (!phone) {
            setError('Please enter your phone number.');
            return;
        }

        setProcessing(true);
        setError('');

        try {
            // Auto-save phone to profile if it was missing
            if (user?.userId) {
                const { updateRows, selectRows, insertRows } = await import('../lib/supabase');
                
                if (!user?.phone && phone) {
                    try {
                        await updateRows('profiles', { phone }, {
                            filters: [{ column: 'id', op: 'eq', value: user?.userId || '' }],
                            accessToken: token || ''
                        });
                        console.log('[Modal] Phone number saved to profile:', phone);
                        refreshMe().catch(err => console.warn('[Modal] refreshMe failed:', err));
                    } catch (saveErr) {
                        console.warn('[Modal] Failed to save phone to profile:', saveErr);
                    }
                }

                // 1. Resolve Role-based IDs
                // 1.1 ENSURE PROFILE EXISTS (Self-healing)
                let profileRows = await selectRows('profiles', {
                    select: 'id',
                    filters: [{ column: 'id', op: 'eq', value: user.userId }],
                    limit: 1,
                    accessToken: token || ''
                });

                if (!profileRows || profileRows.length === 0) {
                    console.log('[Modal] Profile missing, creating self-healing profile for:', user.userId);
                    await insertRows('profiles', {
                        id: user.userId,
                        full_name: user.fullName || 'New User',
                        role: user.role || 'tenant',
                        roles: user.roles || ['tenant'],
                        phone: user.phone || phone,
                        verification_status: 'pending'
                    }, { accessToken: token || '' });
                }

                // 1.2 Get or create tenant record
                let tenantRows = await selectRows('tenants', {
                    select: 'id',
                    filters: [{ column: 'profile_id', op: 'eq', value: user.userId }],
                    limit: 1,
                    accessToken: token || ''
                });
                
                let realTenantId = tenantRows?.[0]?.id;
                
                if (!realTenantId) {
                    const newTenant = await insertRows('tenants', { 
                      profile_id: user.userId, 
                      tenant_type: 'student'
                    }, { accessToken: token || '' });
                    realTenantId = newTenant?.[0]?.id;
                }

                if (!realTenantId) {
                    throw new Error('Unable to prepare payment profile. Please try again.');
                }
            }

            const reference = `PAY-${Date.now()}-${user?.userId?.substring(0, 5) || 'GUEST'}`;
            const provider = getPaymentProvider(token || '', method);
            
            const response = await provider.initiatePayment({
                amount,
                reference,
                customerName: user?.fullName || 'iRent User',
                customerEmail: user?.email,
                customerPhone: phone,
                metadata: {
                    ...metadata,
                    description,
                    type: 'modal_payment'
                }
            });

            if (response.success) {
                if (response.checkoutUrl) {
                    window.location.href = response.checkoutUrl;
                } else {
                    onSuccess();
                    onClose();
                }
            } else {
                setError(response.error || 'Payment failed to initiate.');
            }
        } catch (err: any) {
            setError(err.message || 'Unable to start payment. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ background: '#fff', padding: '1.5rem', width: '100%', maxWidth: 420, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#666' }}>&times;</button>
                
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    {[1, 2].map((s) => (
                        <div key={s} style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: s <= step ? '#1D9E75' : '#e5e7eb'
                        }} />
                    ))}
                </div>

                {error && (
                    <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, fontSize: '0.85rem', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Confirm payment</h2>
                            <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.9rem' }}>{description}</p>
                        </div>
                        <div style={{ padding: '1rem', background: '#f8faf9', borderRadius: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem' }}>Amount due</p>
                            <p style={{ margin: '0.2rem 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#1a5c3a' }}>
                                TZS {amount.toLocaleString()}
                            </p>
                        </div>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>
                            You will be redirected to the payment gateway to complete your transaction.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{ background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.75rem 1rem', cursor: 'pointer', flex: 1, fontWeight: 600 }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem 1rem', fontWeight: 700, cursor: 'pointer', flex: 1 }}
                            >
                                Continue
                            </button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Payment method</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setMethod('azampay')}
                                style={{
                                    padding: '0.75rem', borderRadius: 8, cursor: 'pointer',
                                    border: `2px solid ${method === 'azampay' ? '#1D9E75' : '#e5e7eb'}`,
                                    background: method === 'azampay' ? '#f0fdf4' : '#fff',
                                    fontWeight: 600, color: method === 'azampay' ? '#166534' : '#666'
                                }}
                            >
                                AzamPay
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('selcom')}
                                style={{
                                    padding: '0.75rem', borderRadius: 8, cursor: 'pointer',
                                    border: `2px solid ${method === 'selcom' ? '#1D9E75' : '#e5e7eb'}`,
                                    background: method === 'selcom' ? '#f0fdf4' : '#fff',
                                    fontWeight: 600, color: method === 'selcom' ? '#166534' : '#666'
                                }}
                            >
                                Selcom
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#444' }}>Phone number (for mobile money)</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="e.g. 0712345678"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.95rem' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                style={{ background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.75rem 1rem', cursor: 'pointer', flex: 1, fontWeight: 600 }}
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                disabled={processing}
                                onClick={handlePay}
                                style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem 1rem', fontWeight: 700, cursor: 'pointer', flex: 1, opacity: processing ? 0.7 : 1 }}
                            >
                                {processing ? 'Processing...' : 'Pay now'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
