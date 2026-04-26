-- IMPROVE LISTING STATUS VISIBILITY
-- This migration updates the listings view to ensure new rooms are visible as 'pending'
-- and auto-approves listings from verified landlords.

DROP VIEW IF EXISTS public.listings;
CREATE VIEW public.listings AS
SELECT 
  r.id,
  p.id AS property_id,
  p.title,
  COALESCE(r.description, p.description) AS description,
  r.amenities,
  p.city AS region,
  p.neighbourhood AS district,
  p.ward,
  p.address AS street,
  p.latitude AS lat,
  p.longitude AS lng,
  r.price_tzs AS price_monthly,
  r.deposit_tzs AS security_deposit,
  -- Improved Status Logic:
  CASE 
    -- 1. If property is explicitly verified or landlord is verified, it's 'approved'
    WHEN p.verification_status = 'verified' OR ll.identity_verified = true THEN 'approved'
    -- 2. If it's pending, it's 'pending'
    WHEN p.verification_status = 'pending' THEN 'pending'
    -- 3. If it's flagged, it's 'flagged'
    WHEN p.status = 'flagged' THEN 'flagged'
    -- 4. If it's inactive, it's 'removed'
    WHEN p.status = 'inactive' THEN 'removed'
    -- 5. DEFAULT: For everything else (unverified, NULL), mark as 'pending' so it shows up for admin
    ELSE 'pending'
  END AS status,
  r.room_type,
  r.availability_status AS vacancy_status,
  ll.profile_id AS lister_id,
  prof.full_name AS owner_name,
  prof.phone AS owner_phone,
  p.rejection_reason,
  r.created_at,
  p.is_featured AS featured
FROM public.rooms r
JOIN public.properties p ON r.property_id = p.id
LEFT JOIN public.landlords ll ON p.landlord_id = ll.id
LEFT JOIN public.profiles prof ON ll.profile_id = prof.id;

-- Re-apply the insert trigger (as dropping view drops triggers)
DROP TRIGGER IF EXISTS trg_ins_listings ON public.listings;
CREATE TRIGGER trg_ins_listings
INSTEAD OF INSERT ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.trg_insert_listings_view();

-- Ensure permissions
GRANT ALL ON public.listings TO authenticated, anon, service_role;

-- Refresh cache
NOTIFY pgrst, 'reload schema';
