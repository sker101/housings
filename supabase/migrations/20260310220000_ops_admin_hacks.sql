-- Phase 4: Admin Empowerment - User Suspension & Internal Notes
-- Migration: 20260310220000_ops_admin_hacks.sql

-- 1. Add columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 2. Update is_admin function to exclude suspended admins (safety first)
CREATE OR REPLACE FUNCTION public.is_admin(target_user_id uuid default auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = target_user_id 
      AND role = 'admin'
      AND is_suspended = FALSE
  );
END;
$$;

-- 3. RLS Policy: Prevent suspended users from doing ANYTHING
-- Since we use RLS on almost all tables, we can add a global check.
-- However, for the profiles table specifically:
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_self_or_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = id OR public.is_admin(auth.uid()))
    -- We allow suspended users to SELECT their own profile (to see a "Suspended" message if we add it)
  );

-- For listings, etc., if the user is suspended, they shouldn't be able to insert/update.
-- We can add a centralized check function for convenience.
CREATE OR REPLACE FUNCTION public.check_user_active()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_suspended = TRUE) THEN
    RAISE EXCEPTION 'Your account has been suspended. Please contact support.';
  END IF;
  RETURN TRUE;
END;
$$;

-- 4. Automatically flag a listing when a report is "UPHELD"
CREATE OR REPLACE FUNCTION public.trg_auto_flag_on_report_uphold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'upheld' AND OLD.status <> 'upheld' THEN
    UPDATE public.listings
    SET status = 'flagged',
        updated_at = now()
    WHERE id = NEW.listing_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_flag_on_report_uphold ON public.listing_reports;
CREATE TRIGGER trg_auto_flag_on_report_uphold
  AFTER UPDATE OF status ON public.listing_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auto_flag_on_report_uphold();
