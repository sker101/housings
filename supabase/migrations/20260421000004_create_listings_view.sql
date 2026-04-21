drop table if exists saved_listings cascade;
drop table if exists listing_photos cascade;
drop table if exists reviews cascade;
drop table if exists listings cascade;

-- Recreate listings as a VIEW over properties and rooms
create or replace view listings as
select
  r.id as id,
  p.landlord_id as lister_id,
  p.title as title,
  coalesce(r.description, p.description) as description,
  r.room_type as room_type,
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
  array_to_json(r.amenities)::text as amenities,
  '' as house_rules,
  r.available_from as available_from,
  r.availability_status as vacancy_status,
  p.status as status,
  '' as rejection_reason,
  p.is_featured as featured,
  array[]::text[] as near_universities,
  0 as view_count,
  r.created_at as created_at
from rooms r
join properties p on r.property_id = p.id;

