-- Fix listing_photos table to support more angles and extra columns expected by the frontend
-- This fixes the issue where landlords upload photos but they aren't saved due to enum/schema mismatches.

-- 0. Drop views that might be shadowing our tables
DROP VIEW IF EXISTS public.listing_photos CASCADE;
DROP VIEW IF EXISTS public.listings CASCADE;

DO $$ 
BEGIN
    -- 1. Convert angle to text to allow any angle name (other1, other2, etc.)
    -- First, check if the table exists and the column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'listing_photos' AND table_type = 'BASE TABLE'
    ) THEN
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'listing_photos' AND column_name = 'angle'
        ) THEN
            -- Convert it to text to bypass enum constraints
            ALTER TABLE public.listing_photos ALTER COLUMN angle TYPE text;
        END IF;

        -- 2. Add missing columns expected by the frontend's "Full Mode" insertion
        ALTER TABLE public.listing_photos ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;
        ALTER TABLE public.listing_photos ADD COLUMN IF NOT EXISTS caption text;
        ALTER TABLE public.listing_photos ADD COLUMN IF NOT EXISTS is_cover boolean DEFAULT false;
    ELSE
        RAISE NOTICE 'listing_photos is not a table, skipping photo schema changes';
    END IF;

    -- 3. Ensure listings table has all columns sent by the frontend
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'listings' AND table_type = 'BASE TABLE'
    ) THEN
        ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS security_deposit integer;
        ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS floor text;
        ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS total_rooms integer;
        ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS furnished boolean DEFAULT false;
        ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS property_type text;
        ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS min_lease_months integer DEFAULT 1;
        ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS payment_schedule text DEFAULT 'monthly';
        ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS late_fee_policy text;
        ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS video_tour_url text;
        ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS accessibility_notes text;
        ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS house_rules text;
        ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS owner_name text;
        ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS owner_phone text;
        ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS whatsapp_number text;
    ELSE
        RAISE NOTICE 'listings is not a table, skipping listing schema changes';
    END IF;

    -- 4. Ensure RLS policies allow landlords to insert their own photos
    -- Only create if listing_photos is a table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'listing_photos' AND table_type = 'BASE TABLE'
    ) THEN
        -- Drop existing to avoid conflicts
        DROP POLICY IF EXISTS "landlords_insert_photos" ON public.listing_photos;
        CREATE POLICY "landlords_insert_photos" ON public.listing_photos
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.listings l
                WHERE l.id = listing_id AND l.lister_id = auth.uid()
            )
            OR public.is_admin(auth.uid())
        );
    END IF;
END $$;

-- 5. Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
