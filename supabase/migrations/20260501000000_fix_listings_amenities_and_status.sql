-- FIX AMENITIES TYPE AND REQUIRE MANUAL LISTING APPROVAL
-- 1. Fixes the COALESCE error in trg_insert_listings_view by casting to text[] instead of jsonb
-- 2. Removes auto-approval of listings for verified landlords so admins must approve listings explicitly.

-- Re-create the View to remove auto-approve logic
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
  -- Improved Status Logic without auto-approve:
  CASE 
    WHEN p.verification_status = 'verified' THEN 'approved'
    WHEN p.verification_status = 'pending' THEN 'pending'
    WHEN p.status = 'flagged' THEN 'flagged'
    WHEN p.status = 'inactive' THEN 'removed'
    ELSE 'pending' -- Defaults to pending for admin review
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

-- Re-create the Insert Trigger with fixed amenities casting
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
        landlord_id, title, description, city, neighbourhood, ward, address, latitude, longitude, status, verification_status
    ) VALUES (
        v_landlord_id, NEW.title, NEW.description, NEW.region, NEW.district, NEW.ward, NEW.street, 
        COALESCE(NEW.lat, 0), COALESCE(NEW.lng, 0), 'active', 'pending'
    ) RETURNING id INTO v_property_id;

    -- Create room with correct amenities cast to text[]
    INSERT INTO public.rooms (
        id, property_id, room_type, price_tzs, availability_status, is_available, amenities
    ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()), v_property_id, NEW.room_type, NEW.price_monthly, 
        COALESCE(NEW.vacancy_status, 'available'), true, COALESCE(NEW.amenities, '{}'::text[])
    ) RETURNING id INTO NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to view
DROP TRIGGER IF EXISTS trg_ins_listings ON public.listings;
CREATE TRIGGER trg_ins_listings
INSTEAD OF INSERT ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.trg_insert_listings_view();

-- We also need to re-apply the update trigger because we dropped the view
CREATE OR REPLACE FUNCTION public.trg_update_listings_view()
RETURNS TRIGGER AS $$
BEGIN
    -- Update Properties table
    UPDATE public.properties
    SET 
        verification_status = CASE 
            WHEN NEW.status = 'approved' THEN 'verified'
            WHEN NEW.status = 'pending' THEN 'pending'
            WHEN NEW.status = 'rejected' THEN 'unverified'
            ELSE verification_status
        END,
        rejection_reason = COALESCE(NEW.rejection_reason, rejection_reason),
        status = CASE 
            WHEN NEW.status = 'flagged' THEN 'flagged'
            WHEN NEW.status = 'removed' THEN 'inactive'
            ELSE 'active'
        END
    WHERE id = OLD.property_id;

    -- Update Rooms table (Sync occupancy status with moderation status)
    UPDATE public.rooms
    SET 
        availability_status = CASE 
            WHEN NEW.status = 'approved' THEN 'available'
            WHEN NEW.status = 'removed' THEN 'unavailable'
            ELSE availability_status
        END,
        is_available = (NEW.status = 'approved')
    WHERE id = OLD.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_upd_listings ON public.listings;
CREATE TRIGGER trg_upd_listings
INSTEAD OF UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.trg_update_listings_view();

-- Ensure permissions
GRANT ALL ON public.listings TO authenticated, anon, service_role;

-- Change existing auto-approved listings to pending if they were created recently?
-- Let's leave existing ones as is, or we can set properties.verification_status to pending if needed.
-- We'll just fix going forward.

-- Refresh cache
NOTIFY pgrst, 'reload schema';
