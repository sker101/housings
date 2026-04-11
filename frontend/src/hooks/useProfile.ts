import { useState, useEffect, useCallback } from 'react';
import { selectRows, upsertRows } from '../lib/supabase';
import type { Profile } from '../types';

interface UseProfileResult {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (_patch: Partial<Profile>) => Promise<void>;
}

export function useProfile(userId: string | null, accessToken: string | null): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId || !accessToken) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = await selectRows('profiles', {
        select: [
          'id', 'role', 'lister_type', 'full_name', 'phone', 'phone_verified',
          'university', 'profile_photo_url', 'id_doc_url', 'is_suspended', 
          'avg_rating', 'verification_status', 'preferred_language',
          'created_at',
        ].join(','),
        filters: [{ column: 'id', op: 'eq', value: userId }],
        limit: 1,
        accessToken,
      });
      const profileRow = rows[0] as any;
      if (profileRow) {
        profileRow.suspended = profileRow.is_suspended;
        profileRow.id_document_url = profileRow.id_doc_url;
        setProfile(profileRow as Profile);
      } else {
        setProfile(null);
      }
    } catch {
      setError('Could not load profile.');
    } finally {
      setLoading(false);
    }
  }, [userId, accessToken]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (patch: Partial<Profile>) => {
    if (!userId || !accessToken) return;
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
    try {
      await upsertRows('profiles', { id: userId, ...patch }, {
        onConflict: 'id',
        accessToken,
      });
    } catch {
      // Revert on error
      await fetchProfile();
      throw new Error('Failed to update profile.');
    }
  }, [userId, accessToken, fetchProfile]);

  return { profile, loading, error, refreshProfile: fetchProfile, updateProfile };
}
