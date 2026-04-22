CREATE OR REPLACE FUNCTION get_listing_with_contact(p_listing_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_authorized BOOLEAN := FALSE;
  v_listing RECORD;
  v_lister RECORD;
  v_result JSON;
BEGIN
  -- Fetch listing
  SELECT * INTO v_listing FROM listings WHERE id = p_listing_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  -- Fetch lister
  SELECT * INTO v_lister FROM profiles WHERE id = v_listing.lister_id;

  -- Check authorization
  IF v_user_id IS NOT NULL THEN
    IF v_user_id = v_listing.lister_id THEN
      v_is_authorized := TRUE;
    ELSE
      -- Check for confirmed booking
      SELECT EXISTS (
        SELECT 1 FROM bookings 
        WHERE listing_id = p_listing_id 
        AND tenant_id = v_user_id 
        AND status IN ('approved', 'confirmed', 'paid')
      ) INTO v_is_authorized;
    END IF;
  END IF;

  -- Hide contact info if not authorized
  IF NOT v_is_authorized THEN
    v_listing.owner_phone := NULL;
    v_listing.whatsapp_number := NULL;
    v_lister.phone := NULL;
    v_lister.email := NULL;
  END IF;

  -- Return combined JSON
  v_result := json_build_object(
    'listing', row_to_json(v_listing),
    'listerProfile', row_to_json(v_lister)
  );
  
  RETURN v_result;
END;
$$;
