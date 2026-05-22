-- 20260521220000_fix_approve_move_out_current_schema.sql
-- Keep move-out approval aligned with the current rooms-backed listings view.

CREATE OR REPLACE FUNCTION public.approve_move_out_and_reward(
  p_notice_id uuid,
  p_reward_amount numeric,
  p_new_listing_title text,
  p_new_listing_price numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notice move_out_notices%ROWTYPE;
  v_listing_id uuid;
  v_original_listing listings%ROWTYPE;
  v_new_listing_id uuid;
  v_tenant_id uuid;
  v_reward_amount numeric := COALESCE(p_reward_amount, 0);
  v_requested_title text := NULLIF(BTRIM(COALESCE(p_new_listing_title, '')), '');
  v_new_listing_title text;
BEGIN
  SELECT *
    INTO v_notice
    FROM move_out_notices
    WHERE id = p_notice_id AND status = 'pending'
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notice not found or already processed (id: %)', p_notice_id;
  END IF;

  v_listing_id := v_notice.room_id;

  IF v_listing_id IS NULL AND v_notice.booking_id IS NOT NULL THEN
    SELECT COALESCE(listing_id, room_id)
      INTO v_listing_id
      FROM bookings
      WHERE id = v_notice.booking_id;
  END IF;

  IF v_listing_id IS NULL AND v_notice.property_id IS NOT NULL THEN
    SELECT id
      INTO v_listing_id
      FROM rooms
      WHERE property_id = v_notice.property_id
      ORDER BY created_at DESC
      LIMIT 1;
  END IF;

  IF v_listing_id IS NULL THEN
    RAISE EXCEPTION 'Cannot resolve listing from notice % (no room_id, property_id or booking_id)', p_notice_id;
  END IF;

  SELECT *
    INTO v_original_listing
    FROM listings
    WHERE id = v_listing_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original listing not found (id: %)', v_listing_id;
  END IF;

  IF v_requested_title IN ('Room', 'Room (Coming Soon)') THEN
    v_requested_title := NULL;
  END IF;

  v_new_listing_title := COALESCE(
    v_requested_title,
    COALESCE(NULLIF(BTRIM(v_original_listing.title), ''), 'Room') || ' (Coming Soon)'
  );

  v_tenant_id := v_notice.tenant_id;
  IF v_tenant_id IS NULL AND v_notice.booking_id IS NOT NULL THEN
    SELECT tenant_id
      INTO v_tenant_id
      FROM bookings
      WHERE id = v_notice.booking_id;
  END IF;

  UPDATE move_out_notices
     SET status = 'listing_created'
   WHERE id = p_notice_id;

  UPDATE rooms
     SET availability_status = 'listed_occupied',
         is_coming_soon = true,
         available_from = v_notice.intended_move_out_date,
         coming_soon_activated_at = COALESCE(coming_soon_activated_at, now()),
         move_out_notice_id = p_notice_id
   WHERE id = v_listing_id;

  INSERT INTO listings (
    lister_id,
    title,
    description,
    room_type,
    price_monthly,
    region,
    district,
    ward,
    street,
    lat,
    lng,
    amenities,
    available_from,
    vacancy_status,
    status,
    featured,
    is_coming_soon,
    elec_type,
    water_type,
    waste_cost,
    elec_cost,
    water_cost
  ) VALUES (
    v_original_listing.lister_id,
    v_new_listing_title,
    v_original_listing.description,
    v_original_listing.room_type,
    COALESCE(p_new_listing_price, v_original_listing.price_monthly)::integer,
    v_original_listing.region,
    v_original_listing.district,
    v_original_listing.ward,
    v_original_listing.street,
    v_original_listing.lat,
    v_original_listing.lng,
    v_original_listing.amenities,
    v_notice.intended_move_out_date,
    'listed_occupied',
    'approved',
    false,
    true,
    COALESCE(v_original_listing.elec_type, 'shared'),
    COALESCE(v_original_listing.water_type, 'shared'),
    COALESCE(v_original_listing.waste_cost, 0),
    COALESCE(v_original_listing.elec_cost, 0),
    COALESCE(v_original_listing.water_cost, 0)
  )
  RETURNING id INTO v_new_listing_id;

  UPDATE rooms
     SET availability_status = 'listed_occupied',
         is_available = false,
         is_coming_soon = true,
         available_from = v_notice.intended_move_out_date,
         coming_soon_activated_at = COALESCE(coming_soon_activated_at, now()),
         move_out_notice_id = p_notice_id
   WHERE id = v_new_listing_id;

  INSERT INTO listing_photos (listing_id, storage_path, public_url, position, angle, caption, is_cover)
  SELECT v_new_listing_id, storage_path, public_url, position, angle, caption, is_cover
    FROM listing_photos
    WHERE listing_id = v_listing_id;

  IF v_tenant_id IS NOT NULL AND v_reward_amount > 0 THEN
    UPDATE profiles
       SET wallet_balance = COALESCE(wallet_balance, 0) + v_reward_amount
     WHERE id = v_tenant_id;

    INSERT INTO wallet_transactions (profile_id, amount, type, description)
    VALUES (v_tenant_id, v_reward_amount, 'credit', 'Reward for move-out notice approval');

    INSERT INTO notifications (user_id, type, title, body)
    VALUES (
      v_tenant_id,
      'system',
      'Move-Out Notice Approved & Reward Added!',
      'Your landlord approved your move-out notice. We have credited your wallet with ' || v_reward_amount || ' TZS.'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_move_out_and_reward(uuid, numeric, text, numeric) TO authenticated;

NOTIFY pgrst, 'reload schema';
