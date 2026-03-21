import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { to, message } = await req.json();

        const username = Deno.env.get('AT_USERNAME');
        const apiKey = Deno.env.get('AT_API_KEY');

        if (!username || !apiKey) {
            throw new Error('Africa\'s Talking credentials missing');
        }

        const payload = new URLSearchParams();
        payload.append('username', username);
        payload.append('to', to);
        payload.append('message', message);

        // AfricasTalking uses a different endpoint depending on sandbox/live:
        // https://api.sandbox.africastalking.com/version1/messaging for sandbox
        // https://api.africastalking.com/version1/messaging for live.
        // Assuming 'sandbox' if username === 'sandbox'
        const domain = username === 'sandbox' ? 'api.sandbox.africastalking.com' : 'api.africastalking.com';
        const response = await fetch(`https://${domain}/version1/messaging`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'apiKey': apiKey,
            },
            body: payload
        });

        const data = await response.json();

        return new Response(JSON.stringify({ success: true, data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
