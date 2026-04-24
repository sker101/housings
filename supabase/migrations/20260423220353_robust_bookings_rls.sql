-- 1. Ensure bookings are readable by the tenant via Profile ID OR Tenant ID
DROP POLICY IF EXISTS "tenant own bookings" ON public.bookings;
CREATE POLICY "tenant own bookings" ON public.bookings FOR SELECT USING (
  tenant_id = (SELECT auth.uid()) 
  OR 
  tenant_id IN (SELECT id FROM public.tenants WHERE profile_id = (SELECT auth.uid()))
);

-- 2. Ensure tenant_leases are readable too
DROP POLICY IF EXISTS "tenant own leases" ON public.tenant_leases;
CREATE POLICY "tenant own leases" ON public.tenant_leases FOR SELECT USING (
  tenant_id = (SELECT auth.uid()) 
  OR 
  tenant_id IN (SELECT id FROM public.tenants WHERE profile_id = (SELECT auth.uid()))
);
