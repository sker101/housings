-- RESTORE SECURE RLS POLICIES
-- This migration restores strict access controls to ensure privacy.
-- Only the tenant who booked/paid for the room and the landlord can view or modify the booking.

-- 1. Secure the 'bookings' table
DROP POLICY IF EXISTS "tenant own bookings" ON public.bookings;
CREATE POLICY "tenant own bookings" ON public.bookings
  FOR ALL
  TO authenticated
  USING (
    -- Matches if tenant_id is the tenant record ID linked to the current user
    (tenant_id IN (SELECT id FROM tenants WHERE profile_id = auth.uid())) 
    OR 
    -- Matches if tenant_id is the user's direct profile ID (fallback)
    (tenant_id = auth.uid()) 
    OR
    -- Matches if current user is the landlord
    (landlord_id = auth.uid())
  )
  WITH CHECK (
    (tenant_id IN (SELECT id FROM tenants WHERE profile_id = auth.uid()))
    OR 
    (tenant_id = auth.uid())
    OR
    (landlord_id = auth.uid())
  );

-- 2. Secure the 'tenant_leases' table
DROP POLICY IF EXISTS "tenants see own leases" ON public.tenant_leases;
CREATE POLICY "tenants see own leases" ON public.tenant_leases
  FOR SELECT
  TO authenticated
  USING (
    (tenant_id IN (SELECT id FROM tenants WHERE profile_id = auth.uid()))
    OR 
    (tenant_id = auth.uid())
    OR
    (landlord_id = auth.uid())
  );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
