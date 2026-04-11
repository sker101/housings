import { useState, useEffect, useCallback } from 'react';
import { selectRows, updateRows, insertRows } from '../lib/supabase';
import type { Inquiry, InquiryStatus } from '../types';

interface UseInquiriesResult {
  inquiries: Inquiry[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  acceptInquiry: (_inquiryId: string) => Promise<void>;
  declineInquiry: (_inquiryId: string) => Promise<void>;
}

export function useInquiries(
  role: 'tenant' | 'host',
  userId: string | null,
  accessToken: string | null
): UseInquiriesResult {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInquiries = useCallback(async () => {
    if (!userId || !accessToken) {
      setInquiries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const column = role === 'tenant' ? 'tenant_id' : 'host_id';
      const rows = await selectRows('inquiries', {
        select: 'id,listing_id,tenant_id,host_id,status,message,created_at',
        filters: [{ column, op: 'eq', value: userId }],
        order: 'created_at.desc',
        accessToken,
      });
      setInquiries(rows as Inquiry[]);
    } catch {
      setError('Could not load inquiries.');
    } finally {
      setLoading(false);
    }
  }, [role, userId, accessToken]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const changeStatus = useCallback(
    async (inquiryId: string, status: InquiryStatus) => {
      if (!accessToken) return;
      // Optimistic update
      setInquiries((prev) =>
        prev.map((i) => (i.id === inquiryId ? { ...i, status } : i))
      );
      try {
        await updateRows(
          'inquiries',
          { status },
          {
            filters: [{ column: 'id', op: 'eq', value: inquiryId }],
            accessToken,
          }
        );
        // Log to activity_log
        await insertRows('activity_log', {
          user_id: userId,
          event_type: `inquiry_${status}`,
          description: `Inquiry ${status}`,
          metadata: { inquiry_id: inquiryId },
        }, { accessToken });
      } catch {
        // Revert
        await fetchInquiries();
        throw new Error(`Failed to ${status} inquiry.`);
      }
    },
    [accessToken, userId, fetchInquiries]
  );

  const acceptInquiry = useCallback(
    (id: string) => changeStatus(id, 'accepted'),
    [changeStatus]
  );
  const declineInquiry = useCallback(
    (id: string) => changeStatus(id, 'declined'),
    [changeStatus]
  );

  return { inquiries, loading, error, reload: fetchInquiries, acceptInquiry, declineInquiry };
}
