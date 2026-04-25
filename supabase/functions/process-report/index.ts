import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  const body = await req.json().catch(() => ({}));
  console.log('[process-report] Received:', body);
  
  const { listingId, reason, details } = body;

  if (!listingId || !reason) {
    return new Response(JSON.stringify({ error: 'listingId and reason are required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  try {
    // Get auth header if present (optional)
    const authHeader = req.headers.get('Authorization') || '';
    let reporterId = null;
    let reporterHasBooking = false;
    
    // Try to get user from auth header
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        // Verify token via REST
        const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': serviceKey
          }
        });
        
        if (authResponse.ok) {
          const userData = await authResponse.json();
          reporterId = userData.id;
          
          // Check for booking using REST
          const bookingResponse = await fetch(
            `${supabaseUrl}/rest/v1/bookings?select=id&listing_id=eq.${listingId}&tenant_id=eq.${reporterId}&status=eq.paid&limit=1`,
            {
              headers: {
                'Authorization': `Bearer ${serviceKey}`,
                'apikey': serviceKey
              }
            }
          );
          
          if (bookingResponse.ok) {
            const bookings = await bookingResponse.json();
            reporterHasBooking = bookings && bookings.length > 0;
          }
        }
      } catch (e) {
        console.log('[process-report] Auth check failed, proceeding as guest');
      }
    }

    console.log('[process-report] Inserting:', { listingId, reporterId, reason, reporterHasBooking });

    // Insert report via REST API
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/listing_reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        listing_id: listingId,
        reporter_id: reporterId,
        reason,
        details: details || null,
        reporter_has_booking: reporterHasBooking,
        status: 'pending'
      })
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error('[process-report] Insert failed:', errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to submit report', 
        details: errorText 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const report = await insertResponse.json();
    console.log('[process-report] Success:', report);

    return new Response(JSON.stringify({ 
      success: true, 
      reportId: report[0]?.id,
      message: 'Report submitted successfully. Thank you for helping keep our community safe.'
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('[process-report] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process report', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
