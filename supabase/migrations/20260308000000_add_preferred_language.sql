-- Add preferred_language column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en';

-- Add index for potential analytics or future queries
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language ON public.profiles (preferred_language);
