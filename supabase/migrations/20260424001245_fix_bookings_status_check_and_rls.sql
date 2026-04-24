-- 1. Update bookings_status_check to include 'paid', 'approved', and 'requested'
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'requested'::text, 'approved'::text, 'confirmed'::text, 'paid'::text, 'cancelled'::text, 'completed'::text, 'disputed'::text]));

-- 2. Enhance RLS for bookings to support both tenant_record_id and profile_id (auth.uid)
-- This fixes the mismatch where different parts of the app use different IDs for the same user.
DROP POLICY IF EXISTS "tenant own bookings" ON public.bookings;
CREATE POLICY "tenant own bookings" ON public.bookings
  FOR ALL
  USING (
    (tenant_id IN (SELECT id FROM tenants WHERE profile_id = auth.uid())) 
    OR 
    (tenant_id = auth.uid())
  )
  WITH CHECK (
    (tenant_id IN (SELECT id FROM tenants WHERE profile_id = auth.uid())) 
    OR 
    (tenant_id = auth.uid())
  );

-- 3. Enhance RLS for tenant_leases for the same reason
DROP POLICY IF EXISTS "tenants see own leases" ON public.tenant_leases;
CREATE POLICY "tenants see own leases" ON public.tenant_leases
  FOR SELECT
  USING (
    (tenant_id IN (SELECT id FROM tenants WHERE profile_id = auth.uid())) 
    OR 
    (tenant_id = auth.uid())
  );

-- 4. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
