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

  const msg = String((error as { message?: string })?.message ?? error).toLowerCase();

  if (msg.includes('23505')) return 'This record already exists.';
  if (msg.includes('42501')) return "You don't have permission to do that.";
  if (msg.includes('jwt expired') || msg.includes('invalid jwt') || msg.includes('expired'))
    return 'Your session has expired. Please log in again.';
  if (msg.includes('invalid login credentials') || msg.includes('invalid email or password'))
    return 'Incorrect email or password.';
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('connection'))
    return 'Connection failed — check your internet.';
  if (msg.includes('email not confirmed'))
    return 'Please confirm your email address before logging in.';

  // Fallback — never show raw DB strings
  return 'Something went wrong. Please try again.';
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
