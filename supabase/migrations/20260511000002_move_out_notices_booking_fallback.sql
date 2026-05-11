-- ─────────────────────────────────────────────────────────────────────────────
-- Fix move_out_notices: support tenants who have a booking but no lease row
-- Migration: 20260511000002_move_out_notices_booking_fallback.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Make lease_id nullable (tenants with only a booking, no tenant_lease row)
ALTER TABLE move_out_notices
  ALTER COLUMN lease_id DROP NOT NULL;

-- Add booking_id as an alternative reference
ALTER TABLE move_out_notices
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL;

-- At least one of lease_id or booking_id must be set
ALTER TABLE move_out_notices
  ADD CONSTRAINT notice_requires_lease_or_booking
    CHECK (lease_id IS NOT NULL OR booking_id IS NOT NULL);
