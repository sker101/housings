-- Migration: Emergency Booking Repair (Force Unlock)
-- Purpose: Manually approve the booking for user c41b8363 to bypass AzamPay sync delays.
-- Date: 2026-04-08

BEGIN;

-- 1. Create Webhook Logs table (if not exists) for future debugging
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    payload jsonb,
    created_at timestamptz DEFAULT now(),
    status text
);

-- 2. FORCE APPROVE for current user (matched by partial ID string)
-- We use a subquery to find the real UUID from the auth.users or profiles table
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    SELECT id INTO target_user_id FROM public.profiles WHERE id::text LIKE 'c41b8363%' LIMIT 1;
    
    IF target_user_id IS NOT NULL THEN
        -- Approve the booking
        UPDATE public.bookings
        SET status = 'approved'
        WHERE tenant_id = target_user_id
          AND status = 'requested';
          
        -- Mark associated listings as occupied
        UPDATE public.listings
        SET vacancy_status = 'occupied'
        WHERE id IN (
            SELECT listing_id FROM public.bookings 
            WHERE tenant_id = target_user_id AND status = 'approved'
        );
        
        RAISE NOTICE 'Emergency Unlock successful for User %', target_user_id;
    ELSE
        RAISE WARNING 'User starting with c41b8363 not found in profiles.';
    END IF;
END $$;

-- 3. SECURITY ENFORCEMENT: Ensure student.one is a student
UPDATE public.profiles
SET role = 'student'
WHERE id IN (SELECT id FROM auth.users WHERE email = 'student.one@campusstay.co');

COMMIT;
