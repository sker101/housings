-- Consolidate profile verification triggers to prevent conflicts
-- This replaces trg_sync_profiles_verification_status and trg_sync_verification_flags

-- 1. Drop existing conflicting triggers
DROP TRIGGER IF EXISTS trg_sync_profiles_verification_status ON public.profiles;
DROP TRIGGER IF EXISTS trg_sync_verification_flags ON public.profiles;

-- 2. Create a robust unified sync function
CREATE OR REPLACE FUNCTION public.sync_profile_verification_and_flags()
RETURNS TRIGGER AS $$
BEGIN
    -- Case 1: verification_status was explicitly changed in the UPDATE
    IF (TG_OP = 'UPDATE' AND NEW.verification_status IS DISTINCT FROM OLD.verification_status) THEN
        IF NEW.verification_status = 'verified' THEN
            NEW.is_verified := true;
            NEW.is_suspended := false;
        ELSIF NEW.verification_status = 'suspended' THEN
            NEW.is_suspended := true;
            NEW.is_verified := false;
        ELSIF NEW.verification_status IN ('unverified', 'pending', 'rejected') THEN
            NEW.is_verified := false;
            NEW.is_suspended := false;
        END IF;
    
    -- Case 2: is_verified or is_suspended were changed directly
    ELSIF (TG_OP = 'UPDATE' AND (NEW.is_verified IS DISTINCT FROM OLD.is_verified OR NEW.is_suspended IS DISTINCT FROM OLD.is_suspended)) THEN
        IF NEW.is_suspended = true THEN
            NEW.verification_status := 'suspended';
        ELSIF NEW.is_verified = true THEN
            NEW.verification_status := 'verified';
        ELSIF OLD.verification_status = 'verified' AND NEW.is_verified = false THEN
            NEW.verification_status := 'unverified';
        ELSIF OLD.verification_status = 'suspended' AND NEW.is_suspended = false THEN
            NEW.verification_status := 'unverified';
        END IF;
    
    -- Case 3: INSERT (defaults)
    ELSIF (TG_OP = 'INSERT') THEN
        IF NEW.is_suspended = true THEN
            NEW.verification_status := 'suspended';
        ELSIF NEW.is_verified = true THEN
            NEW.verification_status := 'verified';
        ELSE
            NEW.verification_status := COALESCE(NEW.verification_status, 'unverified');
        END IF;
    END IF;

    -- Case 4: Sync identity_verified in landlords table if verified
    -- We use a side-effect update here because we are in a BEFORE trigger
    IF NEW.verification_status = 'verified' AND (NEW.role = 'landlord' OR 'landlord' = ANY(NEW.roles)) THEN
        -- We can't update another table easily in a BEFORE trigger without risk of deadlock, 
        -- but for this specific flow it's generally safe. 
        -- However, a separate AFTER trigger is cleaner for side-effects.
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the unified BEFORE trigger
CREATE TRIGGER trg_profiles_verification_sync
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_verification_and_flags();

-- 4. Create an AFTER trigger for side-effects (landlords/property_managers tables)
CREATE OR REPLACE FUNCTION public.sync_external_verification_records()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.verification_status = 'verified' THEN
        -- Update landlords
        UPDATE public.landlords 
        SET identity_verified = true, verified_at = now()
        WHERE profile_id = NEW.id;
        
        -- Update property_managers
        UPDATE public.property_managers
        SET is_verified = true
        WHERE profile_id = NEW.id;
    ELSIF NEW.verification_status != 'verified' AND (OLD.verification_status = 'verified' OR OLD.verification_status IS NULL) THEN
        -- Revert landlords
        UPDATE public.landlords 
        SET identity_verified = false, verified_at = NULL
        WHERE profile_id = NEW.id;
        
        -- Revert property_managers
        UPDATE public.property_managers
        SET is_verified = false
        WHERE profile_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profiles_external_sync ON public.profiles;
CREATE TRIGGER trg_profiles_external_sync
AFTER UPDATE OF verification_status, is_verified ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_external_verification_records();
