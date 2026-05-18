-- 20260518000002_rpc_tenant_has_active_booking.sql
-- Reliable single-query check: does this profile_id have any active booking?
-- Replaces the fragile two-step frontend query that breaks when tenants table row is missing.

CREATE OR REPLACE FUNCTION public.tenant_has_active_booking(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.tenants t ON b.tenant_id = t.id
    WHERE t.profile_id = p_profile_id
      AND b.status IN ('pending', 'confirmed', 'approved', 'paid')
  );
$$;

-- Grant to authenticated users so the frontend can call it
GRANT EXECUTE ON FUNCTION public.tenant_has_active_booking(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
