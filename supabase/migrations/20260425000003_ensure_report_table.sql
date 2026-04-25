-- Ensure listing_reports table exists and is properly configured
-- This migration fixes any issues with the reports functionality

-- Drop and recreate the table to ensure clean state
DROP TABLE IF EXISTS public.listing_reports CASCADE;

-- Create the listing_reports table (without FK to listings since it might be a view)
CREATE TABLE IF NOT EXISTS public.listing_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL,
    reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason text NOT NULL,
    details text,
    evidence_urls text[] DEFAULT '{}',
    reporter_has_booking boolean DEFAULT false,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add comment
COMMENT ON TABLE public.listing_reports IS 'Guest reports submitted by tenants or anonymous users about listings';

-- Enable RLS
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_listing_reports_listing 
    ON public.listing_reports(listing_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_reports_reporter 
    ON public.listing_reports(reporter_id, created_at DESC);

-- Ensure report_count column exists on listings (only if it's a table)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'listings' AND table_type = 'BASE TABLE'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'listings' AND column_name = 'report_count'
        ) THEN
            ALTER TABLE public.listings ADD COLUMN report_count integer NOT NULL DEFAULT 0;
        END IF;
    END IF;
END $$;

-- Recreate the trigger function (handles both table and view cases)
CREATE OR REPLACE FUNCTION public.handle_listing_report_threshold()
RETURNS TRIGGER AS $$
DECLARE
    v_report_count integer;
    v_critical_report boolean;
    listings_is_table boolean;
BEGIN
    -- Check if listings is a table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'listings' AND table_type = 'BASE TABLE'
    ) INTO listings_is_table;
    
    -- Only act on newly inserted reports
    IF TG_OP = 'INSERT' THEN
        -- Count verified reports (with reporter_id - not anonymous)
        SELECT COUNT(*) INTO v_report_count
        FROM public.listing_reports
        WHERE listing_id = NEW.listing_id
          AND reporter_id IS NOT NULL
          AND status = 'pending';
        
        -- Check if this is a critical reason
        v_critical_report := NEW.reason IN ('fraud', 'unsafe', 'harassment') 
                            AND NEW.reporter_id IS NOT NULL;
        
        -- Only update listings if it's a table
        IF listings_is_table THEN
            -- Update listing status if threshold met
            IF v_critical_report OR NEW.reporter_has_booking OR v_report_count >= 3 THEN
                UPDATE public.listings
                SET status = 'flagged',
                    report_count = COALESCE(report_count, 0) + 1
                WHERE id = NEW.listing_id;
            ELSE
                -- Just increment report count
                UPDATE public.listings
                SET report_count = COALESCE(report_count, 0) + 1
                WHERE id = NEW.listing_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_listing_report_threshold ON public.listing_reports;

CREATE TRIGGER trigger_listing_report_threshold
    AFTER INSERT ON public.listing_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_listing_report_threshold();

-- Refresh PostgREST schema cache so new columns are recognized
NOTIFY pgrst, 'reload schema';
