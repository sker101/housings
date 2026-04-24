-- 1. Merge system_settings into system_config
-- Ensure maintenance_mode and global_announcement are preserved
INSERT INTO public.system_config (key, value)
SELECT key, value FROM public.system_settings
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DROP TABLE IF EXISTS public.system_settings CASCADE;

-- 2. Consolidate Messaging
-- room_inquiries and chat_messages are the active tables with data.
-- We use CASCADE to drop dependent objects like foreign keys or views.
DROP TABLE IF EXISTS public.messages CASCADE;
DROP VIEW IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

-- 3. Drop truly duplicate/unused tables
DROP TABLE IF EXISTS public.pre_bookings CASCADE;
DROP TABLE IF EXISTS public.room_referrals CASCADE;

-- 4. Clean up unused/legacy infrastructure tables (0 rows and not used in code)
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.webhook_logs CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.property_managers CASCADE;
DROP TABLE IF EXISTS public.manager_landlord_auth CASCADE;
DROP TABLE IF EXISTS public.phone_verification_codes CASCADE;

-- 5. Keep structural and future-ready tables
-- We keep: profiles, tenants, landlords, properties, rooms, bookings, payment_records, payments,
-- reviews, saved_listings, listing_reports, listing_drafts, listing_checks,
-- notifications, disputes, content_flags, campuscover_claims, referrals, banned_phones.
