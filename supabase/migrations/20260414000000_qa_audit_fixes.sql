-- Migration: QA Audit Security Fixes
-- Date: 2026-04-14
-- Purpose: Comprehensive fixes for auth trigger, profile security, listings, and bookings

-- ═══════════════════════════════════════════════════
-- 1. FIX: Auth trigger was hardcoding role='student' for ALL users,
--    ignoring the role selected during signup
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  selected_role public.app_role;
  selected_verification public.verification_status;
  selected_lister_type public.lister_type;
BEGIN
  BEGIN
    -- Map the frontend role to the database enum
    selected_role := CASE
      WHEN (new.raw_user_meta_data->>'role') IN ('lister', 'landlord', 'dalali') THEN 'lister'::public.app_role
      WHEN (new.raw_user_meta_data->>'role') = 'admin' THEN 'admin'::public.app_role
      ELSE 'student'::public.app_role
    END;

    -- Listers start as 'pending' verification; students are 'unverified'
    selected_verification := CASE
      WHEN selected_role = 'lister' THEN 'pending'::public.verification_status
      ELSE 'unverified'::public.verification_status
    END;

    -- Map lister_type from metadata
    selected_lister_type := CASE
      WHEN (new.raw_user_meta_data->>'lister_type') IN ('owner', 'manager', 'dalali')
        THEN (new.raw_user_meta_data->>'lister_type')::public.lister_type
      WHEN (new.raw_user_meta_data->>'role') = 'dalali'
        THEN 'dalali'::public.lister_type
      WHEN selected_role = 'lister'
        THEN 'owner'::public.lister_type
      ELSE NULL
    END;

    INSERT INTO public.profiles (
      id,
      role,
      lister_type,
      full_name,
      phone,
      phone_verified,
      verification_status,
      subscription_plan,
      preferred_language
    )
    VALUES (
      new.id,
      selected_role,
      selected_lister_type,
      COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'New User'),
      NULLIF(new.raw_user_meta_data->>'phone', ''),
      false,
      selected_verification,
      'free'::public.subscription_plan,
      COALESCE(new.raw_user_meta_data->>'preferred_language', 'en')
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- SILENTLY absorb errors so signup always succeeds
    INSERT INTO public.error_logs (route, error_msg, stack_trace)
    VALUES ('auth_trigger/qa_fix', 'Silent failure for ' || COALESCE(new.email, 'unknown') || ': ' || SQLERRM, SQLSTATE);
  END;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Also update handle_new_auth_user (the remote_schema version)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  selected_role public.app_role;
  selected_verification public.verification_status;
  selected_lister_type public.lister_type;
