-- Migration: 20260422000001_referrals_shares_tables.sql
-- Purpose: Add landlord_referrals and location_shares tables for Task 4/5
-- Also add a 'reference' column to bookings if missing

-- ─── 1. landlord_referrals ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.landlord_referrals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  referral_code text NOT NULL UNIQUE DEFAULT ('REF-' || substr(gen_random_uuid()::text, 1, 8)),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'rewarded', 'expired')),
  reward_tzs    numeric(12,2) DEFAULT 0,
  converted_at  timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.landlord_referrals ENABLE ROW LEVEL SECURITY;

-- Users can see their own referrals (as referrer or referred)
DROP POLICY IF EXISTS "referrals_select_own" ON public.landlord_referrals;
CREATE POLICY "referrals_select_own" ON public.landlord_referrals
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- Users can create referrals where they are the referrer
DROP POLICY IF EXISTS "referrals_insert_own" ON public.landlord_referrals;
CREATE POLICY "referrals_insert_own" ON public.landlord_referrals
  FOR INSERT TO authenticated
  WITH CHECK (referrer_id = auth.uid());

-- Admin can see and manage all referrals
DROP POLICY IF EXISTS "referrals_admin_all" ON public.landlord_referrals;
CREATE POLICY "referrals_admin_all" ON public.landlord_referrals
  FOR ALL TO authenticated
  USING (public.is_admin());

-- ─── 2. location_shares ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.location_shares (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id  uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  share_type  text NOT NULL DEFAULT 'link' CHECK (share_type IN ('link', 'whatsapp', 'native', 'copy')),
  shared_with text,  -- optional: phone number or name of person shared with
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.location_shares ENABLE ROW LEVEL SECURITY;

-- Tenants can see their own shares
DROP POLICY IF EXISTS "shares_select_own" ON public.location_shares;
CREATE POLICY "shares_select_own" ON public.location_shares
  FOR SELECT TO authenticated
  USING (tenant_id = auth.uid());

-- Tenants can insert shares for themselves
DROP POLICY IF EXISTS "shares_insert_own" ON public.location_shares;
CREATE POLICY "shares_insert_own" ON public.location_shares
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth.uid());

-- Admin can see all shares
DROP POLICY IF EXISTS "shares_admin_all" ON public.location_shares;
CREATE POLICY "shares_admin_all" ON public.location_shares
  FOR ALL TO authenticated
  USING (public.is_admin());

-- ─── 3. Ensure bookings.reference column exists ──────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'reference'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN reference text;
  END IF;
END $$;

-- ─── 4. Index for fast referral lookups ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.landlord_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code    ON public.landlord_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_shares_tenant     ON public.location_shares(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shares_listing    ON public.location_shares(listing_id);
