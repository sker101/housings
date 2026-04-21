import React from 'react';
import type { Role } from '../types';

const ROLE_STYLES: Record<Role, { bg: string; color: string; label: string }> = {
  tenant:           { bg: '#dcfce7',          color: '#15803d',      label: 'Tenant' },
  landlord:         { bg: 'var(--jade-muted)', color: 'var(--jade)', label: 'Landlord' },
  property_manager: { bg: '#f3e8ff',          color: '#7c3aed',      label: 'Property Manager' },
  admin:            { bg: 'var(--red-light)', color: 'var(--red)',   label: 'Admin' },
};

interface RoleBadgeProps {
  role: Role | string;
  size?: 'sm' | 'md';
}

export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const normalizedRole = (() => {
    const r = String(role).toLowerCase();
    if (r === 'landlord' || r === 'lister') return 'landlord';
    if (r === 'property_manager' || r === 'manager' || r === 'dalali') return 'property_manager';
    if (r === 'admin') return 'admin';
    return 'tenant';
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
