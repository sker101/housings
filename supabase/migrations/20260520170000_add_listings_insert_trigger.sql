-- 20260520170000_add_listings_insert_trigger.sql
-- Create a robust insert trigger for public.listings view to support new room listings

-- Create safety function to parse amenities text representation to text[]
CREATE OR REPLACE FUNCTION public.parse_amenities(p_input text)
RETURNS text[] AS $$
BEGIN
  IF p_input IS NULL OR p_input = '' THEN
    RETURN '{}'::text[];
  ELSIF p_input LIKE '[%' THEN
    -- It is a JSON array
    RETURN ARRAY(SELECT json_array_elements_text(p_input::json));
  ELSIF p_input LIKE '{%' THEN
    -- It is a Postgres array literal
    RETURN p_input::text[];
  ELSE
    -- Fallback/single value
    RETURN ARRAY[p_input];
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN '{}'::text[];
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger function
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

    -- Create property (populating city, district, neighbourhood, ward, address, lat, lng)
    INSERT INTO public.properties (
        landlord_id, title, description, city, district, neighbourhood, ward, address, latitude, longitude, status, verification_status
    ) VALUES (
        v_landlord_id, NEW.title, NEW.description, NEW.region, NEW.district, NEW.district, NEW.ward, NEW.street, 
        COALESCE(NEW.lat, 0), COALESCE(NEW.lng, 0), 'active', 'pending'
    ) RETURNING id INTO v_property_id;

    -- Create room with correct amenities and utility columns
    INSERT INTO public.rooms (
        id, property_id, room_type, price_tzs, availability_status, is_available, amenities,
        elec_type, water_type, waste_cost, elec_cost, water_cost
    ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()), v_property_id, NEW.room_type, NEW.price_monthly, 
        COALESCE(NEW.vacancy_status, 'available'), true, public.parse_amenities(NEW.amenities),
        COALESCE(NEW.elec_type, 'shared'), COALESCE(NEW.water_type, 'shared'), COALESCE(NEW.waste_cost, 0),
        COALESCE(NEW.elec_cost, 0), COALESCE(NEW.water_cost, 0)
    ) RETURNING id INTO NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to listings view
DROP TRIGGER IF EXISTS trg_ins_listings ON public.listings;
CREATE TRIGGER trg_ins_listings
  INSTEAD OF INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_insert_listings_view();

-- Permissions
GRANT ALL ON public.listings TO authenticated, anon, service_role;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
