-- TEMPORARY PERMISSIVE POLICY FOR DEBUGGING
-- This policy allows any authenticated user to see any booking.
-- We are doing this to verify if RLS is the reason for the "missing room" issue.
DROP POLICY IF EXISTS "tenant own bookings" ON public.bookings;
CREATE POLICY "tenant own bookings" ON public.bookings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "tenants see own leases" ON public.tenant_leases;
CREATE POLICY "tenants see own leases" ON public.tenant_leases
  FOR SELECT
  TO authenticated
  USING (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
