-- Migration: Hide occupied listings from search via RLS policy
-- Purpose: Ensure occupied listings are only visible to the paying tenant or landlord
-- Date: 2026-04-01

-- Drop the existing tenant SELECT policy if it exists
DROP POLICY IF EXISTS "listings_select_tenant" ON public.listings;

-- Create new policy that hides occupied listings except for landlord or paying tenant
CREATE POLICY "listings_select_tenant"
  ON public.listings FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    AND (
      vacancy_status != 'occupied'
      OR lister_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.bookings
        WHERE listing_id = listings.id
          AND tenant_id = auth.uid()
          AND status IN ('approved', 'completed')
      )
    )
  );
