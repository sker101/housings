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
      // Use 'conversations' view as it contains both tenant_id and lister_id
      const rows = await selectRows('conversations', {
        select: 'id,listing_id,tenant_id,lister_id,inquiry_status,created_at',
        or: role === 'tenant' ? `tenant_id.eq.${userId}` : `lister_id.eq.${userId}`,
        order: 'created_at.desc',
        accessToken,
      });

      // Map inquiry_status to status to match the Inquiry type expected by components
      const mapped = (rows as any[]).map(r => ({
        ...r,
        status: r.inquiry_status || 'open',
        message: '' // Message body is in chat_messages table
      }));
      
      setInquiries(mapped as Inquiry[]);
    } catch (err) {
      console.error('useInquiries fetch error:', err);
      setError('Could not load inquiries.');
    } finally {
      setLoading(true); // Temporary to trigger something? No, should be false
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
        // Update the base table 'room_inquiries'
        await updateRows(
          'room_inquiries',
          { status },
          {
            filters: [{ column: 'id', op: 'eq', value: inquiryId }],
            accessToken,
          }
        );

        // Log to activity_log
        if (userId) {
          await insertRows('activity_log', {
            user_id: userId,
            event_type: `inquiry_${status}`,
            description: `Inquiry ${status}`,
            metadata: { inquiry_id: inquiryId },
          }, { accessToken });
        }
      } catch (err) {
        console.error('useInquiries update error:', err);
        // Revert on error
        await fetchInquiries();
        throw new Error(`Failed to ${status} inquiry.`);
      }
    },
    [accessToken, userId, fetchInquiries]
  );

  const acceptInquiry = useCallback(
    (id: string) => changeStatus(id, 'interested'),
    [changeStatus]
  );
  const declineInquiry = useCallback(
    (id: string) => changeStatus(id, 'unavailable'),
    [changeStatus]
  );

  return { inquiries, loading, error, reload: fetchInquiries, acceptInquiry, declineInquiry };
}
