-- Align database schema to match the frontend's expected column names (listing_id and move_in_date)
-- 1. Align bookings table
DO $$ 
BEGIN
  -- Rename room_id to listing_id if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'room_id') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'listing_id') THEN
    ALTER TABLE public.bookings RENAME COLUMN room_id TO listing_id;
  END IF;
END $$;

-- 2. Align tenant_leases table
DO $$ 
BEGIN
  -- Rename room_id to listing_id if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenant_leases' AND column_name = 'room_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenant_leases' AND column_name = 'listing_id') THEN
    ALTER TABLE public.tenant_leases RENAME COLUMN room_id TO listing_id;
  END IF;
  
  -- Rename lease_start_date to move_in_date if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenant_leases' AND column_name = 'lease_start_date')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenant_leases' AND column_name = 'move_in_date') THEN
    ALTER TABLE public.tenant_leases RENAME COLUMN lease_start_date TO move_in_date;
  END IF;
END $$;

-- 3. Ensure all supporting columns exist in both tables
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS platform_deposit_fee numeric DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS gateway_fee numeric DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_amount_due numeric DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS months_duration integer;

ALTER TABLE public.tenant_leases ADD COLUMN IF NOT EXISTS platform_deposit_fee numeric DEFAULT 0;
ALTER TABLE public.tenant_leases ADD COLUMN IF NOT EXISTS gateway_fee numeric DEFAULT 0;
ALTER TABLE public.tenant_leases ADD COLUMN IF NOT EXISTS total_amount_due numeric DEFAULT 0;
ALTER TABLE public.tenant_leases ADD COLUMN IF NOT EXISTS months_duration integer;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
