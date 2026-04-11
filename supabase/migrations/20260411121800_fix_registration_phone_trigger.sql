-- Fix handle_new_user trigger to use NULL instead of empty string for phone
-- This prevents unique constraint violations for users without phone numbers

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
    NULLIF(new.raw_user_meta_data->>'phone', ''),
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

-- Backfill any existing '' strings to NULL to clean up the data
UPDATE public.profiles 
SET phone = NULL 
WHERE phone = '';
