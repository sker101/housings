-- CREATE ACTIVITY LOG AND ALIASES
-- This migration creates the missing activity tracking table and provides an alias
-- for 'user_activity' to resolve any legacy or cached calls that might be causing 404 errors.

-- 1. Create the primary table
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- References auth.users(id)
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- 3. Create Security Policies
DROP POLICY IF EXISTS "users see own activity" ON public.activity_log;
CREATE POLICY "users see own activity" ON public.activity_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users insert own activity" ON public.activity_log;
CREATE POLICY "users insert own activity" ON public.activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4. Enable Realtime for activity_log
-- This resolves the WebSocket connection errors
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;

-- 5. Create 'user_activity' alias view
-- This resolves any 404 errors from components calling the old table name.
CREATE OR REPLACE VIEW public.user_activity AS 
SELECT * FROM public.activity_log;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
