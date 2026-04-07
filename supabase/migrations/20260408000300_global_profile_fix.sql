-- 1. Create the function to handle new user profiles automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    phone,
    phone_verified,
    verification_status,
    subscription_plan,
    preferred_language
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'New User'),
    COALESCE((new.raw_user_meta_data->>'role')::app_role, 'student'::app_role),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    false,
    CASE 
      WHEN (new.raw_user_meta_data->>'role') = 'lister' THEN 'pending'::verification_status
      ELSE 'unverified'::verification_status
    END,
    'free'::subscription_plan,
    COALESCE(new.raw_user_meta_data->>'preferred_language', 'en')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger for future users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. IMMEDIATELY BACKFILL all existing users who are missing profiles
-- This fixes George and everyone else currently in the system.
INSERT INTO public.profiles (
    id,
    full_name,
    role,
    phone,
    phone_verified,
    verification_status,
    subscription_plan,
    preferred_language
)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', email, 'Extant User'), 
    COALESCE((raw_user_meta_data->>'role')::app_role, 'student'::app_role),
    COALESCE(raw_user_meta_data->>'phone', ''),
    false,
    CASE 
      WHEN (raw_user_meta_data->>'role') = 'lister' THEN 'pending'::verification_status
      ELSE 'unverified'::verification_status
    END,
    'free'::subscription_plan,
    COALESCE(raw_user_meta_data->>'preferred_language', 'en')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
