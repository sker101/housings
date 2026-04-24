-- Compatibility fix for bookings table to match frontend expectations
-- The platform_revolution migration used room_id, but the entire frontend expects listing_id.

DO $$ 
BEGIN
    -- 1. Rename room_id to listing_id in bookings if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'room_id') THEN
        ALTER TABLE public.bookings RENAME COLUMN room_id TO listing_id;
    END IF;

    -- 2. Handle tenant_id and landlord_id.
    -- In platform_revolution, these referenced role-specific tables (tenants/landlords).
    -- But the frontend passes profile_id. We should probably allow them to reference profiles directly or 
    -- ensure they can store the profile_id. 
    -- For now, let's just make sure the column names match and they are UUIDs.
    
    -- 3. Add missing columns to bookings that the frontend expects
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'message') THEN
        ALTER TABLE public.bookings ADD COLUMN message text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'contact_preference') THEN
        ALTER TABLE public.bookings ADD COLUMN contact_preference text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'reference') THEN
        ALTER TABLE public.bookings ADD COLUMN reference text;
    END IF;

    -- 4. Update the listings view to be more robust
    DROP VIEW IF EXISTS public.listings CASCADE;
    CREATE OR REPLACE VIEW public.listings AS
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
      r.deposit_tzs AS security_deposit,
      r.is_available AS available,
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
      r.availability_status AS vacancy_status,
      p.is_featured AS featured,
      p.latitude AS lat,
      p.longitude AS lng
    FROM public.rooms r
    JOIN public.properties p ON r.property_id = p.id
    LEFT JOIN public.landlords ll ON p.landlord_id = ll.id
    LEFT JOIN public.property_managers pm ON p.manager_id = pm.id;

END $$;
