SET session_replication_role = replica;

DROP TABLE IF EXISTS listings_temp CASCADE;

CREATE TABLE listings_temp ("id" TEXT, "lister_id" TEXT, "title" TEXT, "description" TEXT, "room_type" TEXT, "gender_preference" TEXT, "price_monthly" TEXT, "utilities_included" TEXT, "region" TEXT, "district" TEXT, "ward" TEXT, "street" TEXT, "lat" TEXT, "lng" TEXT, "amenities" TEXT, "house_rules" TEXT, "available_from" TEXT, "vacancy_status" TEXT, "status" TEXT, "rejection_reason" TEXT, "featured" TEXT, "promotion_level" TEXT, "promotion_expires_at" TEXT, "view_count" TEXT, "near_universities" TEXT, "created_at" TEXT, "updated_at" TEXT, "screening_passed" TEXT, "auto_published_at" TEXT, "report_count" TEXT, "upheld_claims_count" TEXT);

INSERT INTO listings_temp ("id", "lister_id", "title", "description", "room_type", "gender_preference", "price_monthly", "utilities_included", "region", "district", "ward", "street", "lat", "lng", "amenities", "house_rules", "available_from", "vacancy_status", "status", "rejection_reason", "featured", "promotion_level", "promotion_expires_at", "view_count", "near_universities", "created_at", "updated_at", "screening_passed", "auto_published_at", "report_count", "upheld_claims_count") VALUES
	('11b5f12d-377f-40dc-8c8a-3fd3203f0550', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'Verified single room near UDSM gate', 'Private single room with reliable water, quiet compound, and easy daladala access to UDSM main campus.', 'single', 'any', 250000, true, 'Dar es Salaam', 'Ubungo', 'Sinza', 'Mlimani Street', -6.784000, 39.205000, '{"wifi": true, "water": true, "parking": false, "security": true, "generator": false, "electricity": true}', 'No loud music after 10PM. Visitors during daytime only.', '2026-03-10', 'available', 'approved', NULL, true, 1, NULL, 42, '{UDSM,ARDHI}', '2026-02-27 16:10:37.029299+00', '2026-03-01 22:04:52.925428+00', NULL, NULL, 2, 0),
	('45dddfdc-e7e2-4b10-bbcf-e5514d5ce0dc', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'Bedsit near Mwenge bus stand', 'Bedsit unit close to transport routes. Needs profile moderation follow-up before approval.', 'bedsit', 'any', 220000, true, 'Dar es Salaam', 'Kinondoni', 'Mwenge', 'Sam Nujoma Road', -6.772700, 39.232600, '{"wifi": false, "water": true, "parking": false, "security": false, "generator": false, "electricity": true}', 'No smoking indoors.', '2026-04-01', 'available', 'approved', NULL, false, 0, NULL, 15, '{UDSM}', '2026-02-27 16:10:37.609733+00', '2026-03-01 22:04:54.439429+00', NULL, NULL, 0, 0),
	('cc13818d-5001-4acc-b952-35fc2f598780', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', 'Shared apartment room in Kinondoni', 'Shared apartment option with furnished common area and strong neighborhood security.', 'shared', 'female', 180000, false, 'Dar es Salaam', 'Kinondoni', 'Makumbusho', 'Kijitonyama Road', -6.766200, 39.241400, '{"wifi": true, "water": true, "parking": true, "security": true, "generator": false, "electricity": true}', 'Female tenants only. One month deposit required.', '2026-03-15', 'coming_soon', 'approved', NULL, false, 0, NULL, 8, '{IFM}', '2026-02-27 16:10:37.329794+00', '2026-03-01 22:04:57.816168+00', NULL, NULL, 0, 0);


-- Map Amenities from JSONB to Array for ALL rooms
with amenity_keys as (
  select l.id::uuid as room_id, array_agg(key) as keys_arr
  from listings_temp l, jsonb_each_text(l.amenities::jsonb) 
  where value = 'true'
  group by l.id
)
update rooms r
set amenities = ak.keys_arr
from amenity_keys ak
where r.id = ak.room_id;

DROP TABLE IF EXISTS listings_temp CASCADE;
