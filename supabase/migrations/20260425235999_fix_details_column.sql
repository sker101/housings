-- Fix: Ensure details column exists and refresh schema cache

DO $$
BEGIN
    -- Check if listing_reports table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'listing_reports' AND table_type = 'BASE TABLE'
    ) THEN
        -- Add details column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'listing_reports' AND column_name = 'details'
        ) THEN
            ALTER TABLE public.listing_reports ADD COLUMN details text;
            RAISE NOTICE 'Added details column to listing_reports';
        ELSE
            RAISE NOTICE 'details column already exists';
        END IF;
    END IF;
END $$;

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
