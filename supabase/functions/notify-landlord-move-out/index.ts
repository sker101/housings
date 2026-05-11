import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = Deno.env.get('APP_URL') ?? 'https://housings-pied.vercel.app';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, serviceKey);

    const { move_out_notice_id } = await req.json();
    if (!move_out_notice_id) {
      throw new Error('move_out_notice_id is required');
    }

    // ── 1. Fetch notice + tenant + property + landlord phone ──────────────
    const { data: notice, error: noticeErr } = await supabase
      .from('move_out_notices')
      .select(`
        id,
        intended_move_out_date,
        tenant_id,
        landlord_id,
        property_id,
        room_id,
        properties ( title ),
        tenant:profiles!move_out_notices_tenant_id_fkey ( full_name ),
        landlord:profiles!move_out_notices_landlord_id_fkey ( phone )
      `)
      .eq('id', move_out_notice_id)
      .single();

    if (noticeErr || !notice) {
      throw new Error(noticeErr?.message ?? 'Notice not found');
    }

    const tenantName   = (notice.tenant as any)?.full_name ?? 'Mpangaji';
    const propertyName = (notice.properties as any)?.title ?? 'Chumba';
    const landlordPhone = (notice.landlord as any)?.phone ?? null;

    // ── 2. Format move-out date as DD/MM/YYYY ────────────────────────────
    const rawDate = new Date(notice.intended_move_out_date + 'T00:00:00');
    const moveOutFormatted = rawDate.toLocaleDateString('sw-TZ', {
      day:   '2-digit',
      month: '2-digit',
      year:  'numeric',
    });

    // ── 3. Update landlord_notified_at ───────────────────────────────────
    const { error: updateErr } = await supabase
      .from('move_out_notices')
      .update({ landlord_notified_at: new Date().toISOString() })
      .eq('id', move_out_notice_id);

    if (updateErr) {
      console.error('[notify-landlord-move-out] update error:', updateErr.message);
    }

    // ── 4. Send SMS if landlord has a phone ─────────────────────────────
    let smsResult: Record<string, unknown> = { skipped: true, reason: 'no landlord phone' };

    if (landlordPhone) {
      const smsMessage =
        `Mpangaji ${tenantName} katika ${propertyName} amekuarifu ataondoka tarehe ${moveOutFormatted}. ` +
        `Ingia iRent sasa ili uweke chumba kama Coming Soon na upate mpangaji mpya mapema. ${APP_URL}`;

      const at_username = Deno.env.get('AT_USERNAME');
      const at_apiKey   = Deno.env.get('AT_API_KEY');

      if (!at_username || !at_apiKey) {
        throw new Error("Africa's Talking credentials missing");
      }

      const domain = at_username === 'sandbox'
        ? 'api.sandbox.africastalking.com'
        : 'api.africastalking.com';

      const payload = new URLSearchParams();
      payload.append('username', at_username);
      payload.append('to', landlordPhone);
      payload.append('message', smsMessage);

      const smsRes = await fetch(`https://${domain}/version1/messaging`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          apiKey: at_apiKey,
        },
        body: payload,
      });

      smsResult = await smsRes.json();
    }

    return new Response(
      JSON.stringify({ success: true, sms: smsResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[notify-landlord-move-out]', err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
