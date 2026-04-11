-- Migration: Robust Registration Fix with Internal Logging
-- Date: 2026-04-11

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name text;
  v_role public.app_role;
  v_phone text;
  v_lister_type public.lister_type;
  v_pref_lang text;
  v_status public.verification_status;
BEGIN
  -- 1. Extract values safely from metadata
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'New User');
  
  -- Use a safe cast for role
  BEGIN
    v_role := (new.raw_user_meta_data->>'role')::public.app_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'student'::public.app_role;
  END;

  v_phone := NULLIF(new.raw_user_meta_data->>'phone', '');
  
  -- Handle lister_type
  IF v_role = 'lister' THEN
    BEGIN
      v_lister_type := (new.raw_user_meta_data->>'lister_type')::public.lister_type;
    EXCEPTION WHEN OTHERS THEN
      v_lister_type := 'owner'::public.lister_type;
    END;
    v_status := 'pending'::public.verification_status;
  ELSE
    v_status := 'unverified'::public.verification_status;
  END IF;

  v_pref_lang := COALESCE(new.raw_user_meta_data->>'preferred_language', 'en');

  -- 2. Attempt the insert into profiles
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
      v_full_name,
      v_role,
      v_phone,
      false,
      v_status,
      'free'::public.subscription_plan,
      v_pref_lang,
      v_lister_type
    )
    ON CONFLICT (id) DO NOTHING;
    
  EXCEPTION WHEN OTHERS THEN
    -- 3. LOG THE ERROR INTERNALLY
    -- This table was created in 20260308120000_ops_cron_errors.sql
    INSERT INTO public.error_logs (
      route,
      error_msg,
      stack_trace,
      created_at
    ) VALUES (
      'auth_trigger/handle_new_user',
      'Signup failed for ' || COALESCE(new.email, 'unknown') || ': ' || SQLERRM,
      SQLSTATE || ' | Data: ' || COALESCE(new.raw_user_meta_data::text, '{}'),
      now()
    );
    
    -- Optionally re-raise with the internal error so it shows in the UI (Supabase GoTrue handles this)
    RAISE EXCEPTION 'Database error saving new user: %', SQLERRM;
  END;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Ensure the trigger is attached (it should already be, but let's be sure)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
