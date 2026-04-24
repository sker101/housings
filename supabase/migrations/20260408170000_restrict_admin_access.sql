-- Migration: Restrict Admin Access & Profile Privacy (v3)
-- Date: 2026-04-08

BEGIN;

-- 1. Tighten PROFILES table policies
DROP POLICY IF EXISTS "profiles_public_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read_v1" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_privacy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_privacy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_automation" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;


-- Create strict policies using the correct enum values ('lister', 'student', 'admin')
CREATE POLICY "profiles_select_privacy" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (
    id = auth.uid() 
    OR 
    public.is_admin(auth.uid())
    OR
    (role = 'lister'::app_role AND verification_status = 'verified')
  );

CREATE POLICY "profiles_update_privacy" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "profiles_insert_automation" 
  ON public.profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "profiles_delete_admin_only" 
  ON public.profiles FOR DELETE 
  TO authenticated 
  USING (public.is_admin(auth.uid()));

-- 2. Tighten LISTING REPORTS
DROP POLICY IF EXISTS "Admin can manage all reports" ON public.listing_reports;
DROP POLICY IF EXISTS "Anyone can submit a report" ON public.listing_reports;
DROP POLICY IF EXISTS "Reporter can read own reports" ON public.listing_reports;
DROP POLICY IF EXISTS "listing_reports_admin_access" ON public.listing_reports;
DROP POLICY IF EXISTS "listing_reports_insert_authenticated" ON public.listing_reports;

CREATE POLICY "listing_reports_admin_access"
  ON public.listing_reports FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()) OR reporter_id = auth.uid());

CREATE POLICY "listing_reports_insert_authenticated"
  ON public.listing_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- 3. Tighten CLAIMS
DROP POLICY IF EXISTS "Admin can manage all claims" ON public.campuscover_claims;
DROP POLICY IF EXISTS "Tenant can submit and read own claims" ON public.campuscover_claims;
DROP POLICY IF EXISTS "campuscover_claims_access" ON public.campuscover_claims;
DROP POLICY IF EXISTS "campuscover_claims_insert_tenant" ON public.campuscover_claims;

CREATE POLICY "campuscover_claims_access"
  ON public.campuscover_claims FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()) OR tenant_id = auth.uid());

CREATE POLICY "campuscover_claims_insert_tenant"
  ON public.campuscover_claims FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = auth.uid());

-- 4. Consolidate profiles columns
UPDATE public.profiles 
SET is_suspended = COALESCE(is_suspended, suspended, false)
WHERE is_suspended IS NULL OR suspended IS NOT NULL;

UPDATE public.profiles 
SET id_document_url = COALESCE(id_document_url, id_doc_url, id_document_url)
WHERE id_document_url IS NULL AND id_doc_url IS NOT NULL;

-- 5. Role Enforcement
UPDATE public.profiles 
SET role = 'student'::app_role 
WHERE role = 'admin'::app_role
  AND id NOT IN (SELECT id FROM auth.users WHERE email = 'admin@campusstay.co');

COMMIT;
