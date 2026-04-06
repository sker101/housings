import { useState, useEffect, useCallback } from 'react';
import { selectRows, updateRows, upsertRows } from '../lib/supabase';
import type { Profile } from '../types';

interface UseProfileResult {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
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
          'id', 'role', 'full_name', 'phone', 'occupation',
          'id_verified', 'id_document_url', 'suspended', 'avg_rating',
          'profile_photo_url', 'avatar_url', 'university', 'lister_type',
          'verification_status', 'preferred_language', 'created_at',
        ].join(','),
        filters: [{ column: 'id', op: 'eq', value: userId }],
        limit: 1,
        accessToken,
      });
      setProfile((rows[0] as Profile) || null);
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
