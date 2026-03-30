import React, { useEffect, useState } from 'react';

export interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
    description: string;
    onSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, amount, description, onSuccess }: PaymentModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [phone, setPhone] = useState('');
    const [method, setMethod] = useState<'mpesa' | 'tigo' | 'airtel'>('mpesa');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setProcessing(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ background: '#fff', padding: '1.5rem', width: '100%', maxWidth: 420, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    {[1, 2].map((s) => (
                        <div key={s} style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: s <= step ? '#1D9E75' : '#e5e7eb'
                        }} />
                    ))}
                </div>

                {step === 1 && (
                    <>
                        <div>
                            <h2 style={{ margin: 0 }}>Confirm your booking</h2>
                            <p style={{ margin: '0.25rem 0 0', color: 'var(--mid)' }}>{description}</p>
                        </div>
                        <div style={{ padding: '1rem', background: '#f8faf9', borderRadius: 10, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>Amount due</p>
                            <p style={{ margin: '0.2rem 0 0', fontSize: '1.8rem', fontWeight: 800, color: '#1a5c3a' }}>
                                TZS {amount.toLocaleString()}
                            </p>
                        </div>
                        <p style={{ margin: 0, color: 'var(--mid)', fontSize: '0.9rem' }}>
                            You will receive a mobile money push prompt after clicking Pay.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem 1rem', cursor: 'pointer', flex: 1 }}
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
                            <h2 style={{ margin: 0 }}>Choose payment method</h2>
                        </div>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: '0.6rem',
                                padding: '0.65rem', borderRadius: 8, cursor: 'pointer',
                                border: `1px solid ${method === 'mpesa' ? '#1D9E75' : '#e5e7eb'}`
                            }}>
                                <input type="radio" name="payment-method" value="mpesa" checked={method === 'mpesa'} onChange={() => setMethod('mpesa')} style={{ accentColor: '#1D9E75' }} />
                                M-Pesa
                            </label>
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: '0.6rem',
                                padding: '0.65rem', borderRadius: 8, cursor: 'pointer',
                                border: `1px solid ${method === 'tigo' ? '#1D9E75' : '#e5e7eb'}`
                            }}>
                                <input type="radio" name="payment-method" value="tigo" checked={method === 'tigo'} onChange={() => setMethod('tigo')} style={{ accentColor: '#1D9E75' }} />
                                Tigo Pesa
                            </label>
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: '0.6rem',
                                padding: '0.65rem', borderRadius: 8, cursor: 'pointer',
                                border: `1px solid ${method === 'airtel' ? '#1D9E75' : '#e5e7eb'}`
                            }}>
                                <input type="radio" name="payment-method" value="airtel" checked={method === 'airtel'} onChange={() => setMethod('airtel')} style={{ accentColor: '#1D9E75' }} />
                                Airtel Money
                            </label>
                        </div>

                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g. 0712 345 678"
                            style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.95rem' }}
                        />

                        <div style={{ textAlign: 'center', background: '#E8F6EF', borderRadius: 10, padding: '0.85rem' }}>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: '#0F6E56' }}>Total amount</p>
                            <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#085041' }}>TZS {amount.toLocaleString()}</p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem 1rem', cursor: 'pointer', flex: 1 }}
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                disabled={processing}
                                onClick={() => {
                                    setProcessing(true);
                                    setTimeout(() => {
                                        onSuccess();
                                        onClose();
                                        setProcessing(false);
                                    }, 1500);
                                }}
                                style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem 1rem', fontWeight: 700, cursor: 'pointer', flex: 1 }}
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
