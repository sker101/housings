-- Migration: Add termination policy fields to listings
-- Allows landlords to specify contract termination rules and refund policy

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS termination_policy  text,
  ADD COLUMN IF NOT EXISTS refund_percent       integer DEFAULT 0
    CHECK (refund_percent >= 0 AND refund_percent <= 100),
  ADD COLUMN IF NOT EXISTS notice_period_days   integer DEFAULT 30;
