import React, { useState } from 'react';

export interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
    description: string;
    onSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, amount, description, onSuccess }: PaymentModalProps) {
    const [processing, setProcessing] = useState(false);

    if (!isOpen) return null;

    const handlePay = () => {
        setProcessing(true);
        setTimeout(() => {
            onSuccess();
            setProcessing(false);
            onClose();
        }, 1000); // simulate network delay
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card" style={{ background: 'white', padding: '2rem', width: '100%', maxWidth: '420px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                <h2 style={{ marginBottom: '0.5rem' }}>Complete Payment</h2>
                <p className="muted" style={{ marginBottom: '1.5rem', lineHeight: 1.4 }}>{description}</p>

                <div style={{ padding: '1.5rem', background: '#f8faf9', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.25rem' }}>Amount Due</p>
                    <p style={{ fontSize: '2rem', fontWeight: 800, color: '#1a5c3a' }}>
                        TZS {amount.toLocaleString()}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={onClose} disabled={processing}>
                        Cancel
                    </button>
                    <button type="button" className="btn" style={{ flex: 1 }} onClick={handlePay} disabled={processing}>
                        {processing ? 'Processing...' : 'Pay via Mobile Money'}
                    </button>
                </div>
            </div>
        </div>
    );
}
