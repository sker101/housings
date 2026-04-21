-- 1. Fix room data: Restore amenities and description from old listings table
-- We assume listings_old still exists from the previous migration (recovery.sql 20260421000001)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'listings_old') THEN
    -- Update rooms description and amenities
    UPDATE rooms r
    SET description = l.description,
        amenities = ARRAY(
          SELECT key FROM jsonb_each_text(l.amenities::jsonb) 
          WHERE value = 'true'
        )
    FROM listings_old l
    WHERE r.id = l.id::uuid;
  END IF;
END $$;

-- 2. Update the listings view to handle translation and mapping consistently
create or replace view listings as
select
  r.id as id,
  p.landlord_id as lister_id,
  p.title as title,
  coalesce(r.description, p.description) as description,
  -- Map bedsitter back to bedsit for frontend compatibility
  case when r.room_type = 'bedsitter' then 'bedsit' else r.room_type end as room_type,
  'any' as gender_preference,
  r.price_tzs as price_monthly,
  r.deposit_tzs as security_deposit,
  false as utilities_included,
  r.floor_number as floor,
  1 as total_rooms,
  false as furnished,
  'house' as property_type,
  'Landlord' as owner_name,
  '' as owner_phone,
  '' as whatsapp_number,
  1 as min_lease_months,
  'monthly' as payment_schedule,
  '' as late_fee_policy,
  '' as video_tour_url,
  '' as accessibility_notes,
  p.city as region,
  p.district as district,
  p.ward as ward,
  p.address as street,
  p.latitude as lat,
  p.longitude as lng,
  -- Ensure amenities is returned as a JSON object for frontend mapListingRow
  (
    select jsonb_object_agg(elem, true)
    from unnest(r.amenities) as elem
  )::text as amenities,
  '' as house_rules,
  r.available_from as available_from,
  r.availability_status as vacancy_status,
  case when p.status = 'active' then 'approved' else p.status end as status,
  '' as rejection_reason,
  p.is_featured as featured,
  array[]::text[] as near_universities,
  0 as view_count,
  r.created_at as created_at
from rooms r
join properties p on r.property_id = p.id;

-- 3. Ensure permissions are set
GRANT SELECT ON listings TO anon, authenticated;
GRANT SELECT ON listing_photos TO anon, authenticated;
GRANT SELECT ON rooms TO anon, authenticated;
GRANT SELECT ON properties TO anon, authenticated;
