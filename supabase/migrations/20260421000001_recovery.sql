SET session_replication_role = replica;


create table if not exists room_inquiries (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  status text default 'open' check (status in ('open','negotiating','accepted','declined')),
  last_message text,
  created_at timestamptz default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references room_inquiries(id) on delete cascade,
  sender_id uuid references profiles(id),
  body text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);


DROP TABLE IF EXISTS profiles_old CASCADE;

CREATE TABLE profiles_old ("id" TEXT, "role" TEXT, "lister_type" TEXT, "full_name" TEXT, "phone" TEXT, "phone_verified" TEXT, "university" TEXT, "profile_photo_url" TEXT, "id_doc_url" TEXT, "selfie_url" TEXT, "verification_status" TEXT, "subscription_plan" TEXT, "commission_rate_pct" TEXT, "payout_provider" TEXT, "payout_reference" TEXT, "created_at" TEXT, "updated_at" TEXT, "takedown_count" TEXT, "avg_rating" TEXT, "trusted_host" TEXT, "is_suspended" TEXT, "suspension_reason" TEXT, "preferred_language" TEXT, "admin_notes" TEXT);

DROP TABLE IF EXISTS listings_old CASCADE;

CREATE TABLE listings_old ("id" TEXT, "lister_id" TEXT, "title" TEXT, "description" TEXT, "room_type" TEXT, "gender_preference" TEXT, "price_monthly" TEXT, "utilities_included" TEXT, "region" TEXT, "district" TEXT, "ward" TEXT, "street" TEXT, "lat" TEXT, "lng" TEXT, "amenities" TEXT, "house_rules" TEXT, "available_from" TEXT, "vacancy_status" TEXT, "status" TEXT, "rejection_reason" TEXT, "featured" TEXT, "promotion_level" TEXT, "promotion_expires_at" TEXT, "view_count" TEXT, "near_universities" TEXT, "created_at" TEXT, "updated_at" TEXT, "screening_passed" TEXT, "auto_published_at" TEXT, "report_count" TEXT, "upheld_claims_count" TEXT);

DROP TABLE IF EXISTS conversations_old CASCADE;

CREATE TABLE conversations_old ("id" TEXT, "listing_id" TEXT, "tenant_id" TEXT, "lister_id" TEXT, "inquiry_status" TEXT, "move_in_date" TEXT, "last_message_at" TEXT, "created_at" TEXT, "updated_at" TEXT);

DROP TABLE IF EXISTS listing_photos_old CASCADE;

CREATE TABLE listing_photos_old ("id" TEXT, "listing_id" TEXT, "angle" TEXT, "storage_path" TEXT, "public_url" TEXT, "ai_verified" TEXT, "ai_confidence" TEXT, "created_at" TEXT, "updated_at" TEXT);

DROP TABLE IF EXISTS messages_old CASCADE;

CREATE TABLE messages_old ("id" TEXT, "conversation_id" TEXT, "sender_id" TEXT, "body" TEXT, "seen_at" TEXT, "created_at" TEXT);

DROP TABLE IF EXISTS reviews_old CASCADE;

CREATE TABLE reviews_old ("id" TEXT, "listing_id" TEXT, "tenant_id" TEXT, "rating" TEXT, "comment" TEXT, "is_hidden" TEXT, "created_at" TEXT, "updated_at" TEXT, "rating_accuracy" TEXT, "rating_cleanliness" TEXT, "rating_communication" TEXT, "rating_location" TEXT, "rating_value" TEXT, "rating_safety" TEXT, "landlord_reply" TEXT, "is_removed" TEXT, "removal_reason" TEXT, "body" TEXT);

DROP TABLE IF EXISTS saved_listings_old CASCADE;

CREATE TABLE saved_listings_old ("tenant_id" TEXT, "listing_id" TEXT, "saved_at" TEXT);

