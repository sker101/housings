// ─────────────────────────────────────────────────────────────
// iRent — Auth Helpers
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
        'id',
        'role',
        'lister_type',
        'full_name',
        'phone',
        'phone_verified',
        'id_doc_url',
        'selfie_url',
        'profile_photo_url',
        'university',
        'verification_status',
        'subscription_plan',
        'preferred_language',
        'created_at',
      ].join(','),
      filters: [{ column: 'id', op: 'eq', value: userId }],
      limit: 1,
      accessToken,
    });
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    const profile = row as unknown as Profile;
    profile.suspended = row.verification_status === 'suspended';
    profile.id_document_url = (row.id_doc_url as string) || profile.id_document_url;
    return profile;
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
