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

            await supabase
                .from('payment_records')
                .update({ status: newStatus, paid_at: new Date().toISOString() })
                .eq('id', order_id);
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
