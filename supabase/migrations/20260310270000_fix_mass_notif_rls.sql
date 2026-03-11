-- Fix Mass Notification: EXECUTE grant + notifications INSERT policy
-- Migration: 20260310270000_fix_mass_notif_rls.sql

-- 1. Allow admins to insert notifications (needed because SECURITY DEFINER
--    RPCs called via the REST API still need RLS to allow the underlying INSERT)
DROP POLICY IF EXISTS "notifications_insert_admin" ON public.notifications;
CREATE POLICY "notifications_insert_admin"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- 2. Grant EXECUTE on both notification helpers to authenticated users
GRANT EXECUTE ON FUNCTION public.send_mass_notification(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.push_notification(uuid, text, text, text, text) TO authenticated;
