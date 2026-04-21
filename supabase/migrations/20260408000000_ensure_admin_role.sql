-- ============================================================
-- iRent — Ensure Admin Role
-- Ensures the user with admin@campusstay.co email has the 'admin'
-- role in the profiles table, so RLS policies allow access.
-- ============================================================

DO $$
DECLARE
    admin_id uuid;
BEGIN
    -- 1. Get the auth ID for the admin email
    SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@campusstay.co';

    IF admin_id IS NOT NULL THEN
        -- 2. Ensure profile exists and has the admin role
        INSERT INTO public.profiles (id, full_name, role, verification_status)
        VALUES (admin_id, 'iRent Admin', 'admin', 'verified')
        ON CONFLICT (id) DO UPDATE SET role = 'admin', verification_status = 'verified';
        
        RAISE NOTICE 'Admin role ensured for user %', admin_id;
    ELSE
        RAISE NOTICE 'Admin user admin@campusstay.co not found in auth.users';
    END IF;
END $$;