INSERT INTO profiles_old ("id", "role", "lister_type", "full_name", "phone", "phone_verified", "university", "profile_photo_url", "id_doc_url", "selfie_url", "verification_status", "subscription_plan", "commission_rate_pct", "payout_provider", "payout_reference", "created_at", "updated_at", "takedown_count", "avg_rating", "trusted_host", "is_suspended", "suspension_reason", "preferred_language", "admin_notes") VALUES

	('af97c808-a291-439c-8e72-81d427d55d2a', 'student', NULL, 'Neema Student', '+255700000201', true, 'UDSM', NULL, NULL, NULL, 'verified', 'free', NULL, NULL, NULL, '2026-02-27 16:10:36.47874+00', '2026-02-27 16:10:36.47874+00', 0, NULL, false, false, NULL, 'en', NULL),

	('a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', 'student', NULL, 'Juma Student', '+255700000202', true, 'IFM', NULL, NULL, NULL, 'verified', 'free', NULL, NULL, NULL, '2026-02-27 16:10:36.750564+00', '2026-02-27 16:10:36.750564+00', 0, NULL, false, false, NULL, 'en', NULL),

	('2aee506c-e263-478a-bcef-f3cc999a69b9', 'lister', 'owner', 'Asha Owner', '+255700000101', true, NULL, NULL, NULL, NULL, 'verified', 'verified', NULL, 'mpesa', '255700000101', '2026-02-27 16:10:35.911159+00', '2026-03-11 16:19:52.637864+00', 0, NULL, false, false, NULL, 'en', NULL),

	('e77965c7-7e4c-4ade-ba52-19472cd7d647', 'lister', 'manager', 'Baraka Manager', '+255700000102', true, NULL, NULL, NULL, NULL, 'verified', 'free', NULL, NULL, NULL, '2026-02-27 16:10:36.203972+00', '2026-03-11 16:19:53.178273+00', 0, NULL, false, false, NULL, 'en', NULL),

	('552fc1cf-4aae-4a00-be58-d3ab999f551c', 'admin', NULL, 'CampusStay Admin', '+255700000001', true, NULL, NULL, NULL, NULL, 'verified', 'premium', NULL, NULL, NULL, '2026-02-27 16:10:35.606465+00', '2026-03-12 01:01:53.422207+00', 0, NULL, false, false, NULL, 'sw', NULL);

