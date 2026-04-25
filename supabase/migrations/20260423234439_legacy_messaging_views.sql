-- 1. Create conversations view (mapping room_inquiries to legacy format)
-- Drop conversations regardless of whether it's a table or view
DO $$
BEGIN
    DROP TABLE IF EXISTS public.conversations CASCADE;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    DROP VIEW IF EXISTS public.conversations CASCADE;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Only create if room_inquiries exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'room_inquiries') THEN
        EXECUTE '
        CREATE OR REPLACE VIEW public.conversations AS
         SELECT i.id,
            i.room_id AS listing_id,
            i.tenant_id,
            p.landlord_id AS lister_id,
            i.status AS inquiry_status,
            NULL::date AS move_in_date,
            COALESCE((SELECT max(created_at) FROM chat_messages WHERE inquiry_id = i.id), i.created_at) AS last_message_at,
            i.created_at,
            i.created_at AS updated_at
           FROM room_inquiries i
             LEFT JOIN rooms r ON i.room_id = r.id
             LEFT JOIN properties p ON r.property_id = p.id
        ';
    END IF;
END $$;

-- 2. Create messages view (mapping chat_messages to legacy format)
DROP VIEW IF EXISTS public.messages CASCADE;
CREATE OR REPLACE VIEW public.messages AS
 SELECT id,
    inquiry_id AS conversation_id,
    sender_id,
    body,
    is_read,
        CASE
            WHEN is_read THEN created_at
            ELSE NULL::timestamp with time zone
        END AS seen_at,
    created_at
   FROM chat_messages;

-- 3. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
