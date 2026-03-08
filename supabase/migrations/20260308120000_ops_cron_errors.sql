-- Phase 3: DB Operations & Scale (Cleanup Cron + Error Logs)
-- Migration: 20260308120000_ops_cron_errors.sql

-- 1. Global Error Tracking Table
CREATE TABLE IF NOT EXISTS public.error_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- optional
  route       text,
  error_msg   text NOT NULL,
  stack_trace text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: Service role can insert/read, authenticated users can insert their own errors anonymously
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable insert for all" ON public.error_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable view for admins only" ON public.error_logs FOR SELECT TO service_role USING (true);

-- 2. Cron Cleanup Agent (pg_cron)
-- This requires the pg_cron extension. Supabase enables it in the 'extensions' schema by default.

CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA extensions;

-- Create helper function to identify and purge dead data
CREATE OR REPLACE FUNCTION public.execute_system_cleanup()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- 1. Delete orphaned listing drafts older than 14 days
  DELETE FROM public.listing_drafts 
  WHERE updated_at < now() - interval '14 days';

  -- 2. Delete expired phone verification codes (older than 1 hour)
  DELETE FROM public.phone_verification_codes 
  WHERE created_at < now() - interval '1 hour';
  
  -- 3. Delete unverified profiles older than 7 days (students only, listers require manual review)
  DELETE FROM public.profiles 
  WHERE role = 'student' 
    AND phone_verified = false 
    AND created_at < now() - interval '7 days';
END;
$$;

-- Schedule the cleanup to run every day at 3 AM EAT (00:00 UTC)
-- Note: Requires superuser config to deploy directly on some Postgres setups, 
-- but on Supabase you can execute this as the postgres role.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('daily_system_cleanup', '0 0 * * *', 'SELECT public.execute_system_cleanup()');
  END IF;
END $$;
