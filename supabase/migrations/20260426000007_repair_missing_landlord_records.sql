-- Repair missing landlord and property manager records for existing profiles
-- This ensures that the listings view (which joins these tables) shows existing listings.

-- 1. Insert missing landlord records
INSERT INTO public.landlords (profile_id, identity_verified, verified_at)
SELECT 
    id as profile_id, 
    (verification_status = 'verified') as identity_verified,
    CASE WHEN verification_status = 'verified' THEN now() ELSE NULL END as verified_at
FROM public.profiles
WHERE (role = 'landlord' OR 'landlord' = ANY(roles))
  AND id NOT IN (SELECT profile_id FROM public.landlords)
ON CONFLICT (profile_id) DO NOTHING;

-- 2. Insert missing property manager records (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_managers') THEN
        EXECUTE 'INSERT INTO public.property_managers (profile_id, is_verified) ' ||
                'SELECT id, (verification_status = ''verified'') ' ||
                'FROM public.profiles ' ||
                'WHERE (role = ''property_manager'' OR ''property_manager'' = ANY(roles)) ' ||
                '  AND id NOT IN (SELECT profile_id FROM public.property_managers) ' ||
                'ON CONFLICT (profile_id) DO NOTHING';
    END IF;
END $$;

-- 3. Fix orphaned properties that might be using profile_id in landlord_id field
-- (Some older versions of the app might have stored the profile UUID directly in properties.landlord_id)
DO $$
BEGIN
    -- Check if landlord_id in properties is a UUID (it usually is)
    -- If we find a property where landlord_id matches a PROFILE ID instead of a LANDLORD ID, fix it.
    UPDATE public.properties p
    SET landlord_id = l.id
    FROM public.landlords l
    WHERE p.landlord_id = l.profile_id;
    
    -- Same for property managers
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_managers') THEN
        EXECUTE 'UPDATE public.properties p ' ||
                'SET manager_id = pm.id ' ||
                'FROM public.property_managers pm ' ||
                'WHERE p.manager_id = pm.profile_id';
    END IF;
END $$;

-- 4. Sync verification status back to profiles just in case
UPDATE public.profiles
SET verification_status = 'verified', is_verified = true
WHERE id IN (SELECT profile_id FROM public.landlords WHERE identity_verified = true)
  AND verification_status != 'verified';

-- 5. Final check: Ensure listings view is refreshed (for PostgREST)
NOTIFY pgrst, 'reload schema';
