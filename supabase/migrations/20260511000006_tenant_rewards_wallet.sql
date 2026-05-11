-- ─────────────────────────────────────────────────────────────────────────────
-- Tenant Rewards & Wallet Balance
-- Migration: 20260511000006_tenant_rewards_wallet.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add wallet_balance to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wallet_balance numeric DEFAULT 0.00;

-- 2. Create a table to track wallet transactions (ledger)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      numeric NOT NULL,
  type        text NOT NULL CHECK (type IN ('credit', 'debit')),
  description text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wallet_transactions' AND policyname = 'user read own transactions'
  ) THEN
    CREATE POLICY "user read own transactions" ON wallet_transactions
      FOR SELECT USING (profile_id = auth.uid());
  END IF;
END $$;

-- 3. Stored procedure to handle "Coming Soon" approval and reward
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
  v_notice move_out_notices%ROWTYPE;
  v_original_listing listings%ROWTYPE;
  v_new_listing_id uuid;
BEGIN
  -- 1. Get the notice
  SELECT * INTO v_notice FROM move_out_notices WHERE id = p_notice_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notice not found or already processed';
  END IF;

  -- 2. Get the original listing
  SELECT * INTO v_original_listing FROM listings WHERE id = v_notice.property_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original listing not found';
  END IF;

  -- 3. Mark notice as listed
  UPDATE move_out_notices SET status = 'listing_created' WHERE id = p_notice_id;

  -- 4. Create "Coming Soon" listing
  INSERT INTO listings (
    lister_id, title, description, room_type, price_monthly, region, district, ward, street, 
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
    'occupied', -- occupied because tenant hasn't left yet
    'approved', -- automatically approve it so it shows up
    false
  ) RETURNING id INTO v_new_listing_id;

  -- Optional: Copy photos from old listing to new listing
  INSERT INTO listing_photos (listing_id, url, public_url, position, angle)
  SELECT v_new_listing_id, url, public_url, position, angle 
  FROM listing_photos WHERE listing_id = v_original_listing.id;

  -- 5. Reward the tenant
  UPDATE profiles 
  SET wallet_balance = wallet_balance + p_reward_amount
  WHERE id = v_notice.tenant_id;

  INSERT INTO wallet_transactions (profile_id, amount, type, description)
  VALUES (v_notice.tenant_id, p_reward_amount, 'credit', 'Reward for move-out notice approval');

  -- 6. Notify tenant
  INSERT INTO notifications (user_id, type, title, body)
  VALUES (
    v_notice.tenant_id, 
    'system', 
    'Move-Out Notice Approved & Reward Added!', 
    'Your landlord approved your move-out notice. We have credited your wallet with ' || p_reward_amount || ' TZS.'
  );

END;
$$;
