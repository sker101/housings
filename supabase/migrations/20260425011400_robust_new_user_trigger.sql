-- Robust handle_new_user trigger to prevent signup failures
-- This migration restores the BEGIN/EXCEPTION block and ensures the roles column is handled.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text;
BEGIN
  -- Wrap in a nested block to absorb errors
  BEGIN
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'tenant');
    
    INSERT INTO public.profiles (
      id, 
      full_name, 
      email, 
      role, 
      roles, 
      phone, 
      verification_status,
      profile_photo_url
    )
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
      new.email,
      v_role,
      ARRAY[v_role],
      COALESCE(new.raw_user_meta_data->>'phone', ''),
      'pending',
      COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
    )
    ON CONFLICT (id) DO NOTHING;
    
  EXCEPTION WHEN OTHERS THEN
    -- Silently absorb errors so the auth.users insertion proceeds
    -- This prevents the "Database error saving new user" block
    NULL; 
  END;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
