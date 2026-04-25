-- Add report_count column to listings table if it doesn't exist
-- This column tracks how many reports have been submitted for a listing
-- Only run if listings is a table (not a view)

DO $$
BEGIN
    -- Check if listings is a table (not a view)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'listings' 
        AND table_type = 'BASE TABLE'
    ) THEN
        -- Check if column exists
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'listings' 
            AND column_name = 'report_count'
        ) THEN
            -- Add the column
            ALTER TABLE public.listings 
            ADD COLUMN report_count integer NOT NULL DEFAULT 0;
            
            RAISE NOTICE 'Added report_count column to listings table';
        ELSE
            RAISE NOTICE 'report_count column already exists';
        END IF;
    ELSE
        RAISE NOTICE 'listings is not a table, skipping report_count column addition';
    END IF;
END $$;

-- Also ensure upheld_claims_count exists
DO $$
BEGIN
    -- Check if listings is a table (not a view)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'listings' 
        AND table_type = 'BASE TABLE'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'listings' 
            AND column_name = 'upheld_claims_count'
        ) THEN
            ALTER TABLE public.listings 
            ADD COLUMN upheld_claims_count integer NOT NULL DEFAULT 0;
            
            RAISE NOTICE 'Added upheld_claims_count column to listings table';
        END IF;
    ELSE
        RAISE NOTICE 'listings is not a table, skipping upheld_claims_count column addition';
    END IF;
END $$;

-- Ensure listing_reports table exists with correct columns
CREATE TABLE IF NOT EXISTS public.listing_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason text NOT NULL,
    details text,
    evidence_urls text[],
    reporter_has_booking boolean DEFAULT false,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on listing_reports
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for listing_reports
DROP POLICY IF EXISTS "Anyone can submit reports" ON public.listing_reports;
CREATE POLICY "Anyone can submit reports"
    ON public.listing_reports FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Reporter can read own reports" ON public.listing_reports;
CREATE POLICY "Reporter can read own reports"
    ON public.listing_reports FOR SELECT
    USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Admin can manage all reports" ON public.listing_reports;
CREATE POLICY "Admin can manage all reports"
    ON public.listing_reports FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_listing_reports_listing 
    ON public.listing_reports(listing_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_reports_reporter 
    ON public.listing_reports(reporter_id, created_at DESC);

COMMENT ON TABLE public.listing_reports IS 'Guest reports submitted by tenants or anonymous users';
