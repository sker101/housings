-- BRUTE FORCE REVIEWS FIX
-- This migration ensures that the 'reviews' table has EVERY SINGLE column 
-- expected by the frontend, regardless of previous states or partial migrations.

-- 1. Ensure the table exists
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- 2. Add all missing columns with absolute certainty
DO $$ 
BEGIN
  -- tenant_id (Who wrote the review)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.reviews ADD COLUMN tenant_id UUID;
  END IF;

  -- listing_id (Which room is being reviewed)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'listing_id') THEN
    ALTER TABLE public.reviews ADD COLUMN listing_id UUID;
  END IF;

  -- rating (1-5 stars)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'rating') THEN
    ALTER TABLE public.reviews ADD COLUMN rating INTEGER;
  END IF;

  -- comment (The text content)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'comment') THEN
    ALTER TABLE public.reviews ADD COLUMN comment TEXT;
  END IF;

  -- is_hidden (Moderation flag)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'is_hidden') THEN
    ALTER TABLE public.reviews ADD COLUMN is_hidden BOOLEAN DEFAULT false;
  END IF;

  -- created_at (Timestamp)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'created_at') THEN
    ALTER TABLE public.reviews ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- 3. Self-Healing Data Migration
-- Try to move data from older column names if they exist.
DO $$ BEGIN UPDATE public.reviews SET listing_id = room_id WHERE listing_id IS NULL; EXCEPTION WHEN OTHERS THEN END $$;
DO $$ BEGIN UPDATE public.reviews SET tenant_id = user_id WHERE tenant_id IS NULL; EXCEPTION WHEN OTHERS THEN END $$;
DO $$ BEGIN UPDATE public.reviews SET tenant_id = author_id WHERE tenant_id IS NULL; EXCEPTION WHEN OTHERS THEN END $$;
DO $$ BEGIN UPDATE public.reviews SET comment = content WHERE comment IS NULL; EXCEPTION WHEN OTHERS THEN END $$;

-- 4. Re-enable Row Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reviews are viewable" ON public.reviews;
CREATE POLICY "Public reviews are viewable" ON public.reviews
  FOR SELECT USING (NOT is_hidden);

DROP POLICY IF EXISTS "Tenants can insert own reviews" ON public.reviews;
CREATE POLICY "Tenants can insert own reviews" ON public.reviews
  FOR INSERT WITH CHECK (tenant_id = auth.uid());

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
