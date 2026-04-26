-- Create admin_notifications view to support the Admin Dashboard
-- This view identifies new listings or profiles that need verification.

CREATE OR REPLACE VIEW public.admin_notifications AS
SELECT 
    l.id as id,
    l.id as listing_id,
    p.full_name as poster_name,
    l.room_type as room_type,
    (l.district || ', ' || l.ward) as location,
    l.created_at as created_at,
    NULL::timestamptz as read_at
FROM 
    public.listings l
JOIN 
    public.profiles p ON l.lister_id = p.id
WHERE 
    l.status = 'pending'
ORDER BY 
    l.created_at DESC;

GRANT SELECT ON public.admin_notifications TO authenticated, service_role;
