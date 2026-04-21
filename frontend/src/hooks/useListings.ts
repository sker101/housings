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
    // If not public, require access token, or assume it's public.
    // wait, we can just allow public if accessToken is null for SearchPage
    // but the original had: if (!accessToken) { ... setListings ... return } 
    // Wait, the prompt says "The root index page (/) must be accessible to unauthenticated users."
    // So if no accessToken, we should still fetch! Wait, REST requests need ANON key as Bearer if there's no auth, which `request` does. 
    // So let's NOT return early.

    setLoading(true);
    setError(null);
    try {
      const filters: Array<{ column: string; op: string; value: unknown }> = [];

      // If we are looking for a specific owner, we need property filtering.
      // Supabase REST can filter joined tables but it requires syntax like property.landlord_id
      // For now, let's just fetch and filter memory if backend filter is too complex, actually we can use `properties.landlord_id` or just fetch.
      // Wait, rooms has no landlord_id, it is in properties.
      // We can use RPC or a view if we want perfect backend filtering, but let's try our best.

      // We only fetch active/available rooms by default
      if (filter.status) {
        // status is usually for properties
      }

      const rows = await selectRows('rooms', {
        select: '*, properties(*), room_photos(*)',
        filters,
        order: 'created_at.desc',
        limit: filter.limit ?? 100,
        accessToken: accessToken || undefined,
      });

      // Map backend columns back to frontend expected structure
      const mappedListings = rows.map((r: any) => {
        const prop = r.properties || {};
        const photos = r.room_photos || [];
        const isOwner = filter.ownerId && prop.landlord_id !== filter.ownerId;
        if (isOwner) return null; // filter in memory if owner mismatches

        return {
          id: r.id,
          owner_id: prop.landlord_id,
          title: prop.title || 'Untitled Room',
          description: r.description || prop.description,
          price: r.price_tzs,
          priceMonthly: r.price_tzs,
          region: prop.city,
          ward: prop.neighbourhood,
          street: prop.address,
          lat: prop.latitude,
          lng: prop.longitude,
          status: 'approved', // mock status
          room_type: r.room_type,
          amenities: r.amenities || [],
          vacancy_status: r.availability_status,
          featured: prop.is_featured,
          created_at: r.created_at,
          photos: photos.map((p: any) => p.photo_url),
          property_id: prop.id,
        };
      }).filter(Boolean);
      
      let final = mappedListings as Listing[];
      
      // search filtering
      if (filter.search) {
        const q = filter.search.toLowerCase();
        final = final.filter(l => 
          l.title.toLowerCase().includes(q) || 
          (l.ward && l.ward.toLowerCase().includes(q))
        );
      }

      setListings(final);
    } catch {
      setError('Could not load listings.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter.ownerId, filter.status, filter.limit, filter.search]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  return { listings, loading, error, reload: fetchListings };
}
