-- Add fee columns to payments table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS base_rent        NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS pm_fee           NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS platform_fee     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_amount     NUMERIC(12,2);

-- Add fee columns to payment_records table as well
ALTER TABLE payment_records
  ADD COLUMN IF NOT EXISTS base_rent        NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS pm_fee           NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS platform_fee     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_amount     NUMERIC(12,2);

-- Add PM commission tracking table
CREATE TABLE IF NOT EXISTS pm_commissions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pm_user_id    UUID REFERENCES auth.users(id),
  listing_id    UUID REFERENCES listings(id),
  payment_id    UUID REFERENCES payments(id),
  base_rent     NUMERIC(12,2) NOT NULL,
  commission    NUMERIC(12,2) NOT NULL,  -- 3% of base_rent
  period_month  DATE NOT NULL,           -- first day of the month this covers
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Add platform revenue tracking
CREATE TABLE IF NOT EXISTS platform_revenue (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id    UUID REFERENCES listings(id),
  payment_id    UUID REFERENCES payments(id),
  base_rent     NUMERIC(12,2) NOT NULL,
  revenue       NUMERIC(12,2) NOT NULL,  -- 2% of base_rent
  period_month  DATE NOT NULL,           -- first day of the month this covers
  created_at    TIMESTAMPTZ DEFAULT now()
);
