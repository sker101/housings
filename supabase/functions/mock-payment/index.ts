import { corsHeaders, json, withCors } from '../_shared/cors.ts';
import { createRequestClient, createServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return withCors('ok', 200, corsHeaders);
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const payload = await req.json().catch(() => null);
    const { listing_id, months = 1, amount = 0 } = payload ?? {};

    if (!listing_id) return json({ error: 'listing_id is required' }, 400);

    try {
        const userClient = createRequestClient(req);
        const supabase = createServiceClient();

        const { data: userData, error: userError } = await userClient.auth.getUser();
        if (userError || !userData?.user) return json({ error: 'Unauthorized' }, 401);
        const tenantId = userData.user.id;

        const { data: listing, error: listingError } = await supabase
            .from('listings')
            .select('id,lister_id,price_monthly,security_deposit,vacancy_status')
            .eq('id', listing_id)
            .single();
        if (listingError || !listing) return json({ error: 'Listing not found' }, 404);

        const moveInDate = (new Date()).toISOString().slice(0, 10);
        const durationMonths = Math.max(1, Math.min(24, Number(months) || 1));

        // Create or reuse a booking
        const { data: existingBooking } = await supabase
            .from('bookings')
            .select('id,status')
            .eq('tenant_id', tenantId)
            .eq('listing_id', listing_id)
            .in('status', ['approved', 'reserved', 'completed'])
            .maybeSingle();

        let bookingId = existingBooking?.id;

        if (!bookingId) {
            const { data: newBooking, error: bookingError } = await supabase
                .from('bookings')
                .insert({
                    listing_id,
                    tenant_id: tenantId,
                    lister_id: listing.lister_id,
                    move_in_date: moveInDate,
                    duration_months: durationMonths,
                    status: 'approved'
                })
                .select('id')
                .single();
            if (bookingError || !newBooking) return json({ error: 'Failed to create booking' }, 400);
            bookingId = newBooking.id;
        } else {
            await supabase
                .from('bookings')
                .update({ status: 'approved', move_in_date: moveInDate, duration_months: durationMonths })
                .eq('id', bookingId);
        }

        // Mark listing reserved/occupied
        await supabase
            .from('listings')
            .update({ vacancy_status: 'occupied' })
            .eq('id', listing_id);

        const rent = Number(amount || listing.price_monthly || 0);
        const pmFee = Math.round(rent * 0.03);
        const platformFee = Math.round(rent * 0.02);
        const totalAmount = rent + pmFee + platformFee;

        // Insert a paid payment record
        await supabase
            .from('payment_records')
            .insert({
                booking_id: bookingId,
                amount: totalAmount,
                due_date: moveInDate,
                status: 'paid',
                paid_at: new Date().toISOString(),
                reference: `MOCK-${Date.now()}`,
                base_rent: rent,
                pm_fee: pmFee,
                platform_fee: platformFee,
                total_amount: totalAmount
            });

        return json({
            success: true,
            booking_id: bookingId,
            listing_id,
            reference: `MOCK-${Date.now()}`,
            move_in_date: moveInDate,
            duration_months: durationMonths
        });
    } catch (err) {
        return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
    }
});
