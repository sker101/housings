-- 20260525142100_coming_soon_availability_transition.sql
-- Transition rooms/listings dynamically in views and physically in scheduled cleanups when availability date arrives.

-- 1. Redefine execution cleanup function to physically transition rooms whose available date has arrived
CREATE OR REPLACE FUNCTION public.execute_system_cleanup()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- A. Delete orphaned listing drafts older than 14 days
  DELETE FROM public.listing_drafts 
  WHERE updated_at < now() - interval '14 days';

  -- B. Delete expired phone verification codes (older than 1 hour)
  DELETE FROM public.phone_verification_codes 
  WHERE created_at < now() - interval '1 hour';
  
  -- C. Delete unverified profiles older than 7 days (students only, listers require manual review)
  DELETE FROM public.profiles 
  WHERE role = 'student' 
    AND phone_verified = false 
    AND created_at < now() - interval '7 days';

  -- D. Transition "Coming Soon" rooms whose availability date has arrived to "available"
  UPDATE public.rooms
  SET 
    is_coming_soon = false,
    availability_status = 'available',
    move_out_notice_id = NULL
  WHERE is_coming_soon = true
    AND available_from <= CURRENT_DATE
    AND NOT EXISTS (
      -- Make sure it hasn't been booked/paid already
      SELECT 1 FROM public.bookings b 
      WHERE b.listing_id = rooms.id 
        AND b.status = 'paid'
    );
END;
$$;

-- 2. Redefine the listings view to perform dynamic transition checks
DROP VIEW IF EXISTS public.listings CASCADE;

CREATE OR REPLACE VIEW public.listings AS
 SELECT r.id,
    r.id AS listing_id,
    r.property_id,
    ll.profile_id AS lister_id,
    au.email AS email,
    au.email AS owner_email,
    prof.full_name AS owner_name,
    prof.phone AS owner_phone,
    p.title,
    COALESCE(r.description, p.description) AS description,
    r.room_type,
    'any'::text AS gender_preference,
    r.price_tzs AS price_monthly,
    r.deposit_tzs AS security_deposit,
    false AS utilities_included,
    r.floor_number AS floor,
    1 AS total_rooms,
    false AS furnished,
    'house'::text AS property_type,
    prof.phone AS whatsapp_number,
    1 AS min_lease_months,
    'monthly'::text AS payment_schedule,
    ''::text AS late_fee_policy,
    ''::text AS video_tour_url,
    ''::text AS accessibility_notes,
    p.city AS region,
    p.district,
    p.ward,
    p.address AS street,
    p.latitude AS lat,
    p.longitude AS lng,
    array_to_json(r.amenities)::text AS amenities,
    ''::text AS house_rules,
    r.available_from,
    -- Dynamic Availability Check (True if date arrived/passed and no paid booking)
    (
      CASE 
        WHEN EXISTS (SELECT 1 FROM public.bookings b WHERE b.listing_id = r.id AND b.status = 'paid') THEN false
        WHEN r.is_coming_soon = true AND r.available_from IS NOT NULL AND CURRENT_DATE >= r.available_from THEN true
        ELSE (r.availability_status = 'available')
      END
    ) AS available,
    -- Dynamic Vacancy Status Check (Available if date arrived/passed and no paid booking)
    (
      CASE 
        WHEN EXISTS (SELECT 1 FROM public.bookings b WHERE b.listing_id = r.id AND b.status = 'paid') THEN 'occupied'::text
        WHEN r.is_coming_soon = true AND r.available_from IS NOT NULL AND CURRENT_DATE >= r.available_from THEN 'available'::text
        ELSE r.availability_status 
      END
    ) AS vacancy_status,
    CASE
        WHEN p.status = 'active'::text THEN 'approved'::text
        ELSE p.status
    END AS status,
    ''::text AS rejection_reason,
    p.is_featured AS featured,
    ARRAY[]::text[] AS near_universities,
    0 AS view_count,
    r.created_at,
    r.created_at AS updated_at,
    -- Dynamic Coming Soon flag (False if date arrived/passed)
    (
      CASE
        WHEN r.is_coming_soon = true AND r.available_from IS NOT NULL AND CURRENT_DATE >= r.available_from THEN false
        ELSE r.is_coming_soon
      END
    ) AS is_coming_soon,
    -- Utility Columns (informational, cash-paid)
    COALESCE(r.elec_type,  'shared') AS elec_type,
    COALESCE(r.water_type, 'shared') AS water_type,
    COALESCE(r.waste_cost, 0)        AS waste_cost,
    COALESCE(r.elec_cost, 0)         AS elec_cost,
    COALESCE(r.water_cost, 0)        AS water_cost
   FROM public.rooms r
     JOIN public.properties p ON r.property_id = p.id
     LEFT JOIN public.landlords ll ON p.landlord_id = ll.id
     LEFT JOIN public.profiles prof ON ll.profile_id = prof.id
     LEFT JOIN auth.users au ON ll.profile_id = au.id;

-- Restore INSTEAD OF UPDATE trigger
CREATE OR REPLACE FUNCTION public.trg_upd_listings()
RETURNS trigger AS $$
BEGIN
  UPDATE public.rooms
  SET 
    price_tzs          = COALESCE(NEW.price_monthly,    price_tzs),
    deposit_tzs        = COALESCE(NEW.security_deposit, deposit_tzs),
    availability_status= COALESCE(NEW.vacancy_status,   availability_status),
    available_from     = COALESCE(NEW.available_from,   available_from),
    is_coming_soon     = COALESCE(NEW.is_coming_soon,   is_coming_soon),
    elec_type          = COALESCE(NEW.elec_type,        elec_type),
    water_type         = COALESCE(NEW.water_type,       water_type),
    waste_cost         = COALESCE(NEW.waste_cost,       waste_cost),
    elec_cost          = COALESCE(NEW.elec_cost,        elec_cost),
    water_cost         = COALESCE(NEW.water_cost,       water_cost)
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_upd_listings
  INSTEAD OF UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_upd_listings();

-- Re-apply permissions
GRANT SELECT ON public.listings TO anon, authenticated, service_role;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
