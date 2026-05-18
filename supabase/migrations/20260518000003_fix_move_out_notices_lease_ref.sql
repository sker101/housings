-- 20260518000003_fix_move_out_notices_lease_ref.sql
-- The original move_out_notices table references tenant_leases(id) for lease_id,
-- but the app primarily uses the bookings table. This causes FK violations.
-- Fix: make lease_id nullable, add booking_id referencing bookings(id).

ALTER TABLE public.move_out_notices
  ALTER COLUMN lease_id DROP NOT NULL;

ALTER TABLE public.move_out_notices
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_move_out_notices_booking_id ON public.move_out_notices(booking_id);

NOTIFY pgrst, 'reload schema';