INSERT INTO listings_old ("id", "lister_id", "title", "description", "room_type", "gender_preference", "price_monthly", "utilities_included", "region", "district", "ward", "street", "lat", "lng", "amenities", "house_rules", "available_from", "vacancy_status", "status", "rejection_reason", "featured", "promotion_level", "promotion_expires_at", "view_count", "near_universities", "created_at", "updated_at", "screening_passed", "auto_published_at", "report_count", "upheld_claims_count") VALUES

	('11b5f12d-377f-40dc-8c8a-3fd3203f0550', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'Verified single room near UDSM gate', 'Private single room with reliable water, quiet compound, and easy daladala access to UDSM main campus.', 'single', 'any', 250000, true, 'Dar es Salaam', 'Ubungo', 'Sinza', 'Mlimani Street', -6.784000, 39.205000, '{"wifi": true, "water": true, "parking": false, "security": true, "generator": false, "electricity": true}', 'No loud music after 10PM. Visitors during daytime only.', '2026-03-10', 'available', 'approved', NULL, true, 1, NULL, 42, '{UDSM,ARDHI}', '2026-02-27 16:10:37.029299+00', '2026-03-01 22:04:52.925428+00', NULL, NULL, 2, 0),

	('45dddfdc-e7e2-4b10-bbcf-e5514d5ce0dc', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'Bedsit near Mwenge bus stand', 'Bedsit unit close to transport routes. Needs profile moderation follow-up before approval.', 'bedsit', 'any', 220000, true, 'Dar es Salaam', 'Kinondoni', 'Mwenge', 'Sam Nujoma Road', -6.772700, 39.232600, '{"wifi": false, "water": true, "parking": false, "security": false, "generator": false, "electricity": true}', 'No smoking indoors.', '2026-04-01', 'available', 'approved', NULL, false, 0, NULL, 15, '{UDSM}', '2026-02-27 16:10:37.609733+00', '2026-03-01 22:04:54.439429+00', NULL, NULL, 0, 0),

	('cc13818d-5001-4acc-b952-35fc2f598780', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', 'Shared apartment room in Kinondoni', 'Shared apartment option with furnished common area and strong neighborhood security.', 'shared', 'female', 180000, false, 'Dar es Salaam', 'Kinondoni', 'Makumbusho', 'Kijitonyama Road', -6.766200, 39.241400, '{"wifi": true, "water": true, "parking": true, "security": true, "generator": false, "electricity": true}', 'Female tenants only. One month deposit required.', '2026-03-15', 'coming_soon', 'approved', NULL, false, 0, NULL, 8, '{IFM}', '2026-02-27 16:10:37.329794+00', '2026-03-01 22:04:57.816168+00', NULL, NULL, 0, 0);

INSERT INTO conversations_old ("id", "listing_id", "tenant_id", "lister_id", "inquiry_status", "move_in_date", "last_message_at", "created_at", "updated_at") VALUES

	('92447701-9976-4c88-bf14-46d71db54868', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'open', '2026-03-01', '2026-02-27 16:18:22.826+00', '2026-02-27 16:18:22.392061+00', '2026-02-27 16:18:23.074528+00'),

	('54860a3d-4a85-42c9-b3ba-acf5427af104', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', 'af97c808-a291-439c-8e72-81d427d55d2a', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'interested', '2026-03-20', '2026-03-01 11:01:12.679664+00', '2026-02-27 16:10:39.38649+00', '2026-03-01 11:01:12.679664+00'),

	('decd1a02-f2c4-4101-b2f5-7c3a4958a573', 'cc13818d-5001-4acc-b952-35fc2f598780', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', 'open', '2026-03-30', '2026-02-27 16:10:40.904031+00', '2026-02-27 16:10:39.665045+00', '2026-03-08 18:42:52.833212+00'),

	('9b40a157-6325-4e70-bfd0-b3e00f349ae4', '45dddfdc-e7e2-4b10-bbcf-e5514d5ce0dc', '552fc1cf-4aae-4a00-be58-d3ab999f551c', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'open', NULL, '2026-03-11 16:24:20.664896+00', '2026-03-01 21:41:02.942665+00', '2026-03-11 16:24:20.664896+00');

INSERT INTO listing_photos_old ("id", "listing_id", "angle", "storage_path", "public_url", "ai_verified", "ai_confidence", "created_at", "updated_at") VALUES

	('3a864c09-1342-4fa4-91eb-96e619c37b6e', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', 'bedroom', 'seed/11b5f12d-377f-40dc-8c8a-3fd3203f0550/bedroom.jpg', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80', true, 0.9300, '2026-02-27 16:10:38.044381+00', '2026-02-27 16:10:38.044381+00'),

	('a9a59126-8678-4d61-9c73-13d9e1e333fb', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', 'kitchen', 'seed/11b5f12d-377f-40dc-8c8a-3fd3203f0550/kitchen.jpg', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80', true, 0.9000, '2026-02-27 16:10:38.352091+00', '2026-02-27 16:10:38.352091+00'),

	('d50f8a98-78c6-4862-bd21-e462c83fad89', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', 'bathroom', 'seed/11b5f12d-377f-40dc-8c8a-3fd3203f0550/bathroom.jpg', 'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&w=1200&q=80', true, 0.8800, '2026-02-27 16:10:38.631687+00', '2026-02-27 16:10:38.631687+00'),

	('01b4da73-9221-4d2c-8063-51a5deb36fa0', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', 'outside', 'seed/11b5f12d-377f-40dc-8c8a-3fd3203f0550/outside.jpg', 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=80', true, 0.9100, '2026-02-27 16:10:39.05508+00', '2026-02-27 16:10:39.05508+00');

INSERT INTO messages_old ("id", "conversation_id", "sender_id", "body", "seen_at", "created_at") VALUES

	('91f58ea8-e727-4f6a-9880-bc68e6a31e04', '54860a3d-4a85-42c9-b3ba-acf5427af104', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'Yes, it is available. You can schedule a visit this weekend.', '2026-03-01 10:52:37.924+00', '2026-02-27 16:10:40.274666+00'),

	('03d2305d-2b9d-4187-a413-4a3748d40677', '54860a3d-4a85-42c9-b3ba-acf5427af104', 'af97c808-a291-439c-8e72-81d427d55d2a', 'Hi, is this room still available for March move-in?', '2026-03-01 10:54:15.726+00', '2026-02-27 16:10:39.990674+00'),

	('a6df83f8-6798-4fba-bb68-ad8fa63c1a25', '54860a3d-4a85-42c9-b3ba-acf5427af104', 'af97c808-a291-439c-8e72-81d427d55d2a', 'how do i reach there', '2026-03-01 10:54:15.726+00', '2026-03-01 10:53:01.601512+00'),

	('bcadf242-8829-4492-a5a8-87c377b77143', '92447701-9976-4c88-bf14-46d71db54868', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', 's;kcmba;dfkmvaDKM', '2026-03-01 10:54:39.975+00', '2026-02-27 16:18:22.692855+00'),

	('139a65a6-cddb-4cc8-b701-3a9a2e681b12', '54860a3d-4a85-42c9-b3ba-acf5427af104', 'af97c808-a291-439c-8e72-81d427d55d2a', 'pitia mikochenii', '2026-03-01 11:01:20.961+00', '2026-03-01 11:01:12.679664+00'),

	('d2b2497f-a2aa-4a9d-920b-799cf56dd1f4', '9b40a157-6325-4e70-bfd0-b3e00f349ae4', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'whats wrong with your room', '2026-03-01 21:42:46.491+00', '2026-03-01 21:41:24.55906+00'),

	('7ba04f4e-3527-4531-8b39-f7f8ef321c3e', 'decd1a02-f2c4-4101-b2f5-7c3a4958a573', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', 'Can you share updated photos of the common areas?', '2026-03-01 21:54:14.738+00', '2026-02-27 16:10:40.628754+00'),

	('767f0533-5c1b-4a36-9bcb-e239fa8ed7d8', '9b40a157-6325-4e70-bfd0-b3e00f349ae4', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'i will solve boss', '2026-03-01 21:56:53.648+00', '2026-03-01 21:56:10.897637+00'),

	('032fcf07-18f8-4c2d-bc95-a6fc2a78ca30', 'decd1a02-f2c4-4101-b2f5-7c3a4958a573', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', 'Sure, I will upload them this evening.', '2026-03-11 02:48:24.825+00', '2026-02-27 16:10:40.904031+00'),

	('2bfdd875-ea8f-46df-b293-8a40a34cf9f3', '9b40a157-6325-4e70-bfd0-b3e00f349ae4', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'have you fixed?', '2026-03-11 16:24:21.252+00', '2026-03-11 16:24:20.664896+00');

INSERT INTO reviews_old ("id", "listing_id", "tenant_id", "rating", "comment", "is_hidden", "created_at", "updated_at", "rating_accuracy", "rating_cleanliness", "rating_communication", "rating_location", "rating_value", "rating_safety", "landlord_reply", "is_removed", "removal_reason", "body") VALUES

	('fae15fba-763b-4be7-b9ee-febef8e8e7f1', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', 4, 'nice room', false, '2026-03-01 10:18:52.64887+00', '2026-03-01 10:18:52.64887+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL);

INSERT INTO saved_listings_old ("tenant_id", "listing_id", "saved_at") VALUES

	('af97c808-a291-439c-8e72-81d427d55d2a', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', '2026-02-27 19:25:34.042603+00'),

	('e77965c7-7e4c-4ade-ba52-19472cd7d647', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', '2026-02-27 20:07:04.172921+00');


-- 1. PROFILES
INSERT INTO profiles (id, role, full_name, phone, avatar_url, is_verified, is_suspended, created_at)
SELECT 
  id::uuid, 
  CASE WHEN role = 'student' THEN 'tenant' WHEN role = 'lister' THEN 'landlord' ELSE role END,
  full_name, 
  phone, 
  profile_photo_url, 
  (verification_status = 'verified'), 
  (is_suspended = 'true'), 
  created_at::timestamptz
FROM profiles_old
ON CONFLICT (id) DO NOTHING;

-- 2. TENANTS
INSERT INTO tenants (profile_id, tenant_type, employer_or_institution, verification_status, id_document_url)
SELECT 
  id::uuid, 
  'student', 
  university, 
  verification_status,
  id_doc_url
FROM profiles_old
WHERE role = 'student'
ON CONFLICT (profile_id) DO NOTHING;

-- 3. LANDLORDS
INSERT INTO landlords (profile_id, identity_verified, trusted_host, created_at)
SELECT 
  id::uuid, 
  (verification_status = 'verified'), 
  (trusted_host = 'true'), 
  created_at::timestamptz
FROM profiles_old
WHERE role = 'lister'
ON CONFLICT (profile_id) DO NOTHING;

-- 4. PROPERTIES
INSERT INTO properties (landlord_id, title, description, address, neighbourhood, city, latitude, longitude, status, verification_status, created_at)
SELECT 
  (SELECT id FROM landlords WHERE profile_id = l.lister_id::uuid),
  title, 
  description, 
  COALESCE(street, ''), 
  ward, 
  region, 
  COALESCE(NULLIF(lat, ''), '0')::numeric, 
  COALESCE(NULLIF(lng, ''), '0')::numeric, 
  CASE WHEN status = 'approved' THEN 'active' ELSE 'inactive' END,
  CASE WHEN status = 'approved' THEN 'verified' ELSE 'unverified' END,
  created_at::timestamptz
FROM listings_old l;

-- 5. ROOMS
INSERT INTO rooms (id, property_id, room_type, price_tzs, availability_status, is_available, created_at)
SELECT 
  l.id::uuid,
  (SELECT id FROM properties WHERE title = l.title AND created_at = l.created_at::timestamptz LIMIT 1),
  CASE 
    WHEN room_type = 'bedsit' THEN 'bedsitter' 
    WHEN room_type = 'self_contained' THEN 'self_contained'
    WHEN room_type NOT IN ('single','double','self_contained','shared','bedsitter') THEN 'single'
    ELSE room_type 
  END,
  COALESCE(NULLIF(price_monthly, ''), '0')::int,
  CASE 
    WHEN vacancy_status = 'coming_soon' THEN 'available_soon' 
    ELSE vacancy_status 
  END,
  (vacancy_status = 'available'),
  created_at::timestamptz
FROM listings_old l;

-- 6. PHOTOS
INSERT INTO room_photos (room_id, photo_url, is_cover)
SELECT 
  listing_id::uuid, 
  public_url, 
  (angle = 'outside')
FROM listing_photos_old;

-- 7. REVIEWS (with fallback for missing property_id)
INSERT INTO reviews (reviewer_id, reviewer_role, property_id, rating, body, created_at)
SELECT 
  tenant_id::uuid, 
  'tenant',
  COALESCE((SELECT property_id FROM rooms WHERE id = r.listing_id::uuid), (SELECT id FROM properties LIMIT 1)), 
  rating::int, 
  comment, 
  created_at::timestamptz
FROM reviews_old r;

-- 8. INQUIRIES
INSERT INTO room_inquiries (id, room_id, tenant_id, status, created_at)
SELECT 
  id::uuid, 
  listing_id::uuid, 
  (SELECT id FROM tenants WHERE profile_id = c.tenant_id::uuid),
  CASE WHEN inquiry_status = 'interested' THEN 'open' ELSE inquiry_status END,
  created_at::timestamptz
FROM conversations_old c;

-- 9. MESSAGES
INSERT INTO chat_messages (id, inquiry_id, sender_id, body, created_at)
SELECT 
  id::uuid, 
  conversation_id::uuid, 
  sender_id::uuid, 
  body, 
  created_at::timestamptz
FROM messages_old;

-- RLS Enforcement for missing tables
alter table room_inquiries enable row level security;
alter table chat_messages enable row level security;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin bypass room_inquiries') THEN
    create policy "admin bypass room_inquiries" on room_inquiries for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin bypass chat_messages') THEN
    create policy "admin bypass chat_messages" on chat_messages for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
  END IF;
END $$;

-- CLEANUP
DROP TABLE IF EXISTS profiles_old CASCADE;
DROP TABLE IF EXISTS listings_old CASCADE;
DROP TABLE IF EXISTS conversations_old CASCADE;
DROP TABLE IF EXISTS listing_photos_old CASCADE;
DROP TABLE IF EXISTS messages_old CASCADE;
DROP TABLE IF EXISTS reviews_old CASCADE;
DROP TABLE IF EXISTS saved_listings_old CASCADE;
