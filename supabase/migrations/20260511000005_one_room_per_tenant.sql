-- ─────────────────────────────────────────────────────────────────────────────
-- One Active Booking Per Tenant
-- Migration: 20260511000005_one_room_per_tenant.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Enforce that a tenant can only have ONE active/pending/confirmed booking
-- at a time. They must move out (or their booking be cancelled) before they
-- can reserve another room.

-- 1. Unique partial index: only one active booking per tenant at a time.
--    Covers: pending, confirmed, approved, paid
--    Excludes: cancelled, rejected, completed, expired

-- Clean up existing duplicate active bookings (keep only the most recent one per tenant)
UPDATE bookings
SET status = 'cancelled'
WHERE status IN ('pending', 'confirmed', 'approved', 'paid')
  AND id NOT IN (
    SELECT id
    FROM (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at DESC) as rnum
      FROM bookings
      WHERE status IN ('pending', 'confirmed', 'approved', 'paid')
    ) as ranked
    WHERE rnum = 1
  );

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'bookings_one_active_per_tenant'
  ) THEN
    CREATE UNIQUE INDEX bookings_one_active_per_tenant
      ON bookings (tenant_id)
      WHERE status IN ('pending', 'confirmed', 'approved', 'paid');
  END IF;
END $$;

-- 2. Helper function: check if a tenant already has an active booking
--    Returns the booking record if one exists, NULL otherwise.
CREATE OR REPLACE FUNCTION public.get_tenant_active_booking(p_profile_id uuid)
RETURNS TABLE (
  booking_id   uuid,
  listing_id   uuid,
  listing_title text,
  status       text,
  move_in_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    b.id          AS booking_id,
    b.listing_id,
    l.title       AS listing_title,
    b.status,
    b.move_in_date
  FROM bookings b
  JOIN tenants t ON t.id = b.tenant_id
  LEFT JOIN listings l ON l.id = b.listing_id
  WHERE t.profile_id = p_profile_id
    AND b.status IN ('pending', 'confirmed', 'approved', 'paid')
  ORDER BY b.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_active_booking(uuid) TO authenticated;
