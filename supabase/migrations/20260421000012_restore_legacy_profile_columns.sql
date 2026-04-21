-- Add verification_status back to profiles for legacy frontend compatibility
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';

-- Update existing profiles based on flags
UPDATE profiles 
SET verification_status = CASE 
    WHEN is_suspended = true THEN 'suspended'
    WHEN is_verified = true THEN 'verified'
    ELSE 'unverified'
END;

-- Add a trigger to keep verification_status in sync with is_verified and is_suspended
CREATE OR REPLACE FUNCTION sync_profiles_verification_status() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.verification_status := CASE 
        WHEN NEW.is_suspended = true THEN 'suspended'
        WHEN NEW.is_verified = true THEN 'verified'
        ELSE 'unverified'
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_profiles_verification_status ON profiles;
CREATE TRIGGER trg_sync_profiles_verification_status
BEFORE INSERT OR UPDATE OF is_verified, is_suspended ON profiles
FOR EACH ROW EXECUTE FUNCTION sync_profiles_verification_status();

-- Ensure profile_photo_url exists (it was avatar_url in the new migration)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_photo_url text;

-- Sync profile_photo_url with avatar_url
UPDATE profiles SET profile_photo_url = avatar_url;

-- Add trigger for profile_photo_url
CREATE OR REPLACE FUNCTION sync_profiles_photo_url() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
        NEW.profile_photo_url := NEW.avatar_url;
    END IF;
    IF NEW.profile_photo_url IS DISTINCT FROM OLD.profile_photo_url THEN
        NEW.avatar_url := NEW.profile_photo_url;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_profiles_photo_url ON profiles;
CREATE TRIGGER trg_sync_profiles_photo_url
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION sync_profiles_photo_url();
