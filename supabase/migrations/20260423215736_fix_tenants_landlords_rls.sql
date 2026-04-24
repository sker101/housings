-- 1. Ensure users can see their own tenant/landlord records
DROP POLICY IF EXISTS "tenant_own_record" ON public.tenants;
CREATE POLICY "tenant_own_record" ON public.tenants FOR ALL USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "landlord_own_record" ON public.landlords;
CREATE POLICY "landlord_own_record" ON public.landlords FOR ALL USING (profile_id = auth.uid());

-- 2. Ensure room visibility policy is robust
DROP POLICY IF EXISTS "tenant sees booked room" ON public.rooms;
CREATE POLICY "tenant sees booked room" ON public.rooms FOR SELECT USING (
  id IN (
    SELECT listing_id FROM public.bookings 
    WHERE (tenant_id IN (SELECT id FROM public.tenants WHERE profile_id = auth.uid()) OR tenant_id = auth.uid())
    AND status IN ('pending', 'requested', 'approved', 'confirmed', 'completed', 'paid')
  )
);
