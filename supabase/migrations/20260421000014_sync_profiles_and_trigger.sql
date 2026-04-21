-- Populate profiles from auth.users
INSERT INTO profiles (id, full_name, role, created_at)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', email, 'User'), 
    CASE 
        WHEN email = 'admin@campusstay.co' THEN 'admin' 
        WHEN email = 'admin@irent.co.tz' THEN 'admin'
        ELSE 'tenant' 
    END,
    created_at
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

-- Ensure common role names are mapped correctly in the role check
-- The check is already on profiles(role), we just need to ensure the data is there.

-- Ensure the trigger exists to handle future signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE 
        WHEN NEW.email = 'admin@campusstay.co' THEN 'admin' 
        WHEN NEW.email = 'admin@irent.co.tz' THEN 'admin'
        ELSE 'tenant' 
    END,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
