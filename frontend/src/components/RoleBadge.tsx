import React from 'react';
import type { Role } from '../types';

const ROLE_STYLES: Record<Role, { bg: string; color: string; label: string }> = {
  student:  { bg: '#e8eff8',          color: 'var(--blue)',   label: 'Student' },
  landlord: { bg: 'var(--jade-muted)', color: 'var(--jade)', label: 'Landlord' },
  dalali:   { bg: '#f3e8ff',          color: '#7c3aed',       label: 'Dalali' },
  admin:    { bg: 'var(--red-light)', color: 'var(--red)',    label: 'Admin' },
};

interface RoleBadgeProps {
  role: Role | string;
  size?: 'sm' | 'md';
}

export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const normalizedRole = (() => {
    const r = String(role).toLowerCase();
    if (r === 'lister' || r === 'landlord') return 'landlord';
    if (r === 'dalali') return 'dalali';
    if (r === 'admin') return 'admin';
    return 'student';
  })() as Role;

  const style = ROLE_STYLES[normalizedRole];

  return (
    <span
      style={{
        display: 'inline-block',
        background: style.bg,
        color: style.color,
        borderRadius: 'var(--radius-pill)',
        padding: size === 'sm' ? '0.12rem 0.45rem' : '0.2rem 0.58rem',
        fontSize: size === 'sm' ? '0.68rem' : '0.74rem',
        fontWeight: 700,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {style.label}
    </span>
  );
}
