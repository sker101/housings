-- Migration: Allow tenants to see their landlord's phone number
-- Tenants with active bookings should be able to contact their landlord

-- Update the profiles select policy to allow tenants to see listers (verified OR not)
-- for purposes of an active booking relationship

DROP POLICY IF EXISTS "profiles_select_privacy" ON public.profiles;

CREATE POLICY "profiles_select_privacy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    -- Own profile
    id = auth.uid()
    OR
    -- Admin sees all
    public.is_admin(auth.uid())
    OR
    -- Verified listers are public
    (role = 'lister'::app_role AND verification_status = 'verified')
    OR
    -- Any lister whose listing has an active booking for this tenant
    (
      role = 'lister'::app_role
      AND EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.landlord_id = profiles.id
          AND b.status IN ('active', 'confirmed', 'paid', 'approved', 'completed')
          AND (
            b.tenant_id = auth.uid()
            OR b.tenant_id IN (
              SELECT id FROM public.tenants WHERE profile_id = auth.uid()
            )
          )
      )
    )
  );
