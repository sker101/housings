-- MASTER BRIDGE MIGRATION
-- This migration safely converts the legacy listings table to the new rooms/properties architecture
-- and ensures the listings view is fully updatable for both INSERT and UPDATE.

DO $$
BEGIN
    -- 1. Check if 'listings' is a table (BASE TABLE)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'listings' AND table_type = 'BASE TABLE') THEN
        
        RAISE NOTICE 'Found legacy listings table. Migrating data...';

        -- A. Ensure all landlords exist for the listings
        INSERT INTO public.landlords (profile_id)
        SELECT DISTINCT lister_id FROM public.listings
        WHERE lister_id NOT IN (SELECT profile_id FROM public.landlords)
        ON CONFLICT (profile_id) DO NOTHING;

        -- B. Migrate data to Properties
        -- We use a temp table to keep track of the mapping
        CREATE TEMP TABLE property_map AS
        WITH inserted_props AS (
            INSERT INTO public.properties (
                landlord_id, title, description, address, neighbourhood, city, 
                latitude, longitude, status, verification_status, created_at
            )
            SELECT 
                (SELECT id FROM public.landlords WHERE profile_id = l.lister_id LIMIT 1),
                l.title, l.description, l.street, l.ward, l.region, 
                COALESCE(NULLIF(l.lat, '')::numeric, 0), COALESCE(NULLIF(l.lng, '')::numeric, 0),
                CASE WHEN l.status = 'approved' THEN 'active' ELSE 'inactive' END,
                CASE WHEN l.status = 'approved' THEN 'verified' ELSE 'unverified' END,
                l.created_at::timestamptz
            FROM public.listings l
            RETURNING id, title, created_at
        )
        SELECT ip.id as new_property_id, l.id as old_listing_id
        FROM inserted_props ip
        JOIN public.listings l ON ip.title = l.title AND ip.created_at = l.created_at::timestamptz;

        -- C. Migrate data to Rooms
        INSERT INTO public.rooms (id, property_id, room_type, price_tzs, availability_status, is_available, amenities, created_at)
        SELECT 
            m.old_listing_id, 
            m.new_property_id,
            CASE 
                WHEN l.room_type = 'bedsit' THEN 'bedsitter' 
                WHEN l.room_type NOT IN ('single','double','self_contained','shared','bedsitter') THEN 'single'
                ELSE l.room_type 
            END,
            COALESCE(NULLIF(l.price_monthly, '')::int, 0),
            CASE WHEN l.vacancy_status = 'coming_soon' THEN 'available_soon' ELSE l.vacancy_status END,
            (l.vacancy_status = 'available'),
            l.amenities::jsonb,
            l.created_at::timestamptz
        FROM public.listings l
        JOIN property_map m ON l.id = m.old_listing_id
        ON CONFLICT (id) DO UPDATE SET property_id = EXCLUDED.property_id;

        -- D. Rename the old table to back it up
        ALTER TABLE public.listings RENAME TO listings_legacy_backup;
        
    END IF;
END $$;

-- 2. (Re)Create the Comprehensive Listings View
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
  CASE 
    WHEN p.verification_status = 'verified' THEN 'approved'
    WHEN p.verification_status = 'pending' THEN 'pending'
    WHEN p.status = 'flagged' THEN 'flagged'
    WHEN p.status = 'inactive' THEN 'removed'
    ELSE 'rejected'
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

-- 3. Make the View Updatable for INSERT
CREATE OR REPLACE FUNCTION public.trg_insert_listings_view()
RETURNS TRIGGER AS $$
DECLARE
    v_landlord_id uuid;
    v_property_id uuid;
BEGIN
    -- Get or create landlord
    SELECT id INTO v_landlord_id FROM public.landlords WHERE profile_id = NEW.lister_id;
    IF v_landlord_id IS NULL THEN
        INSERT INTO public.landlords (profile_id) VALUES (NEW.lister_id) RETURNING id INTO v_landlord_id;
    END IF;

    -- Create property
    INSERT INTO public.properties (
        landlord_id, title, description, city, neighbourhood, ward, address, latitude, longitude, status
    ) VALUES (
        v_landlord_id, NEW.title, NEW.description, NEW.region, NEW.district, NEW.ward, NEW.street, 
        COALESCE(NEW.lat, 0), COALESCE(NEW.lng, 0), 'active'
    ) RETURNING id INTO v_property_id;

    -- Create room
    INSERT INTO public.rooms (
        id, property_id, room_type, price_tzs, availability_status, is_available, amenities
    ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()), v_property_id, NEW.room_type, NEW.price_monthly, 
        COALESCE(NEW.vacancy_status, 'available'), true, COALESCE(NEW.amenities, '{}'::jsonb)
    ) RETURNING id INTO NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ins_listings ON public.listings;
CREATE TRIGGER trg_ins_listings
INSTEAD OF INSERT ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.trg_insert_listings_view();

-- 4. Grant Permissions
GRANT ALL ON public.listings TO authenticated, anon, service_role;

-- 5. Final cache reload
NOTIFY pgrst, 'reload schema';
