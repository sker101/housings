BEGIN;

-- 1. Add new columns to listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS security_deposit    integer,
  ADD COLUMN IF NOT EXISTS floor               text,
  ADD COLUMN IF NOT EXISTS total_rooms         integer,
  ADD COLUMN IF NOT EXISTS furnished           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS property_type       text,
  ADD COLUMN IF NOT EXISTS owner_name          text,
  ADD COLUMN IF NOT EXISTS owner_phone         text,
  ADD COLUMN IF NOT EXISTS whatsapp_number     text,
  ADD COLUMN IF NOT EXISTS min_lease_months    integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payment_schedule    text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS late_fee_policy     text,
  ADD COLUMN IF NOT EXISTS video_tour_url      text,
  ADD COLUMN IF NOT EXISTS accessibility_notes text;

-- 2. Drop the UNIQUE constraint on (listing_id, angle) so multiple photos per angle are allowed
ALTER TABLE public.listing_photos
  DROP CONSTRAINT IF EXISTS listing_photos_unique_angle;

-- 3. Add a position column for photo ordering, caption, and is_cover flag
ALTER TABLE public.listing_photos
  ADD COLUMN IF NOT EXISTS position  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS caption   text,
  ADD COLUMN IF NOT EXISTS is_cover  boolean NOT NULL DEFAULT false;

-- 4. Add index for photo ordering
CREATE INDEX IF NOT EXISTS idx_listing_photos_position
  ON public.listing_photos (listing_id, position ASC);

COMMIT;
