-- Add payment fee columns to bookings and tenant_leases
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS platform_deposit_fee numeric DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS gateway_fee numeric DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_amount_due numeric DEFAULT 0;

ALTER TABLE public.tenant_leases ADD COLUMN IF NOT EXISTS platform_deposit_fee numeric DEFAULT 0;
ALTER TABLE public.tenant_leases ADD COLUMN IF NOT EXISTS gateway_fee numeric DEFAULT 0;
ALTER TABLE public.tenant_leases ADD COLUMN IF NOT EXISTS total_amount_due numeric DEFAULT 0;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
