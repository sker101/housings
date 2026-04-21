-- Comprehensive listings view for all detail page requirements
DROP VIEW IF EXISTS public.listings;

CREATE VIEW public.listings AS
SELECT 
  r.id,
  p.id AS property_id,
  p.title,
  COALESCE(r.description, p.description) AS description,
  r.amenities,
  p.city AS region,
  COALESCE(p.district, p.neighbourhood) AS district,
  p.ward,
  p.address AS street,
  p.latitude AS lat,
  p.longitude AS lng,
  r.price_tzs AS price_monthly,
  r.deposit_tzs AS security_deposit,
  r.deposit_tzs AS deposit, -- alias for security_deposit
  CASE 
    WHEN p.verification_status = 'verified' THEN 'approved'
    WHEN p.verification_status = 'pending' THEN 'pending'
    WHEN p.status = 'flagged' THEN 'flagged'
    WHEN p.status = 'inactive' THEN 'removed'
    ELSE 'rejected'
  END AS status,
  r.room_type,
  r.room_number,
  r.floor_number AS floor,
  r.max_occupants,
  r.availability_status AS vacancy_status,
  COALESCE(ll.profile_id, pm.profile_id) AS lister_id,
  lister_prof.full_name AS owner_name,
  lister_prof.phone AS owner_phone,
  lister_prof.phone AS whatsapp_number,
  p.rejection_reason,
  r.available_from,
  r.is_available,
  r.created_at,
  0 AS view_count,
  0 AS views,    -- alias for frontend
  p.is_featured AS featured,
  'apartment'::text AS property_type,
  -- Fallback columns to prevent frontend errors
  'mixed'::text AS gender_preference,
  true AS utilities_included,
  1 AS total_rooms,
  false AS furnished,
  1 AS min_lease_months,
  'monthly'::text AS payment_schedule,
  NULL::text AS late_fee_policy,
  NULL::text AS video_tour_url,
  NULL::text AS accessibility_notes,
  NULL::text AS house_rules,
  ARRAY[]::text[] AS near_universities
FROM public.rooms r
JOIN public.properties p ON r.property_id = p.id
LEFT JOIN public.landlords ll ON p.landlord_id = ll.id
LEFT JOIN public.property_managers pm ON p.manager_id = pm.id
LEFT JOIN public.profiles lister_prof ON COALESCE(ll.profile_id, pm.profile_id) = lister_prof.id;

-- Ensure accessibility
GRANT SELECT ON public.listings TO anon, authenticated, service_role;
