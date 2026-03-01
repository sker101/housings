import { corsHeaders, json, withCors } from '../_shared/cors.ts';
import { createRequestClient, createServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return withCors('ok', 200, corsHeaders);
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const payload = await req.json().catch(() => null);
    const { listing_id, reason, description, evidence_urls } = payload ?? {};

    if (!listing_id || !reason) {
        return json({ error: 'listing_id and reason are required' }, 400);
    }

    try {
        const userClient = createRequestClient(req);
        const supabase = createServiceClient();

        // Get current user 
        let reporterId = null;
        try {
            const authHeader = req.headers.get('Authorization');
            if (authHeader && authHeader.trim().length > 10 && !authHeader.includes('null') && !authHeader.includes('undefined')) {
                const { data: { user }, error: authError } = await userClient.auth.getUser();
                if (!authError) {
                    reporterId = user?.id ?? null;
                }
            }
        } catch (e) {
            // Ignore invalid JWTs — process as anonymous report
        }

        let reporterHasBooking = false;

        if (reporterId) {
            const { data: booking } = await supabase
                .from('bookings')
                .select('id')
                .eq('listing_id', listing_id)
                .eq('tenant_id', reporterId)
                .in('status', ['approved', 'completed'])
                .limit(1)
                .single();
            reporterHasBooking = !!booking;
        }

        const { error } = await supabase.from('listing_reports').insert({
            listing_id,
            reporter_id: reporterId,
            reason,
            description: description ?? '',
            evidence_urls: Array.isArray(evidence_urls) ? evidence_urls : [],
            reporter_has_booking: reporterHasBooking,
            status: 'pending',
        });

        if (error) return json({ error: error.message }, 400);

        return json({ ok: true, message: 'Thank you for your report. We will review it shortly.' });
    } catch (err) {
        return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
    }
});
