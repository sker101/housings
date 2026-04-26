import { corsHeaders } from '../_shared/cors.ts';

// Get environment variables at the top level
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

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

  try {
    // Validate environment
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
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

    // Identify reporter if possible
    const authHeader = req.headers.get('Authorization') || '';
    let reporterId = null;
    let reporterHasBooking = false;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      
      // Verify user via Auth API
      const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SERVICE_ROLE_KEY
        }
      });

      if (userResp.ok) {
        const userData = await userResp.json();
        reporterId = userData.id;
        
        // Check for paid booking via REST API
        const bookingQuery = new URLSearchParams({
          select: 'id',
          listing_id: `eq.${listingId}`,
          tenant_id: `eq.${reporterId}`,
          status: 'eq.paid',
          limit: '1'
        });
        
        const bookingResp = await fetch(`${SUPABASE_URL}/rest/v1/bookings?${bookingQuery}`, {
          headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY
          }
        });

        if (bookingResp.ok) {
          const bookings = await bookingResp.json();
          reporterHasBooking = Array.isArray(bookings) && bookings.length > 0;
        }
      }
    }

    console.log('[process-report] Inserting report into database...');

    // Insert the report via REST API
    const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/listing_reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
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

    const resultText = await insertResp.text();
    let result;
    try {
      result = JSON.parse(resultText);
    } catch {
      result = resultText;
    }

    if (!insertResp.ok) {
      console.error('[process-report] Insert error:', result);
      return new Response(JSON.stringify({ 
        error: 'Failed to submit report', 
        details: typeof result === 'object' ? (result.message || JSON.stringify(result)) : result
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // PostgREST returns an array for POST with return=representation
    const reportId = Array.isArray(result) ? result[0]?.id : result?.id;

    console.log('[process-report] Success! Report ID:', reportId);

    return new Response(JSON.stringify({ 
      success: true, 
      reportId: reportId,
      message: 'Report submitted successfully. Thank you for helping keep our community safe.'
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('[process-report] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'An unexpected error occurred while processing your report', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
