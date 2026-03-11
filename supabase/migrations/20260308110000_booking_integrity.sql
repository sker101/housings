-- Phase 2: Booking data integrity guards
-- Migration: 20260308110000_booking_integrity.sql

-- Prevent a tenant from submitting two active booking requests 
-- for the same listing at the same time.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_tenant_listing_active_unique
  ON public.bookings(tenant_id, listing_id)
  WHERE status IN ('requested', 'approved');

-- Gate: prevent booking a listing that is already occupied by a different tenant
CREATE OR REPLACE FUNCTION public.trg_check_listing_bookable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vacancy text;
BEGIN
  SELECT vacancy_status INTO v_vacancy
  FROM public.listings WHERE id = NEW.listing_id;

  IF v_vacancy = 'occupied' THEN
    RAISE EXCEPTION 'This listing is currently occupied and cannot be booked.';
  END IF;

  -- Move-in date must be today or in the future
  IF NEW.move_in_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Move-in date cannot be in the past.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_listing_bookable ON public.bookings;
CREATE TRIGGER trg_check_listing_bookable
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trg_check_listing_bookable();

-- Gate: only tenants with a completed booking may submit a review for that listing
-- Achieved via a RLS policy on the reviews table.
DROP POLICY IF EXISTS "reviews_insert_verified_tenant" ON public.reviews;
CREATE POLICY "reviews_insert_verified_tenant"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings
      WHERE tenant_id = auth.uid()
        AND listing_id = reviews.listing_id
        AND status = 'approved'
    )
  );
