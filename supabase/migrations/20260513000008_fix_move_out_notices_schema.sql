-- Migration to fix move_out_notices schema
ALTER TABLE public.move_out_notices
  DROP COLUMN IF EXISTS lease_id,
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE;