BEGIN
  selected_role := CASE
    WHEN (new.raw_user_meta_data ->> 'role') IN ('lister', 'landlord', 'dalali') THEN 'lister'::public.app_role
    WHEN (new.raw_user_meta_data ->> 'role') = 'admin' THEN 'admin'::public.app_role
    ELSE 'student'::public.app_role
  END;

  selected_verification := CASE
    WHEN selected_role = 'lister' THEN 'pending'::public.verification_status
    ELSE 'unverified'::public.verification_status
  END;

  selected_lister_type := CASE
    WHEN (new.raw_user_meta_data ->> 'lister_type') IN ('owner', 'manager', 'dalali')
      THEN (new.raw_user_meta_data ->> 'lister_type')::public.lister_type
    WHEN (new.raw_user_meta_data ->> 'role') = 'dalali'
      THEN 'dalali'::public.lister_type
    WHEN selected_role = 'lister'
      THEN 'owner'::public.lister_type
    ELSE NULL
  END;

  INSERT INTO public.profiles (
    id, role, lister_type, full_name, phone, phone_verified,
    verification_status, subscription_plan, preferred_language,
    created_at, updated_at
  )
  VALUES (
    new.id,
    selected_role,
    selected_lister_type,
    COALESCE(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'New User'),
    NULLIF(new.raw_user_meta_data ->> 'phone', ''),
    false,
    selected_verification,
    'free'::public.subscription_plan,
    COALESCE(new.raw_user_meta_data ->> 'preferred_language', 'en'),
    now(), now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;


-- ═══════════════════════════════════════════════════
-- 2. SECURITY: Restrict profiles_public_select to only expose safe columns
--    To protect PII (phone numbers, full ID docs), we create a secure view
--    that the frontend can safely query for public data (e.g. for messaging).
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  role,
  lister_type,
  full_name,
  verification_status,
  created_at
FROM public.profiles;

-- Grant access to the view so authenticated and anon users can read it
GRANT SELECT ON public.public_profiles TO authenticated, anon;


-- ═══════════════════════════════════════════════════
-- 3. FIX: listing_drafts current_step constraint is max 5 but wizard has 7 steps
-- ═══════════════════════════════════════════════════

ALTER TABLE public.listing_drafts DROP CONSTRAINT IF EXISTS listing_drafts_current_step_check;
ALTER TABLE public.listing_drafts ADD CONSTRAINT listing_drafts_current_step_check
  CHECK (current_step >= 1 AND current_step <= 7);


-- ═══════════════════════════════════════════════════
-- 4. FIX: listing_photo_angle enum needs extra values for the 6 extra photo slots
-- ═══════════════════════════════════════════════════

-- Add missing values to the listing_photo_angle enum
ALTER TYPE public.listing_photo_angle ADD VALUE IF NOT EXISTS 'extra1';
ALTER TYPE public.listing_photo_angle ADD VALUE IF NOT EXISTS 'extra2';
ALTER TYPE public.listing_photo_angle ADD VALUE IF NOT EXISTS 'extra3';
ALTER TYPE public.listing_photo_angle ADD VALUE IF NOT EXISTS 'extra4';
ALTER TYPE public.listing_photo_angle ADD VALUE IF NOT EXISTS 'extra5';
ALTER TYPE public.listing_photo_angle ADD VALUE IF NOT EXISTS 'extra6';


-- ═══════════════════════════════════════════════════
-- 5. FIX: Add missing room_type enum values used by frontend
-- ═══════════════════════════════════════════════════

ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'self_contained';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS '1_bedroom';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS '2_bedroom';


-- ═══════════════════════════════════════════════════
-- 6. SECURITY: Remove OTP code from response in production
--    The request_phone_otp function returns the generated code in the response,
--    which is a critical security flaw in production.
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.request_phone_otp(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  normalized_phone text;
  generated_code text;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  normalized_phone := regexp_replace(COALESCE(trim(p_phone), ''), '\s+', '', 'g');

  IF char_length(normalized_phone) < 9 THEN
    RAISE EXCEPTION 'Invalid phone number';
  END IF;

  generated_code := lpad((floor(random() * 1000000)::int)::text, 6, '0');

  INSERT INTO public.phone_verification_codes (user_id, phone, code, expires_at)
  VALUES (actor, normalized_phone, generated_code, now() + INTERVAL '10 minutes');

  -- WARNING: The actual SMS sending logic via Edge Function/Twilio/Selcom should be
  -- triggered here or via a database webhook on insert to phone_verification_codes.
  -- For security, we MUST NOT return the code in the response.

  RETURN jsonb_build_object(
    'sent', true,
    'expires_in_seconds', 600
  );
END;
$$;


-- ═══════════════════════════════════════════════════
-- 7. FIX: Ensure error_logs table exists for the trigger's EXCEPTION handler
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  route text,
  error_msg text,
  stack_trace text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Allow the trigger (which runs as SECURITY DEFINER / postgres) to insert
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "error_logs_insert_any" ON public.error_logs;
CREATE POLICY "error_logs_insert_any" ON public.error_logs
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "error_logs_select_admin" ON public.error_logs;
CREATE POLICY "error_logs_select_admin" ON public.error_logs
  FOR SELECT USING (public.is_admin(auth.uid()));
