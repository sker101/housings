import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log("AzamPay Webhook Payload:", payload)

    // Example payload: { msisdn, amount, externalId, status, transactionId }
    const { externalId, status, transactionId, amount, msisdn } = payload

    if (!externalId) {
       throw new Error("Missing externalId (bookingId) in payload")
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    )

    if (status === "success") {
       // 1. Update booking
       const { data: booking, error: bookingError } = await supabase
         .from("bookings")
         .update({ status: "approved" })
         .eq("id", externalId)
         .select()
         .single()

       if (bookingError) throw bookingError

       // 2. Insert payment record
       const { error: paymentError } = await supabase
         .from("payment_records")
         .insert({
           booking_id: externalId,
           amount: Number(amount) || 0,
           status: "paid",
           reference: transactionId || `AZAM-${Date.now()}`,
           paid_at: new Date().toISOString()
         })

       if (paymentError) {
         console.error("Error creating payment record:", paymentError.message)
       }

       console.log(`Booking ${externalId} successfully paid and approved via AzamPay.`)
    } else {
       console.warn(`Payment for booking ${externalId} failed with status: ${status}`)
    }

    return new Response(JSON.stringify({ success: true, message: "Webhook received" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error("Error in azampay-webhook:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
