import React, { useState } from 'react';
import { MessageSquare, Check, X, Clock } from 'lucide-react';
import { StatusPill } from './StatusPill';
import { formatDate } from '../utils/format';
import type { Inquiry } from '../types';

interface InquiryCardProps {
  inquiry: Inquiry;
  view: 'tenant' | 'host';
  onAccept?: (id: string) => Promise<void>;
  onDecline?: (id: string) => Promise<void>;
}

export function InquiryCard({ inquiry, view, onAccept, onDecline }: InquiryCardProps) {
  const [busy, setBusy] = useState(false);

  const handle = async (action: 'accept' | 'decline') => {
    setBusy(true);
    try {
      if (action === 'accept' && onAccept) await onAccept(inquiry.id);
      if (action === 'decline' && onDecline) await onDecline(inquiry.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '1rem',
        display: 'grid',
        gap: '0.6rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={15} style={{ color: 'var(--mid)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', color: 'var(--mid)' }}>
            <Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
            {formatDate(inquiry.created_at)}
          </span>
        </div>
        <StatusPill variant={inquiry.status} size="sm" />
      </div>

      {inquiry.listing && (
        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)' }}>
          {(inquiry.listing as { title?: string }).title ?? 'Listing'}
        </p>
      )}

      {inquiry.message && (
        <p
          style={{
            fontSize: '0.86rem',
            color: 'var(--mid)',
            background: 'var(--cream)',
            borderRadius: 8,
            padding: '0.5rem 0.72rem',
            lineHeight: 1.5,
          }}
        >
          {inquiry.message}
        </p>
      )}

      {/* Host actions */}
      {view === 'host' && inquiry.status === 'pending' && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
          <button
            disabled={busy}
            onClick={() => handle('accept')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.5rem',
              background: 'var(--jade-muted)',
              color: 'var(--jade)',
              border: '1px solid rgba(26,107,74,0.25)',
              borderRadius: 9,
              cursor: busy ? 'not-allowed' : 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Check size={13} /> Accept
          </button>
          <button
            disabled={busy}
            onClick={() => handle('decline')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              padding: '0.5rem',
              background: 'var(--red-light)',
              color: 'var(--red)',
              border: '1px solid rgba(192,57,43,0.2)',
              borderRadius: 9,
              cursor: busy ? 'not-allowed' : 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              opacity: busy ? 0.6 : 1,
            }}
          >
            <X size={13} /> Decline
          </button>
        </div>
      )}
    </div>
  );
}
