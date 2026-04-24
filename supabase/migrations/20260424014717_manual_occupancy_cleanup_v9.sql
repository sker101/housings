-- FINAL DATA SYNCHRONIZATION AND CLEANUP
-- 1. Sync Room Occupancy
-- This marks any room that was paid for (before the automatic trigger was installed) as occupied.
UPDATE public.rooms
SET availability_status = 'occupied'
WHERE id IN (SELECT listing_id FROM public.bookings WHERE status = 'paid');

-- 2. Align Reviews Table
-- Ensures the reviews table supports the 'listing_id' name used by the frontend.
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'room_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'listing_id') THEN
      ALTER TABLE public.reviews RENAME COLUMN room_id TO listing_id;
    END IF;
  END IF;
  
  -- Handle 'listing_reviews' if that's the name instead
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listing_reviews') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'listing_reviews' AND column_name = 'room_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'listing_reviews' AND column_name = 'listing_id') THEN
      ALTER TABLE public.listing_reviews RENAME COLUMN room_id TO listing_id;
    END IF;
  END IF;
END $$;

-- 3. Align Saved Listings
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saved_listings') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'saved_listings' AND column_name = 'room_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'saved_listings' AND column_name = 'listing_id') THEN
      ALTER TABLE public.saved_listings RENAME COLUMN room_id TO listing_id;
    END IF;
  END IF;
END $$;

-- 4. Align Listing Photos
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listing_photos') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'listing_photos' AND column_name = 'room_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'listing_photos' AND column_name = 'listing_id') THEN
      ALTER TABLE public.listing_photos RENAME COLUMN room_id TO listing_id;
    END IF;
  END IF;
END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
