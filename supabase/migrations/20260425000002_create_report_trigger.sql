-- Create function to handle listing report thresholds
CREATE OR REPLACE FUNCTION public.handle_listing_report_threshold()
RETURNS TRIGGER AS $$
DECLARE
    v_report_count integer;
    v_critical_report boolean;
BEGIN
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
        
        -- Update listing status if threshold met
        IF v_critical_report OR NEW.reporter_has_booking OR v_report_count >= 3 THEN
            UPDATE public.listings
            SET status = 'flagged',
                report_count = report_count + 1
            WHERE id = NEW.listing_id;
        ELSE
            -- Just increment report count
            UPDATE public.listings
            SET report_count = report_count + 1
            WHERE id = NEW.listing_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_listing_report_threshold ON public.listing_reports;

CREATE TRIGGER trigger_listing_report_threshold
    AFTER INSERT ON public.listing_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_listing_report_threshold();

COMMENT ON FUNCTION public.handle_listing_report_threshold() IS 
    'Automatically flags listings when they receive critical reports or exceed report thresholds';
