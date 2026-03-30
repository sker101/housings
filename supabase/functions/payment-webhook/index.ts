import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
    try {
        // Determine validity (mock signature validation)
        const signature = req.headers.get('x-selcom-signature');
        const payload = await req.json();

        // In a real flow, verify HMAC signature using SELCOM_API_SECRET
        // If invalid: return Response.json({ error: 'unauthorized' }, { status: 401 })

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { order_id, payment_status } = payload;

        if (order_id) {
            // update payment_records table (or wherever the order is stored)
            let newStatus = 'pending';
            if (payment_status === 'COMPLETED' || payment_status === 'SUCCESS') newStatus = 'paid';
            else if (payment_status === 'FAILED') newStatus = 'failed';

            // Get the payment record to find the booking_id and listing_id
            const paymentResult = await supabase
                .from('payment_records')
                .select('id, booking_id')
                .eq('id', order_id)
                .single();

            if (paymentResult.data) {
                const booking_id = paymentResult.data.booking_id;

                // Update payment record status
                await supabase
                    .from('payment_records')
                    .update({ status: newStatus, paid_at: new Date().toISOString() })
                    .eq('id', order_id);

                // If payment is successful, update booking status and mark listing as occupied
                if (newStatus === 'paid') {
                    // Get the listing_id from the booking
                    const bookingResult = await supabase
                        .from('bookings')
                        .select('listing_id')
                        .eq('id', booking_id)
                        .single();

                    if (bookingResult.data) {
                        const listing_id = bookingResult.data.listing_id;

                        // Update booking status to approved
                        await supabase
                            .from('bookings')
                            .update({ status: 'approved' })
                            .eq('id', booking_id);

                        // Mark the listing as occupied so it won't appear in search results
                        await supabase
                            .from('listings')
                            .update({ vacancy_status: 'occupied' })
                            .eq('id', listing_id);
                    }
                }
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
        });
    }
});
