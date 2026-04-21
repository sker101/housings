-- Restore even more legacy columns to profiles for frontend compatibility
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en',
ADD COLUMN IF NOT EXISTS commission_rate_pct decimal DEFAULT 10.0;

-- Ensure RLS is still correct for these columns
-- The previous migrations already set up RLS for profiles, so new columns should be covered.
