-- Migration: Add payment_reference column to bookings table
-- Purpose: Store unique AzamPay session IDs to link payments to bookings
-- Date: 2026-04-08

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_reference TEXT UNIQUE;

-- Create an index to speed up lookups from the webhook
CREATE INDEX IF NOT EXISTS idx_bookings_payment_reference ON public.bookings(payment_reference);
