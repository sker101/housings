/**
 * ExitListingModal.tsx
 * iRent — "Moving soon? List your room." feature.
 *
 * Shown on MyRoomPage for active tenants.
 * - Tenant picks their move-out date (min: today + 7 days)
 * - Calls flip_room_to_listed_occupied() DB function
 * - Room status flips to listed_occupied → visible on map with "Coming Soon" badge
 * - If a new tenant pre-books, the outgoing tenant earns 20,000 TZS referral
 */

import { useState } from 'react';
import { Calendar, ArrowRight, Gift, X } from 'lucide-react';

interface ExitListingModalProps {
  leaseId: string;
  roomTitle: string;
  currentEndDate?: string;
  accessToken: string;
  onSuccess: (newEndDate: string) => void;
  onClose: () => void;
}

const MIN_DAYS_AHEAD = 7;

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function ExitListingModal({
  leaseId,
  roomTitle,
  accessToken,
  onSuccess,
  onClose,
}: ExitListingModalProps) {
  const [moveOutDate, setMoveOutDate] = useState(addDays(new Date(), 30));
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  const minDate = addDays(new Date(), MIN_DAYS_AHEAD);

  async function handleSubmit() {
    setError('');
    if (!moveOutDate || moveOutDate < minDate) {
      setError(`Move-out date must be at least ${MIN_DAYS_AHEAD} days from today.`);
      return;
    }

    setSubmitting(true);
    try {
      // Call the DB function via Supabase REST RPC
      const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON    = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/flip_room_to_listed_occupied`, {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_ANON,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          p_lease_id:      leaseId,
          p_move_out_date: moveOutDate,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message || 'Failed to submit move-out date.');
      }

      onSuccess(moveOutDate);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', width: '100%', maxWidth: '460px',
        padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        position: 'relative',
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#64748b', padding: '4px',
        }}>
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'linear-gradient(135deg,#22c55e,#16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Calendar size={22} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
              Moving soon?
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              {roomTitle}
            </p>
          </div>
        </div>

        {/* Referral Incentive Banner */}
        <div style={{
          background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
          border: '1px solid #bbf7d0',
          borderRadius: '12px', padding: '1rem 1.25rem',
          display: 'flex', gap: '0.75rem',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
        }}>
          <Gift size={20} color="#16a34a" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#15803d' }}>
              Earn 20,000 TZS referral reward!
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#166534' }}>
              When a new tenant pre-books your room, we credit 20,000 TZS to your iRent wallet — automatically.
            </p>
          </div>
        </div>

        {/* Date Picker */}
        <label style={{ display: 'block', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
            Select your move-out date
          </span>
          <input
            type="date"
            value={moveOutDate}
            min={minDate}
            onChange={e => setMoveOutDate(e.target.value)}
            style={{
              width: '100%', padding: '0.75rem 1rem',
              border: '1.5px solid #e2e8f0', borderRadius: '10px',
              fontSize: '1rem', color: '#1e293b',
              outline: 'none', boxSizing: 'border-box',
              fontFamily: "'Inter', sans-serif",
            }}
          />
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4, display: 'block' }}>
            Minimum {MIN_DAYS_AHEAD} days from today
          </span>
        </label>

        {/* What happens next */}
        <div style={{
          background: '#f8fafc', borderRadius: '10px',
          padding: '1rem', marginBottom: '1.5rem',
        }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
            What happens next:
          </p>
          {[
            'Your room appears in search with a "Coming Soon" badge',
            'Interested tenants can pre-book starting now',
            'If a pre-booker pays, you earn 20,000 TZS',
            'Your lease end date updates to your chosen date',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: 4 }}>
              <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                {i + 1}.
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{step}</span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '8px', padding: '0.75rem 1rem',
            color: '#dc2626', fontSize: '0.85rem',
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '0.85rem', border: '1.5px solid #e2e8f0',
            borderRadius: '10px', background: 'transparent', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600, color: '#64748b',
            fontFamily: "'Inter', sans-serif",
          }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 2, padding: '0.85rem',
              borderRadius: '10px', border: 'none',
              background: submitting
                ? '#94a3b8'
                : 'linear-gradient(135deg,#22c55e,#16a34a)',
              color: 'white', cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem', fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '0.5rem',
              transition: 'all 0.2s ease',
            }}
          >
            {submitting ? 'Submitting…' : (
              <>List my room <ArrowRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
