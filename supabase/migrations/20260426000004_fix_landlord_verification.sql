-- Fix for Landlord verification and room posting permissions
-- 1. Update is_lister to support 'landlord' and 'property_manager' roles
-- 2. Update is_lister to check for verification if needed (optional, but roles are mandatory)
-- 3. Add trigger to ensure landlords/property_managers records exist
-- 4. Sync identity_verified flags

-- Update is_lister function to be compatible with current role names
CREATE OR REPLACE FUNCTION public.is_lister(target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_user_id
      AND (
        p.role IN ('lister', 'landlord', 'property_manager', 'manager', 'dalali', 'admin')
        OR
        (p.roles IS NOT NULL AND (
          'landlord' = ANY(p.roles) OR 
          'property_manager' = ANY(p.roles) OR 
          'admin' = ANY(p.roles)
        ))
      )
  );
$$;

-- Ensure landlords record exists for users with landlord role
CREATE OR REPLACE FUNCTION public.ensure_landlord_record()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.role = 'landlord' OR 'landlord' = ANY(NEW.roles)) THEN
        INSERT INTO public.landlords (profile_id)
        VALUES (NEW.id)
        ON CONFLICT (profile_id) DO NOTHING;
    END IF;
    
    IF (NEW.role = 'property_manager' OR 'property_manager' = ANY(NEW.roles)) THEN
        INSERT INTO public.property_managers (profile_id)
        VALUES (NEW.id)
        ON CONFLICT (profile_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ensure_landlord_record ON public.profiles;
CREATE TRIGGER trg_ensure_landlord_record
AFTER INSERT OR UPDATE OF role, roles ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.ensure_landlord_record();

-- Sync is_verified and identity_verified flags when verification_status changes
CREATE OR REPLACE FUNCTION public.sync_verification_flags()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync is_verified in profiles
    IF NEW.verification_status = 'verified' THEN
        NEW.is_verified := true;
    ELSIF NEW.verification_status IN ('unverified', 'rejected', 'pending') THEN
        NEW.is_verified := false;
    END IF;

    -- Sync identity_verified in landlords table
    IF NEW.verification_status = 'verified' AND (NEW.role = 'landlord' OR 'landlord' = ANY(NEW.roles)) THEN
        UPDATE public.landlords 
        SET identity_verified = true, verified_at = now()
        WHERE profile_id = NEW.id;
    END IF;

    -- Sync is_verified in property_managers table
    IF NEW.verification_status = 'verified' AND (NEW.role = 'property_manager' OR 'property_manager' = ANY(NEW.roles)) THEN
        UPDATE public.property_managers
        SET is_verified = true
        WHERE profile_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_verification_flags ON public.profiles;
CREATE TRIGGER trg_sync_verification_flags
BEFORE UPDATE OF verification_status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_verification_flags();

-- Run for existing verified users to ensure they are synced
UPDATE public.landlords
SET identity_verified = true, verified_at = now()
WHERE profile_id IN (SELECT id FROM public.profiles WHERE verification_status = 'verified');

UPDATE public.property_managers
SET is_verified = true
WHERE profile_id IN (SELECT id FROM public.profiles WHERE verification_status = 'verified');
