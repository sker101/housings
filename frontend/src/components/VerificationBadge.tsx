import React from 'react';
import { ShieldCheck, CheckCircle, Award } from 'lucide-react';

export function VerificationBadge({ type }: { type: 'identity_verified' | 'property_verified' | 'trusted_host' }) {
  switch (type) {
    case 'identity_verified':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200" title="Identity Verified">
          <ShieldCheck className="w-3 h-3" /> Identity Verified
        </span>
      );
    case 'property_verified':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200" title="Ownership Verified">
          <CheckCircle className="w-3 h-3" /> Ownership Verified
        </span>
      );
    case 'trusted_host':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200" title="Trusted Host">
          <Award className="w-3 h-3" /> Trusted Host
        </span>
      );
    default:
      return null;
  }
}
