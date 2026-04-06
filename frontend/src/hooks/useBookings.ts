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
      const column = role === 'tenant' ? 'tenant_id' : 'host_id';
      const rows = await selectRows('bookings', {
        select: 'id,inquiry_id,tenant_id,host_id,listing_id,amount,payment_ref,payment_status,move_in_date,created_at',
        filters: [{ column, op: 'eq', value: userId }],
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
          b.payment_status === 'paid' &&
          b.created_at >= startOfMonth
      )
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);
  })();

  return { bookings, loading, error, reload: fetchBookings, monthlyIncome };
}
