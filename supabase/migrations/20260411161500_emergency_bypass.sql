-- Migration: Emergency Passive Registration Trigger
-- Date: 2026-04-11
-- Purpose: Ensures user creation NEVER fails due to profile insertion errors.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- We wrap EVERYTHING in an exception absorber.
  -- This is a temporary diagnostic bypass to get users registered.
  BEGIN
    INSERT INTO public.profiles (
      id,
      full_name,
      role,
      phone,
      phone_verified,
      verification_status,
      subscription_plan,
      preferred_language,
      lister_type
    )
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'New User'),
      COALESCE((new.raw_user_meta_data->>'role')::public.app_role, 'student'::public.app_role),
      NULLIF(new.raw_user_meta_data->>'phone', ''),
      false,
      CASE 
        WHEN (new.raw_user_meta_data->>'role') = 'lister' THEN 'pending'::public.verification_status
        ELSE 'unverified'::public.verification_status
      END,
      'free'::public.subscription_plan,
      COALESCE(new.raw_user_meta_data->>'preferred_language', 'en'),
      (new.raw_user_meta_data->>'lister_type')::public.lister_type
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- SILENTLY absorbe errors so signup succeeds
    -- We can check public.error_logs later
    INSERT INTO public.error_logs (route, error_msg, stack_trace)
    VALUES ('auth_trigger/bypass', 'Silent failure for ' || COALESCE(new.email, 'unknown') || ': ' || SQLERRM, SQLSTATE);
  END;

  -- MANDATORY: Always return new to allow auth.users insertion to proceed
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
