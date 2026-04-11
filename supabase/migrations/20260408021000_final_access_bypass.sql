-- Migration: Final Tenant Access Unlock (Universal Bypass v3)
-- Purpose: Forcefully allow tenants with bookings to always see the room details, bypassing all listing status checks.
-- Date: 2026-04-08

BEGIN;

-- 1. Redress LISTINGS Policy (v3)
DROP POLICY IF EXISTS "listings_universal_tenant_access_v1" ON public.listings;
DROP POLICY IF EXISTS "listings_permissive_select_v1" ON public.listings;
DROP POLICY IF EXISTS "listings_select_tenant" ON public.listings;
DROP POLICY IF EXISTS "listings_select_by_visibility" ON public.listings;

CREATE POLICY "listings_universal_tenant_access_v2"
  ON public.listings FOR SELECT
  TO authenticated
  USING (
    -- Publicly visible approved & available rooms (Standard Public)
    (status = 'approved' AND vacancy_status != 'occupied')
    OR
    -- Landlord/Admin access (Standard Admin)
    lister_id = auth.uid()
    OR
    public.is_admin(auth.uid())
    OR
    -- THE UNIVERSAL KEY: If you have a booking, you see the room. PERIOD.
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE listing_id = listings.id
        AND tenant_id = auth.uid()
    )
  );

-- 2. Redress LISTING PHOTOS Policy (v3)
DROP POLICY IF EXISTS "listing_photos_universal_tenant_access_v1" ON public.listing_photos;
DROP POLICY IF EXISTS "listing_photos_permissive_select_v1" ON public.listing_photos;
DROP POLICY IF EXISTS "listing_photos_select_by_listing_visibility" ON public.listing_photos;

CREATE POLICY "listing_photos_universal_tenant_access_v2"
  ON public.listing_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_id
        AND (
          (l.status = 'approved' AND l.vacancy_status != 'occupied')
          OR l.lister_id = auth.uid()
          OR public.is_admin(auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.listing_id = l.id
              AND b.tenant_id = auth.uid()
          )
        )
    )
  );

COMMIT;
