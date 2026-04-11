// ─────────────────────────────────────────────────────────────
// CampusStay TZ — Formatting Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Format a number as Tanzanian Shillings.
 * e.g. TZSFormat(120000) → "TZS 120,000"
 */
export function TZSFormat(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return 'TZS 0';
  return `TZS ${n.toLocaleString('en-TZ', { maximumFractionDigits: 0 })}`;
}

/**
 * Format an ISO date string to a readable date.
 * e.g. formatDate("2026-04-06T12:00:00Z") → "6 Apr 2026"
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Format an ISO date as "Renews DD MMM YYYY" (for subscriptions).
 */
export function formatRenewal(iso: string | null | undefined): string {
  if (!iso) return 'No renewal date';
  return `Renews ${formatDate(iso)}`;
}

/**
 * Get initials from a full name.
 * e.g. initials("Amina Juma") → "AJ"
 */
export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/**
 * Map common Supabase / Postgres error codes to user-friendly messages.
 */
export function friendlyError(error: unknown): string {
  if (!error) return 'Something went wrong.';

  let msg = '';
  if (typeof error === 'string') {
    msg = error;
  } else if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    msg = String(e.message || e.msg || e.error_description || e.error || JSON.stringify(e));
  } else {
    msg = String(error);
  }

  const lowMsg = msg.toLowerCase();

  if (lowMsg.includes('23505') || lowMsg.includes('already registered') || lowMsg.includes('already exists')) 
    return 'This email or account already exists. Try logging in instead.';
  
  if (lowMsg.includes('42501')) return "You don't have permission to do that.";
  if (lowMsg.includes('jwt expired') || lowMsg.includes('invalid jwt') || lowMsg.includes('expired'))
    return 'Your session has expired. Please log in again.';
  if (lowMsg.includes('invalid login credentials') || lowMsg.includes('invalid email or password'))
    return 'Incorrect email or password.';
  if (lowMsg.includes('network') || lowMsg.includes('failed to fetch') || lowMsg.includes('connection'))
    return 'Connection failed — check your internet.';
  if (lowMsg.includes('email not confirmed'))
    return 'Please confirm your email address before logging in.';

  // Fallback
  // TRICK: If it's a database registration error, don't truncate, so we can see the internal debug info
  if (lowMsg.includes('database error saving new user')) {
    return msg;
  }

  return 'Something went wrong. ' + (msg.length > 100 ? msg.substring(0, 100) + '...' : msg);
}

/**
 * Calculate profile completion percentage.
 * Fields: full_name, phone, occupation, id_document_url
 */
export interface CompletionField {
  key: string;
  label: string;
  done: boolean;
}

export function profileCompletion(profile: Record<string, unknown> | null): {
  percent: number;
  fields: CompletionField[];
} {
  const fields: CompletionField[] = [
    { key: 'full_name', label: 'Full name', done: Boolean(profile?.full_name) },
    { key: 'phone', label: 'Phone number', done: Boolean(profile?.phone) },
    { key: 'occupation', label: 'Occupation', done: Boolean(profile?.occupation) },
    { key: 'id_document_url', label: 'ID document', done: Boolean(profile?.id_document_url) },
  ];
  const done = fields.filter((f) => f.done).length;
  return { percent: Math.round((done / fields.length) * 100), fields };
}
