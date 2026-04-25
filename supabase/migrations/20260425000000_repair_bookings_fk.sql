-- REPAIR bookings table foreign key to match current database state
-- On localhost, the 'listings' table is still active, but 'bookings' was 
-- incorrectly updated to point to a non-existent 'rooms' table.

DO $$ 
BEGIN
    -- 1. Drop the incorrect constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bookings_room_id_fkey') THEN
        ALTER TABLE public.bookings DROP CONSTRAINT bookings_room_id_fkey;
    END IF;

    -- 2. Rename room_id back to listing_id if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'room_id') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'listing_id') THEN
            ALTER TABLE public.bookings RENAME COLUMN room_id TO listing_id;
        END IF;
    END IF;

    -- 3. Point the foreign key to 'listings' table (which is what actually has the data)
    -- We use 'IF EXISTS' on the target table to be safe.
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listings' AND table_type = 'BASE TABLE') THEN
        ALTER TABLE public.bookings 
        ADD CONSTRAINT bookings_listing_id_fkey 
        FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Repointed bookings to listings table';
    ELSE
        -- If it is a view, it should point to rooms
        ALTER TABLE public.bookings 
        ADD CONSTRAINT bookings_listing_id_fkey 
        FOREIGN KEY (listing_id) REFERENCES public.rooms(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Repointed bookings to rooms table';
    END IF;

END $$;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
