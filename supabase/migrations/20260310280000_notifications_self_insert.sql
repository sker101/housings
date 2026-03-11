-- Allow authenticated users to insert their own notifications (for replies/self-messages)
-- Migration: 20260310280000_notifications_self_insert.sql

DROP POLICY IF EXISTS "notifications_insert_self" ON public.notifications;
CREATE POLICY "notifications_insert_self"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
