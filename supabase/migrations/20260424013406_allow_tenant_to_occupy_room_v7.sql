-- ALLOW TENANTS TO MARK ROOM AS OCCUPIED
-- This migration enables tenants to automatically update a room's status to 'occupied'
-- after they have successfully paid for it. This ensures search results are immediately
-- updated without waiting for landlord intervention.

-- 1. Ensure rooms table has RLS enabled (it should be, but let's be safe)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- 2. Create the policy for tenants to update the status
DROP POLICY IF EXISTS "tenants can occupy booked rooms" ON public.rooms;
CREATE POLICY "tenants can occupy booked rooms" ON public.rooms
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.listing_id = rooms.id
      AND (
        b.tenant_id = auth.uid() 
        OR 
        b.tenant_id IN (SELECT id FROM tenants WHERE profile_id = auth.uid())
      )
      AND b.status = 'paid'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.listing_id = rooms.id
      AND (
        b.tenant_id = auth.uid() 
        OR 
        b.tenant_id IN (SELECT id FROM tenants WHERE profile_id = auth.uid())
      )
      AND b.status = 'paid'
    )
    -- Tenants are only allowed to change the status to 'occupied'
    AND availability_status = 'occupied'
  );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
