-- Migration to fix RLS Catch-22 and ensure tenants can book rooms
-- This migration relaxes the SELECT policy on listings so that tenants can see approved but occupied listings
-- and fixes the INSERT policy for bookings to be more reliable.

-- 1. Relax listings SELECT policy for tenants
DROP POLICY IF EXISTS "listings_select_tenant" ON listings;
CREATE POLICY "listings_select_tenant" ON listings
  FOR SELECT
  TO authenticated
  USING (
    (status = 'approved'::listing_status) OR 
    (lister_id = auth.uid()) OR 
    is_admin(auth.uid())
  );

-- 2. Consolidate bookings INSERT policy
-- We ensure the tenant can insert a booking if the listing is approved
DROP POLICY IF EXISTS "bookings_insert_tenant_or_admin" ON bookings;
CREATE POLICY "bookings_insert_tenant_or_admin" ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      (auth.uid() = tenant_id) AND 
      EXISTS (
        SELECT 1 FROM listings l 
        WHERE l.id = bookings.listing_id 
        AND l.status = 'approved'::listing_status
      )
    ) OR 
    is_admin(auth.uid())
  );

-- Note: The trigger 'trg_check_listing_bookable' will still prevent 
-- actually booking an 'occupied' listing if the logic requires it.
