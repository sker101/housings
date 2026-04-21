-- Fix handle_new_user trigger to respect the role passed during signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    final_role text;
BEGIN
    final_role := COALESCE(NEW.raw_user_meta_data->>'role', 'tenant');
    
    -- Hard override for admin emails
    IF NEW.email IN ('admin@campusstay.co', 'admin@irent.co.tz', 'admin@campusstaytz.com') THEN
        final_role := 'admin';
    END IF;

    -- Map old role names to new ones if necessary
    IF final_role = 'student' THEN final_role := 'tenant'; END IF;
    IF final_role = 'lister' THEN final_role := 'landlord'; END IF;
    IF final_role = 'dalali' THEN final_role := 'property_manager'; END IF;

    INSERT INTO public.profiles (id, full_name, role, lister_type, avatar_url, phone)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      final_role,
      COALESCE(NEW.raw_user_meta_data->>'lister_type', 'owner'),
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (id) DO UPDATE SET
      role = EXCLUDED.role,
      lister_type = EXCLUDED.lister_type,
      full_name = EXCLUDED.full_name;
      
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-establish trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix existing data for common test users
UPDATE profiles 
SET role = 'landlord', lister_type = 'owner'
WHERE full_name ILIKE '%Landlord%' OR phone IN ('+255700000002') OR id = '2aee506c-e263-478a-bcef-f3cc999a69b9';

UPDATE profiles
SET role = 'property_manager', lister_type = 'dalali'
WHERE full_name ILIKE '%Manager%' OR full_name ILIKE '%Dalali%' OR id = 'e77965c7-7e4c-4ade-ba52-19472cd7d647';
