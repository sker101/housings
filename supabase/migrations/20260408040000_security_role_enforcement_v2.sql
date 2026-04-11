-- Migration: Security Role Enforcement v2 (Auth ID lookup)
-- Date: 2026-04-08

DO $$
DECLARE
    target_id uuid;
BEGIN
    -- Find the user ID from auth.users (the primary source of truth for emails)
    SELECT id INTO target_id FROM auth.users WHERE email = 'student.one@campusstay.co' LIMIT 1;
    
    IF target_id IS NOT NULL THEN
        -- Force reset the role in public.profiles to 'student'
        UPDATE public.profiles
        set role = 'student'
        WHERE id = target_id;
        
        RAISE NOTICE 'Security: Role enforced to student for student.one@campusstay.co';
    ELSE
        RAISE WARNING 'Security: User student.one@campusstay.co not found in auth.users';
    END IF;
END $$;
