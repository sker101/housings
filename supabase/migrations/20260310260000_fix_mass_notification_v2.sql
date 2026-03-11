-- Fix Mass Notification Function (Type & Case Sensitivity)
-- Migration: 20260310260000_fix_mass_notification_v2.sql

CREATE OR REPLACE FUNCTION public.send_mass_notification(
    p_message TEXT,
    p_type TEXT,
    p_role_filter TEXT DEFAULT NULL -- 'STUDENT', 'LISTER', or 'ADMIN'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, title, body)
    SELECT id, p_type, 'System Alert', p_message
    FROM public.profiles
    WHERE (p_role_filter IS NULL OR role::text = lower(p_role_filter))
      AND is_suspended = FALSE;
END;
$$;
