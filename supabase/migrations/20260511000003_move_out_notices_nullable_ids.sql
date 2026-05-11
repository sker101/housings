-- ─────────────────────────────────────────────────────────────────────────────
-- Fix move_out_notices: property_id and room_id may be null (old bookings)
-- Migration: 20260511000003_move_out_notices_nullable_ids.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- bookings.property_id is nullable, so notices from booking fallback may lack it
ALTER TABLE move_out_notices
  ALTER COLUMN property_id DROP NOT NULL;

-- landlord profile lookup may fail for some bookings
ALTER TABLE move_out_notices
  ALTER COLUMN landlord_id DROP NOT NULL;

-- room_id was already nullable — confirm (idempotent)
ALTER TABLE move_out_notices
  ALTER COLUMN room_id DROP NOT NULL;
