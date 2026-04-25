import { createServiceClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  const payload = await req.json().catch(() => null);
  const listingId = payload?.listingId;

  if (!listingId || typeof listingId !== 'string') {
    return new Response(JSON.stringify({ error: 'listingId is required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  try {
    console.log('[increment-view] Processing view for listing:', listingId);
    
    // Use service role client - bypasses all auth
    const supabase = createServiceClient();
    
    // First check if listing exists and is approved
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, status, view_count')
      .eq('id', listingId)
      .single();
    
    if (listingError) {
      console.error('[increment-view] Listing fetch error:', listingError);
      return new Response(JSON.stringify({ ok: true, error: listingError.message }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    if (!listing) {
      console.log('[increment-view] Listing not found:', listingId);
      return new Response(JSON.stringify({ ok: false, error: 'Listing not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Only increment if listing is approved
    if (listing.status !== 'approved') {
      console.log('[increment-view] Listing not approved, skipping view count:', listingId);
      return new Response(JSON.stringify({ ok: true, viewCount: listing.view_count || 0, skipped: true }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Direct update using service role (bypasses RLS)
    const { error: updateError } = await supabase
      .from('listings')
      .update({ view_count: (listing.view_count || 0) + 1 })
      .eq('id', listingId);
    
    if (updateError) {
      console.error('[increment-view] Update error:', updateError);
      return new Response(JSON.stringify({ ok: true, error: updateError.message, viewCount: listing.view_count || 0 }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const newCount = (listing.view_count || 0) + 1;
    console.log('[increment-view] View count updated:', listingId, newCount);
    
    return new Response(JSON.stringify({ ok: true, viewCount: newCount }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
    
  } catch (error) {
    console.error('[increment-view] Unexpected error:', error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
