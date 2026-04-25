-- Create conversations view for MessagesPage compatibility
-- This view joins room_inquiries with listings/landlords to match the frontend expectations.

-- Drop conversations regardless of whether it's a table or view
DO $$
BEGIN
    -- Try to drop as table first
    DROP TABLE IF EXISTS public.conversations CASCADE;
EXCEPTION WHEN OTHERS THEN
    -- If it fails, it might be a view, ignore error
    NULL;
END $$;

DO $$
BEGIN
    -- Try to drop as view
    DROP VIEW IF EXISTS public.conversations CASCADE;
EXCEPTION WHEN OTHERS THEN
    -- If it fails, ignore error
    NULL;
END $$;

-- Only create view if all required tables exist
DO $$
DECLARE
    has_all_tables boolean;
BEGIN
    -- Check if all required tables exist
    SELECT COUNT(*) = 6 INTO has_all_tables
    FROM information_schema.tables 
    WHERE table_name IN ('room_inquiries', 'tenants', 'rooms', 'properties', 'landlords', 'property_managers')
    AND table_schema = 'public';
    
    IF has_all_tables THEN
        EXECUTE '
        CREATE OR REPLACE VIEW public.conversations AS
        SELECT 
            ri.id,
            ri.room_id AS listing_id,
            t.profile_id AS tenant_id,
            COALESCE(ll.profile_id, pm.profile_id) AS lister_id,
            ri.status AS inquiry_status,
            NULL::date AS move_in_date,
            COALESCE(
                (SELECT MAX(created_at) FROM public.chat_messages WHERE inquiry_id = ri.id),
                ri.created_at
            ) AS last_message_at,
            ri.created_at
        FROM public.room_inquiries ri
        JOIN public.tenants t ON ri.tenant_id = t.id
        JOIN public.rooms r ON ri.room_id = r.id
        JOIN public.properties p ON r.property_id = p.id
        LEFT JOIN public.landlords ll ON p.landlord_id = ll.id
        LEFT JOIN public.property_managers pm ON p.manager_id = pm.id
        ';
    ELSE
        RAISE NOTICE 'Skipping conversations view creation - missing required tables';
    END IF;
END $$;

-- Ensure RLS allows access to this view
-- Views inherit RLS from underlying tables, but we need to make sure 
-- users can see inquiries they are part of.

-- Only create policies if room_inquiries table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'room_inquiries' AND table_schema = 'public') THEN
        -- Room Inquiries RLS was already added in platform_revolution, but let's be sure.
        EXECUTE 'DROP POLICY IF EXISTS "tenant_see_own_inquiries" ON public.room_inquiries';
        EXECUTE 'CREATE POLICY "tenant_see_own_inquiries" ON public.room_inquiries
            FOR SELECT USING (
                tenant_id IN (SELECT id FROM public.tenants WHERE profile_id = auth.uid())
            )';
        
        EXECUTE 'DROP POLICY IF EXISTS "landlord_see_property_inquiries" ON public.room_inquiries';
        
        -- Only include property_managers if the table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'property_managers' AND table_schema = 'public') THEN
            EXECUTE 'CREATE POLICY "landlord_see_property_inquiries" ON public.room_inquiries
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM public.rooms r
                        JOIN public.properties p ON r.property_id = p.id
                        WHERE r.id = room_inquiries.room_id
                        AND (
                            p.landlord_id IN (SELECT id FROM public.landlords WHERE profile_id = auth.uid())
                            OR p.manager_id IN (SELECT id FROM public.property_managers WHERE profile_id = auth.uid())
                        )
                    )
                )';
        ELSE
            -- Simpler policy without property_managers
            EXECUTE 'CREATE POLICY "landlord_see_property_inquiries" ON public.room_inquiries
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM public.rooms r
                        JOIN public.properties p ON r.property_id = p.id
                        WHERE r.id = room_inquiries.room_id
                        AND p.landlord_id IN (SELECT id FROM public.landlords WHERE profile_id = auth.uid())
                    )
                )';
        END IF;
    END IF;
END $$;
