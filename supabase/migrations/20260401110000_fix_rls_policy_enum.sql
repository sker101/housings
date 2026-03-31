-- Migration: Fix RLS policy with correct booking_status enum values
-- Purpose: Correct the invalid enum values in listings_select_tenant policy
-- Date: 2026-04-01 11:00

-- Drop the incorrect policy
DROP POLICY IF EXISTS "listings_select_tenant" ON public.listings;

-- Create the corrected policy with valid booking_status values
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
