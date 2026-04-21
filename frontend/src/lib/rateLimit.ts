// ─────────────────────────────────────────────────────────────
// iRent — Client-side Rate Limiter
// Blocks login after 5 failed attempts within 15 minutes.
// ─────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface Tracker {
  count: number;
  firstAttempt: number;
}

const tracker = new Map<string, Tracker>();

export class RateLimitError extends Error {
  constructor() {
    super('Too many attempts. Please try again in 15 minutes.');
    this.name = 'RateLimitError';
  }
}

/**
 * Call before each login attempt.
 * Throws RateLimitError if the threshold is exceeded.
 * @param key – typically the user's email address
 */
export function checkRateLimit(key: string): void {
  const now = Date.now();
  const entry = tracker.get(key);

  if (!entry) return; // First attempt — always allowed

  // Reset window if it's expired
  if (now - entry.firstAttempt > WINDOW_MS) {
    tracker.delete(key);
    return;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    throw new RateLimitError();
  }
}

/**
 * Record a failed login attempt.
 * @param key – typically the user's email address
 */
export function recordFailure(key: string): void {
  const now = Date.now();
  const entry = tracker.get(key);

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    tracker.set(key, { count: 1, firstAttempt: now });
    return;
  }

  tracker.set(key, { ...entry, count: entry.count + 1 });
}

/**
 * Clear the rate limit tracker for a key (on successful login).
 * @param key – typically the user's email address
 */
export function clearRateLimit(key: string): void {
  tracker.delete(key);
}

/**
 * Returns remaining attempts before lockout, or 0 if locked out.
 */
export function remainingAttempts(key: string): number {
  const now = Date.now();
  const entry = tracker.get(key);
  if (!entry || now - entry.firstAttempt > WINDOW_MS) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - entry.count);
}
