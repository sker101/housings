// ─────────────────────────────────────────────────────────────
// CampusStay TZ — Auth Helpers
// Thin wrappers around supabase.ts so pages don't need to
// import raw auth functions directly.
// ─────────────────────────────────────────────────────────────
import {
  fetchAuthUser,
  readStoredSession,
  selectRows,
  signOut as _signOut,
} from './supabase';
import type { Profile } from '../types';

/**
 * Get the current stored session (no network call).
 */
export function getSession() {
  return readStoredSession();
}

/**
 * Fetch a profile row from the DB for a given userId.
 */
export async function getProfile(
  userId: string,
  accessToken: string
): Promise<Profile | null> {
  try {
    const rows = await selectRows('profiles', {
      select: [
        'id', 'role', 'full_name', 'phone', 'occupation',
        'id_verified', 'id_document_url', 'suspended', 'avg_rating',
        'profile_photo_url', 'avatar_url', 'university', 'lister_type',
        'verification_status', 'preferred_language', 'created_at',
      ].join(','),
      filters: [{ column: 'id', op: 'eq', value: userId }],
      limit: 1,
      accessToken,
    });
    return (rows[0] as Profile) || null;
  } catch {
    return null;
  }
}

/**
 * Fetch the Supabase auth user object using an access token.
 */
export async function getAuthUser(accessToken: string) {
  return fetchAuthUser(accessToken);
}

/**
 * Sign the user out server-side.
 */
export async function signOutUser(accessToken: string): Promise<void> {
  try {
    await _signOut(accessToken);
  } catch {
    // Ignore — local session cleared by caller
  }
}
