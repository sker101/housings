-- Create 'listings' bucket for property photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listings',
  'listings',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policies for 'listings' bucket

-- Public can view listing photos
DROP POLICY IF EXISTS "Public can view listing photos" ON storage.objects;
CREATE POLICY "Public can view listing photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'listings');

-- Authenticated can upload listing photos
DROP POLICY IF EXISTS "Authenticated can upload listing photos" ON storage.objects;
CREATE POLICY "Authenticated can upload listing photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listings' AND auth.uid() IS NOT NULL);

-- Owners or admins can update listing photos
DROP POLICY IF EXISTS "Owners or admins can update listing photos" ON storage.objects;
CREATE POLICY "Owners or admins can update listing photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listings'
  AND (owner_id = auth.uid()::text OR public.is_admin(auth.uid()))
)
WITH CHECK (
  bucket_id = 'listings'
  AND (owner_id = auth.uid()::text OR public.is_admin(auth.uid()))
);

-- Owners or admins can delete listing photos
DROP POLICY IF EXISTS "Owners or admins can delete listing photos" ON storage.objects;
CREATE POLICY "Owners or admins can delete listing photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'listings'
  AND (owner_id = auth.uid()::text OR public.is_admin(auth.uid()))
);
