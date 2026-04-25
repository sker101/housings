[-- 1. Create missing storage buckets for listings
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-photos', 'listing-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up Storage Policies for the listing-photos bucket
-- Allow public viewing of photos
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'listing-photos');

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'listing-photos' 
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own photos
CREATE POLICY "Owner Deletion" ON storage.objects
FOR DELETE USING (
  bucket_id = 'listing-photos' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.listings WHERE lister_id = auth.uid()
  )
);

-- 3. Fix listing_photos table schema
-- This ensures that frontend queries for position, caption, and is_cover don't crash.
DO $$ 
BEGIN
    -- Convert angle to text to allow any name
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listing_photos' AND column_name = 'angle'
    ) THEN
        ALTER TABLE public.listing_photos ALTER COLUMN angle TYPE text;
    END IF;

    -- Add missing columns
    ALTER TABLE public.listing_photos ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;
    ALTER TABLE public.listing_photos ADD COLUMN IF NOT EXISTS caption text;
    ALTER TABLE public.listing_photos ADD COLUMN IF NOT EXISTS is_cover boolean DEFAULT false;
    
    -- Ensure listings table has lister_type for profiling
    ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS lister_type text DEFAULT 'owner';
END $$;

-- 4. Enable RLS on listing_photos and add policies
ALTER TABLE public.listing_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view listing photos" ON public.listing_photos;
CREATE POLICY "Anyone can view listing photos" ON public.listing_photos
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Landlords can manage their own listing photos" ON public.listing_photos;
CREATE POLICY "Landlords can manage their own listing photos" ON public.listing_photos
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.listings l
        WHERE l.id = listing_id AND l.lister_id = auth.uid()
    )
);

-- 5. Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
]