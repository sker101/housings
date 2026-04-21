-- Add missing columns to listings view
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
  r.price_tzs AS price_monthly,
  r.deposit_tzs AS deposit,
  CASE 
    WHEN p.verification_status = 'verified' THEN 'approved'
    WHEN p.verification_status = 'pending' THEN 'pending'
    WHEN p.status = 'flagged' THEN 'flagged'
    WHEN p.status = 'inactive' THEN 'removed'
    ELSE 'rejected'
  END AS status,
  r.room_type,
  COALESCE(ll.profile_id, pm.profile_id) AS lister_id,
  p.rejection_reason,
  r.created_at,
  0 AS views,
  'apartment'::text AS property_type,
  p.latitude,
  p.longitude,
  r.max_occupants,
  r.room_number
FROM public.rooms r
JOIN public.properties p ON r.property_id = p.id
LEFT JOIN public.landlords ll ON p.landlord_id = ll.id
LEFT JOIN public.property_managers pm ON p.manager_id = pm.id;

-- Ensure accessibility
GRANT SELECT ON public.listings TO anon, authenticated, service_role;
