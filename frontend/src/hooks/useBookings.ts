import { useState, useEffect, useCallback } from 'react';
import { selectRows } from '../lib/supabase';
import type { Booking } from '../types';

interface UseBookingsResult {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  monthlyIncome: number;
}

export function useBookings(
  role: 'tenant' | 'host',
  userId: string | null,
  accessToken: string | null
): UseBookingsResult {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!userId || !accessToken) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Resolve the role-specific ID (landlord_id or tenant_id)
      let roleId = userId;
      const table = role === 'host' ? 'landlords' : 'tenants';
      const roleRows = await selectRows(table, {
        select: 'id',
        filters: [{ column: 'profile_id', op: 'eq', value: userId }],
        limit: 1,
        accessToken: accessToken
      });
      if (roleRows?.[0]) {
        roleId = roleRows[0].id;
      } else {
        // If no role record exists, we can't have bookings
        setBookings([]);
        setLoading(false);
        return;
      }

      const column = role === 'tenant' ? 'tenant_id' : 'landlord_id';
      const rows = await selectRows('bookings', {
        select: 'id,listing_id,tenant_id,landlord_id,move_in_date,months_duration,status,total_tzs,created_at',
        or: `${column}.eq.${roleId}${userId ? `,${column}.eq.${userId}` : ''}`,
        order: 'created_at.desc',
        accessToken,
      });
      setBookings(rows as Booking[]);
    } catch {
      setError('Could not load bookings.');
    } finally {
      setLoading(false);
    }
  }, [role, userId, accessToken]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Calculate monthly income (paid bookings this calendar month)
  const monthlyIncome = (() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return bookings
      .filter(
        (b) =>
          (b.status === 'confirmed' || b.status === 'completed') &&
          b.created_at >= startOfMonth
      )
      .reduce((sum, b) => sum + Number(b.total_tzs || 0), 0);
  })();

  return { bookings, loading, error, reload: fetchBookings, monthlyIncome };
}
