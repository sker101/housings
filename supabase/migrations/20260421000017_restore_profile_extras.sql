-- Restore EVEN MORE legacy columns to profiles for frontend compatibility
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS university text,
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS lister_type text DEFAULT 'owner',
ADD COLUMN IF NOT EXISTS id_doc_url text,
ADD COLUMN IF NOT EXISTS selfie_url text;

-- Map lister_type to a check if needed, but for now just add it.
-- Ensure these columns are accessible
