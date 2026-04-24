-- FINAL REVIEWS STANDARDIZATION
-- This migration ensures the 'reviews' table has all the columns expected by the frontend.
-- It performs a robust alignment of column names (tenant_id, listing_id) to resolve 400 errors.

-- 1. Create table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID,
  tenant_id UUID,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Align columns if they exist under different names
DO $$ 
BEGIN
  -- Handle listing_id / room_id alignment
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'room_id') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'listing_id') THEN
    ALTER TABLE public.reviews RENAME COLUMN room_id TO listing_id;
  END IF;

  -- Handle tenant_id / user_id / author_id alignment
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'user_id') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.reviews RENAME COLUMN user_id TO tenant_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'author_id') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.reviews RENAME COLUMN author_id TO tenant_id;
  END IF;

  -- Ensure is_hidden column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'is_hidden') THEN
    ALTER TABLE public.reviews ADD COLUMN is_hidden BOOLEAN DEFAULT false;
  END IF;
  
  -- Ensure tenant_id column exists (fallback)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.reviews ADD COLUMN tenant_id UUID;
  END IF;

  -- Ensure listing_id column exists (fallback)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'listing_id') THEN
    ALTER TABLE public.reviews ADD COLUMN listing_id UUID;
  END IF;
END $$;

-- 3. Enable RLS and establish basic policies
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reviews are viewable" ON public.reviews;
CREATE POLICY "Public reviews are viewable" ON public.reviews
  FOR SELECT USING (NOT is_hidden);

DROP POLICY IF EXISTS "Tenants can insert own reviews" ON public.reviews;
CREATE POLICY "Tenants can insert own reviews" ON public.reviews
  FOR INSERT WITH CHECK (tenant_id = auth.uid());

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
