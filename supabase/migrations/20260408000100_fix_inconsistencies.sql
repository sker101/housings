-- ============================================================
-- CampusStay TZ — Fix Schema Inconsistencies
-- Adds missing 'reference' columns to bookings and payment_records.
-- ============================================================

ALTER TABLE IF EXISTS public.bookings
ADD COLUMN IF NOT EXISTS reference text;

ALTER TABLE IF EXISTS public.payment_records
ADD COLUMN IF NOT EXISTS reference text;

-- Fix common column name aliases if they were missing or mismatched
-- In this DB, we use 'is_suspended' and 'id_doc_url'. 
-- If some code uses 'suspended' or 'id_document_url', we've added mapping in AuthContext,
-- but we can also add these as generated columns or views if needed.
-- For now, let's just ensure the base columns exist.
