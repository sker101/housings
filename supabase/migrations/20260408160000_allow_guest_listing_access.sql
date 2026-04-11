-- Migration: Allow Guest Listing Access (Universal Browse)
-- Purpose: Enable non-logged-in users (anon) to see featured listings and browse rooms. 
--          Login is only enforced when they try to pay or inquire.
-- Date: 2026-04-08

BEGIN;

-- 1. Redress LISTINGS Policy (v4) to allow GUESTS (anon)
-- This replaces the previous authenticated-only policy
DROP POLICY IF EXISTS "listings_universal_tenant_access_v2" ON public.listings;
DROP POLICY IF EXISTS "listings_universal_tenant_access_v3" ON public.listings;

CREATE POLICY "listings_universal_access_v4"
  ON public.listings FOR SELECT
  TO public
  USING (
    -- Publicly visible approved & available rooms (Guest & Authenticated)
    (status = 'approved' AND vacancy_status != 'occupied')
    OR
    -- Landlord/Admin access (Authenticated Only - guard with auth.uid())
    (auth.uid() IS NOT NULL AND (
        lister_id = auth.uid()
        OR
        public.is_admin(auth.uid())
        OR
        -- OR you have any booking for this room (e.g. past or current)
        EXISTS (
          SELECT 1 FROM public.bookings
          WHERE listing_id = listings.id
            AND tenant_id = auth.uid()
        )
    ))
  );

-- 2. Redress LISTING PHOTOS Policy (v4) to allow GUESTS
-- Photos follow the visibility of their parent listing
DROP POLICY IF EXISTS "listing_photos_universal_tenant_access_v2" ON public.listing_photos;

CREATE POLICY "listing_photos_universal_access_v4"
  ON public.listing_photos FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_id
        AND (
          (l.status = 'approved' AND l.vacancy_status != 'occupied')
          OR (auth.uid() IS NOT NULL AND (
              l.lister_id = auth.uid()
              OR public.is_admin(auth.uid())
              OR EXISTS (
                SELECT 1 FROM public.bookings b
                WHERE b.listing_id = l.id
                  AND b.tenant_id = auth.uid()
              )
          ))
        )
    )
  );

-- 3. Allow Guest visibility for Profiles (to see Lister names)
-- This is necessary so guest users can see who listed the room
DROP POLICY IF EXISTS "profiles_public_read_v1" ON public.profiles;

CREATE POLICY "profiles_public_read_v1"
  ON public.profiles FOR SELECT
  TO public
  USING (true);

COMMIT;
