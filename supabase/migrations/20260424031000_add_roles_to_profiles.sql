-- Add roles column to profiles table to support multiple roles per user
-- This migration fixes the error "column profiles.roles does not exist"

-- First, add the roles column as an array of text
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roles text[] DEFAULT '{}';

-- Initialize the roles column with the value from the existing role column
UPDATE public.profiles SET roles = ARRAY[role] WHERE roles = '{}' OR roles IS NULL;

-- Ensure the roles column is not null
ALTER TABLE public.profiles ALTER COLUMN roles SET NOT NULL;

-- Update the handle_new_user trigger function if it exists to include the roles column
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'tenant');
  
  INSERT INTO public.profiles (id, full_name, email, role, roles, phone, verification_status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    v_role,
    ARRAY[v_role],
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    'pending'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
