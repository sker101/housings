-- Phase 4: System Settings & Mass Notifications
-- Migration: 20260310230000_system_settings.sql

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Seed defaults
INSERT INTO public.system_settings (key, value)
VALUES 
    ('maintenance_mode', 'false'::jsonb),
    ('global_announcement', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings are viewable by everyone" 
ON public.system_settings FOR SELECT 
USING (true);

CREATE POLICY "Settings are editable by admins only" 
ON public.system_settings FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Mass notification helper function
CREATE OR REPLACE FUNCTION public.send_mass_notification(
    p_message TEXT,
    p_type TEXT,
    p_role_filter TEXT DEFAULT NULL -- 'student' or 'lister'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, message, type)
    SELECT id, p_message, p_type
    FROM public.profiles
    WHERE (p_role_filter IS NULL OR role = p_role_filter)
      AND is_suspended = FALSE;
END;
$$;
