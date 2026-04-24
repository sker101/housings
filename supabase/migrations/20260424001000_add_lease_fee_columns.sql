ALTER TABLE public.tenant_leases 
ADD COLUMN IF NOT EXISTS platform_deposit_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS gateway_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount_due numeric DEFAULT 0;

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS platform_deposit_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS gateway_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount_due numeric DEFAULT 0;

-- 1. Expand allowed statuses for bookings
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status = ANY (ARRAY['pending','requested','approved','confirmed','paid','cancelled','completed','disputed']));

-- 2. Policy: Allow tenant to see the room if they have a confirmed booking
DROP POLICY IF EXISTS "tenant sees booked room" ON public.rooms;
CREATE POLICY "tenant sees booked room" ON public.rooms FOR SELECT USING (
  id IN (
    SELECT listing_id FROM public.bookings 
    WHERE (tenant_id IN (SELECT id FROM public.tenants WHERE profile_id = auth.uid()) OR tenant_id = auth.uid())
    AND status IN ('pending', 'requested', 'approved', 'confirmed', 'completed', 'paid')
  )
);
