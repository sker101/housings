-- Exclude the sending admin from receiving their own mass notification
-- Migration: 20260310290000_mass_notif_exclude_self.sql

CREATE OR REPLACE FUNCTION public.send_mass_notification(
    p_message TEXT,
    p_type TEXT,
    p_role_filter TEXT DEFAULT NULL
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
      AND is_suspended = FALSE
      AND id <> auth.uid();  -- exclude the admin sending the alert
END;
$$;
