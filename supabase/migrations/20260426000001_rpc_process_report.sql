-- Database-Native Reporting System
-- This replaces the Edge Function to avoid Docker-related deployment issues.

CREATE OR REPLACE FUNCTION public.process_listing_report(
    p_listing_id uuid,
    p_reason text,
    p_details text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to check bookings and insert reports
SET search_path = public
AS $$
DECLARE
    v_reporter_id uuid;
    v_has_booking boolean := false;
    v_report_id uuid;
    v_result jsonb;
BEGIN
    -- 1. Get the current user ID (can be NULL if guest)
    v_reporter_id := auth.uid();

    -- 2. Check if the reporter has a paid booking for this listing (if logged in)
    IF v_reporter_id IS NOT NULL THEN
        -- Check bookings table. We check for listing_id if it exists, or property_id/room_id
        -- Looking at the schema, we'll try to match by listing_id (assuming it exists or property_id)
        SELECT EXISTS (
            SELECT 1 FROM public.bookings 
            WHERE (property_id = p_listing_id OR room_id = p_listing_id)
              AND tenant_id = v_reporter_id 
              AND status IN ('paid', 'active', 'completed')
        ) INTO v_has_booking;
    END IF;

    -- 3. Insert the report
    INSERT INTO public.listing_reports (
        listing_id,
        reporter_id,
        reason,
        details,
        reporter_has_booking,
        status,
        created_at
    )
    VALUES (
        p_listing_id,
        v_reporter_id,
        p_reason,
        p_details,
        v_has_booking,
        'pending',
        now()
    )
    RETURNING id INTO v_report_id;

    -- 4. Construct success result
    v_result := jsonb_build_object(
        'success', true,
        'reportId', v_report_id,
        'message', 'Report submitted successfully. Thank you for helping keep our community safe.'
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.process_listing_report(uuid, text, text) TO anon, authenticated, service_role;
