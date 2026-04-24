-- Create conversations view for MessagesPage compatibility
-- This view joins room_inquiries with listings/landlords to match the frontend expectations.

DROP TABLE IF EXISTS public.conversations CASCADE;
DROP VIEW IF EXISTS public.conversations CASCADE;

CREATE OR REPLACE VIEW public.conversations AS
SELECT 
    ri.id,
    ri.room_id AS listing_id,
    t.profile_id AS tenant_id,
    COALESCE(ll.profile_id, pm.profile_id) AS lister_id,
    ri.status AS inquiry_status,
    NULL::date AS move_in_date, -- Not explicitly in room_inquiries yet
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
LEFT JOIN public.property_managers pm ON p.manager_id = pm.id;

-- Ensure RLS allows access to this view
-- Views inherit RLS from underlying tables, but we need to make sure 
-- users can see inquiries they are part of.

-- Room Inquiries RLS was already added in platform_revolution, but let's be sure.
DROP POLICY IF EXISTS "tenant_see_own_inquiries" ON public.room_inquiries;
CREATE POLICY "tenant_see_own_inquiries" ON public.room_inquiries
    FOR SELECT USING (
        tenant_id IN (SELECT id FROM public.tenants WHERE profile_id = auth.uid())
    );

DROP POLICY IF EXISTS "landlord_see_property_inquiries" ON public.room_inquiries;
CREATE POLICY "landlord_see_property_inquiries" ON public.room_inquiries
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
    );
