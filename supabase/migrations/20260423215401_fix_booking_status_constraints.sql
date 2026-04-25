-- 1. Expand allowed statuses for bookings
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status = ANY (ARRAY['pending','requested','approved','confirmed','paid','cancelled','completed','disputed']));

-- 2. Ensure users can see their own tenant/landlord records
DROP POLICY IF EXISTS "tenant_own_record" ON public.tenants;
CREATE POLICY "tenant_own_record" ON public.tenants FOR ALL USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "landlord_own_record" ON public.landlords;
CREATE POLICY "landlord_own_record" ON public.landlords FOR ALL USING (profile_id = auth.uid());

-- 3. Policy: Allow tenant to see the room if they have a confirmed booking
-- Handle both room_id and listing_id column names
DO $$
DECLARE
    booking_ref_column text;
BEGIN
    -- Determine which column exists in bookings table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'listing_id') THEN
        booking_ref_column := 'listing_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'room_id') THEN
        booking_ref_column := 'room_id';
    ELSE
        -- Neither column exists, skip this policy
        RETURN;
    END IF;
    
    -- Drop existing policy if any
    EXECUTE 'DROP POLICY IF EXISTS "tenant sees booked room" ON public.rooms';
    
    -- Create policy with dynamic column reference
    EXECUTE format('
        CREATE POLICY "tenant sees booked room" ON public.rooms FOR SELECT USING (
            id IN (
                SELECT %I FROM public.bookings 
                WHERE (tenant_id IN (SELECT id FROM public.tenants WHERE profile_id = auth.uid()) OR tenant_id = auth.uid())
                AND status IN (''pending'', ''requested'', ''approved'', ''confirmed'', ''completed'', ''paid'')
            )
        )
    ', booking_ref_column);
END $$;
