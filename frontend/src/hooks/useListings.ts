import { useState, useEffect, useCallback } from 'react';
import { selectRows } from '../lib/supabase';
import type { Listing, ListingStatus } from '../types';

interface ListingsFilter {
  ownerId?: string;
  status?: ListingStatus;
  search?: string;
  limit?: number;
}

interface UseListingsResult {
  listings: Listing[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useListings(
  accessToken: string | null,
  filter: ListingsFilter = {}
): UseListingsResult {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    if (!accessToken) {
      setListings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const filters: Array<{ column: string; op: string; value: unknown }> = [];

      if (filter.ownerId) {
        filters.push({ column: 'lister_id', op: 'eq', value: filter.ownerId });
      }
      if (filter.status) {
        filters.push({ column: 'status', op: 'eq', value: filter.status });
      }

      const rows = await selectRows('listings', {
        select: 'id,lister_id,title,description,price_monthly,region,district,ward,street,lat,lng,status,room_type,amenities,vacancy_status,featured,promotion_level,created_at',
        filters,
        order: 'created_at.desc',
        limit: filter.limit ?? 100,
        accessToken,
      });

      // Map backend columns back to frontend expected structure
      const mappedListings = rows.map((r: any) => ({
        ...r,
        owner_id: r.lister_id,
        price: r.price_monthly,
      }));
      setListings(mappedListings as Listing[]);
    } catch {
      setError('Could not load listings.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter.ownerId, filter.status, filter.limit]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  return { listings, loading, error, reload: fetchListings };
}
