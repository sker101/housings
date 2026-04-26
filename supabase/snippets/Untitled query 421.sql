-- Add details column if missing
ALTER TABLE public.listing_reports ADD COLUMN IF NOT EXISTS details text;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'listing_reports' 
ORDER BY ordinal_position;