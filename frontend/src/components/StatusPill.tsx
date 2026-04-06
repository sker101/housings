import React from 'react';

type StatusVariant =
  | 'active'
  | 'vacant'
  | 'pending'
  | 'booked'
  | 'accepted'
  | 'declined'
  | 'paid'
  | 'overdue'
  | 'suspended'
  | 'cancelled'
  | 'past_due'
  | 'failed'
  | 'refunded'
  | 'paused'
  | 'removed'
  | 'verified'
  | 'unverified';

const VARIANT_STYLES: Record<StatusVariant, { bg: string; color: string; label: string }> = {
  active:     { bg: 'var(--jade-muted)',   color: 'var(--jade)',  label: 'Active' },
  vacant:     { bg: '#e8eff8',             color: 'var(--blue)',  label: 'Vacant' },
  pending:    { bg: 'var(--amber-light)',  color: '#6b3a0a',      label: 'Pending' },
  booked:     { bg: '#e8f3ee',            color: '#0f5132',      label: 'Booked' },
  accepted:   { bg: 'var(--jade-muted)',   color: 'var(--jade)',  label: 'Accepted' },
  declined:   { bg: 'var(--red-light)',    color: 'var(--red)',   label: 'Declined' },
  paid:       { bg: 'var(--jade-muted)',   color: 'var(--jade)',  label: 'Paid' },
  overdue:    { bg: 'var(--red-light)',    color: 'var(--red)',   label: 'Overdue' },
  suspended:  { bg: 'var(--red-light)',    color: 'var(--red)',   label: 'Suspended' },
  cancelled:  { bg: '#f3f4f6',            color: '#4b5563',      label: 'Cancelled' },
  past_due:   { bg: 'var(--amber-light)', color: '#6b3a0a',      label: 'Past Due' },
  failed:     { bg: 'var(--red-light)',   color: 'var(--red)',   label: 'Failed' },
  refunded:   { bg: '#e8eff8',            color: 'var(--blue)',  label: 'Refunded' },
  paused:     { bg: '#f3f4f6',            color: '#4b5563',      label: 'Paused' },
  removed:    { bg: 'var(--red-light)',   color: 'var(--red)',   label: 'Removed' },
  verified:   { bg: 'var(--jade-muted)',  color: 'var(--jade)',  label: 'Verified' },
  unverified: { bg: 'var(--amber-light)', color: '#6b3a0a',     label: 'Unverified' },
};

interface StatusPillProps {
  variant: StatusVariant | string;
  label?: string;
  size?: 'sm' | 'md';
}

export function StatusPill({ variant, label, size = 'md' }: StatusPillProps) {
  const style = VARIANT_STYLES[variant as StatusVariant] ?? {
    bg: '#f3f4f6',
    color: '#4b5563',
    label: variant,
  };

  const displayLabel = label ?? style.label;

  return (
    <span
      style={{
        display: 'inline-block',
        background: style.bg,
        color: style.color,
        borderRadius: 'var(--radius-pill)',
        padding: size === 'sm' ? '0.15rem 0.5rem' : '0.25rem 0.65rem',
        fontSize: size === 'sm' ? '0.69rem' : '0.76rem',
        fontWeight: 700,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {displayLabel}
    </span>
  );
}
