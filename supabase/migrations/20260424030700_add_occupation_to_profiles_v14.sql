-- ADD OCCUPATION COLUMN TO PROFILES
-- This migration adds the missing 'occupation' column to the profiles table
-- to resolve the "column profiles.occupation does not exist" error on the dashboard.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS occupation TEXT;

-- Update RLS if needed (usually not required for adding columns, but good to be safe)
NOTIFY pgrst, 'reload schema';
