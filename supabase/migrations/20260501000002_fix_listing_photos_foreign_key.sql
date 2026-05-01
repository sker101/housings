-- FIX FOREIGN KEY CONSTRAINT ON listing_photos
-- When the `listings` table was renamed to `listings_legacy_backup` (to make way for the `listings` view),
-- the foreign key `listing_photos_listing_id_fkey` on `listing_photos` automatically started pointing to `listings_legacy_backup`.
-- New listings are inserted into `rooms` (which acts as the main listing ID).
-- We need to drop the old constraint and recreate it to point to `rooms(id)`.

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listing_photos') THEN
        -- Drop the old foreign key constraint pointing to listings_legacy_backup
        ALTER TABLE public.listing_photos DROP CONSTRAINT IF EXISTS listing_photos_listing_id_fkey;
        
        -- Also drop any other named constraints just in case
        ALTER TABLE public.listing_photos DROP CONSTRAINT IF EXISTS listing_photos_room_id_fkey;

        -- Recreate the foreign key constraint pointing to the new `rooms` table
        -- Since new listing IDs are generated in the `rooms` table, this is the correct reference.
        ALTER TABLE public.listing_photos
            ADD CONSTRAINT listing_photos_listing_id_fkey
            FOREIGN KEY (listing_id) REFERENCES public.rooms(id) ON DELETE CASCADE;
            
        -- Make sure room_photos also has the correct constraint if it exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'room_photos') THEN
            ALTER TABLE public.room_photos DROP CONSTRAINT IF EXISTS room_photos_room_id_fkey;
            ALTER TABLE public.room_photos DROP CONSTRAINT IF EXISTS room_photos_listing_id_fkey;
            
            ALTER TABLE public.room_photos
                ADD CONSTRAINT room_photos_room_id_fkey
                FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;
