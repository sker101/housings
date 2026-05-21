-- 20260521200000_fix_approve_move_out_resolution.sql
-- Update approve_move_out_and_reward to support room_id first, booking_id second, and property_id fallback.

CREATE OR REPLACE FUNCTION public.approve_move_out_and_reward(
  p_notice_id uuid,
  p_reward_amount numeric,
  p_new_listing_title text,
  p_new_listing_price numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notice        move_out_notices%ROWTYPE;
  v_listing_id    uuid;
  v_original_listing listings%ROWTYPE;
  v_new_listing_id uuid;
  v_tenant_id     uuid;
BEGIN
  -- 1. Get the notice (allow any pending status)
  SELECT * INTO v_notice
    FROM move_out_notices
    WHERE id = p_notice_id AND status = 'pending'
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notice not found or already processed (id: %)', p_notice_id;
  END IF;

  -- 2. Resolve the listing_id (room_id): prefer room_id, then fall back to booking_id, then fallback to property_id (find first room under property)
  v_listing_id := v_notice.room_id;

  IF v_listing_id IS NULL AND v_notice.booking_id IS NOT NULL THEN
    SELECT listing_id INTO v_listing_id
      FROM bookings
      WHERE id = v_notice.booking_id;
  END IF;

  IF v_listing_id IS NULL AND v_notice.property_id IS NOT NULL THEN
    SELECT id INTO v_listing_id
      FROM rooms
      WHERE property_id = v_notice.property_id
      LIMIT 1;
  END IF;

  IF v_listing_id IS NULL THEN
    RAISE EXCEPTION 'Cannot resolve listing from notice % (no room_id, property_id or booking_id)', p_notice_id;
  END IF;

  -- 3. Get the original listing
  SELECT * INTO v_original_listing FROM listings WHERE id = v_listing_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original listing not found (id: %)', v_listing_id;
  END IF;

  -- 4. Resolve tenant_id: use notice.tenant_id, fall back to booking.tenant_id
  v_tenant_id := v_notice.tenant_id;
  IF v_tenant_id IS NULL AND v_notice.booking_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id
      FROM bookings
      WHERE id = v_notice.booking_id;
  END IF;

  -- 5. Mark notice as approved/listed
  UPDATE move_out_notices SET status = 'listing_created' WHERE id = p_notice_id;

  -- 6. Create "Coming Soon" listing so prospective tenants can see it
  INSERT INTO listings (
    lister_id, title, description, room_type, price_monthly,
    region, district, ward, street,
    lat, lng, amenities, vacancy_status, status, featured
  ) VALUES (
    v_original_listing.lister_id,
    COALESCE(p_new_listing_title, v_original_listing.title || ' (Coming Soon)'),
    v_original_listing.description,
    v_original_listing.room_type,
    COALESCE(p_new_listing_price, v_original_listing.price_monthly),
    v_original_listing.region,
    v_original_listing.district,
    v_original_listing.ward,
    v_original_listing.street,
    v_original_listing.lat,
    v_original_listing.lng,
    v_original_listing.amenities,
    'occupied',   -- tenant hasn't left yet
    'approved',   -- auto-approve so it shows up
    false
  ) RETURNING id INTO v_new_listing_id;

  -- Copy photos from the original listing to the new one
  INSERT INTO listing_photos (listing_id, url, public_url, position, angle)
  SELECT v_new_listing_id, url, public_url, position, angle
    FROM listing_photos WHERE listing_id = v_listing_id;

  -- 7. Reward the tenant (only if we know who they are)
  IF v_tenant_id IS NOT NULL THEN
    UPDATE profiles
      SET wallet_balance = COALESCE(wallet_balance, 0) + p_reward_amount
      WHERE id = v_tenant_id;

    INSERT INTO wallet_transactions (profile_id, amount, type, description)
      VALUES (v_tenant_id, p_reward_amount, 'credit', 'Reward for move-out notice approval');

    -- 8. Notify tenant
    INSERT INTO notifications (user_id, type, title, body)
      VALUES (
        v_tenant_id,
        'system',
        'Move-Out Notice Approved & Reward Added!',
        'Your landlord approved your move-out notice. We have credited your wallet with ' || p_reward_amount || ' TZS.'
      );
  END IF;

END;
$$;

-- Make sure authenticated users can call this function
GRANT EXECUTE ON FUNCTION public.approve_move_out_and_reward(uuid, numeric, text, numeric) TO authenticated;
