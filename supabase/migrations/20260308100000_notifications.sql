-- Phase 2: In-app notifications system
-- Migration: 20260308100000_notifications.sql

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text NOT NULL, -- 'booking_approved' | 'booking_declined' | 'report_upheld' | 'message' | 'system'
  title       text NOT NULL,
  body        text,
  link        text, -- relative URL to navigate to when clicked
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id, created_at DESC);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Only service role / triggers can insert
CREATE POLICY "notifications_insert_service"
  ON public.notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Function to push a notification (called from triggers)
CREATE OR REPLACE FUNCTION public.push_notification(
  p_user_id   uuid,
  p_type      text,
  p_title     text,
  p_body      text DEFAULT NULL,
  p_link      text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (p_user_id, p_type, p_title, p_body, p_link);
END;
$$;

-- Trigger: notify lister when a booking is made
CREATE OR REPLACE FUNCTION public.trg_notify_booking_requested()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'requested' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'requested') THEN
    PERFORM push_notification(
      NEW.lister_id,
      'booking_requested',
      'New Booking Request',
      'A tenant has requested to book one of your listings.',
      '/landlord'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_requested ON public.bookings;
CREATE TRIGGER trg_notify_booking_requested
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_booking_requested();

-- Trigger: notify tenant when booking is approved or declined
CREATE OR REPLACE FUNCTION public.trg_notify_booking_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    PERFORM push_notification(
      NEW.tenant_id,
      'booking_approved',
      'Booking Approved! 🎉',
      'Your booking request has been approved by the landlord.',
      '/profile'
    );
  ELSIF NEW.status = 'declined' AND OLD.status IS DISTINCT FROM 'declined' THEN
    PERFORM push_notification(
      NEW.tenant_id,
      'booking_declined',
      'Booking Declined',
      'Unfortunately your booking request was declined. You can still browse other listings.',
      '/search'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_booking_decision ON public.bookings;
CREATE TRIGGER trg_notify_booking_decision
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_booking_decision();

-- Trigger: notify lister when their listing is flagged/approved/rejected
CREATE OR REPLACE FUNCTION public.trg_notify_listing_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM push_notification(
        NEW.lister_id,
        'listing_approved',
        'Listing Approved ✅',
        format('Your listing "%s" has been approved and is now live.', NEW.title),
        format('/rooms/%s', NEW.id)
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM push_notification(
        NEW.lister_id,
        'listing_rejected',
        'Listing Rejected',
        format('Your listing "%s" was rejected. Reason: %s', NEW.title, COALESCE(NEW.rejection_reason, 'See dashboard for details.')),
        format('/list-property?edit=%s', NEW.id)
      );
    ELSIF NEW.status = 'flagged' THEN
      PERFORM push_notification(
        NEW.lister_id,
        'listing_flagged',
        'Listing Flagged ⚠️',
        format('Your listing "%s" has been flagged for review. Please check your dashboard.', NEW.title),
        '/landlord'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_listing_status ON public.listings;
CREATE TRIGGER trg_notify_listing_status
  AFTER UPDATE OF status ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_listing_status();

-- Enable realtime for notifications table
ALTER publication supabase_realtime ADD TABLE public.notifications;
