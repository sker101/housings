import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
}

/** AzamPay sandbox/live callbacks use mixed key casing; map to canonical fields. */
function pickPayloadField(payload: Record<string, unknown>, keys: string[]): unknown {
  const byLower = Object.fromEntries(
    Object.entries(payload).map(([k, v]) => [k.toLowerCase(), v]),
  )
  for (const key of keys) {
    const v = byLower[key.toLowerCase()]
    if (v !== undefined && v !== null && String(v).length > 0) return v
  }
  return undefined
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const payload = (await req.json()) as Record<string, unknown>
    console.log("--- AzamPay Webhook Received ---")
    console.log("Raw Payload:", JSON.stringify(payload, null, 2))

    const externalId = String(
      pickPayloadField(payload, [
        "externalId",
        "externalid",
        "externalReference",
        "externalreference",
        "external_id",
      ]) ?? "",
    )
    const rawStatus = String(
      pickPayloadField(payload, [
        "status",
        "transactionStatus",
        "transactionstatus",
        "transaction_status",
      ]) ?? "",
    )
    const status = rawStatus.toLowerCase()
    const transactionId = String(
      pickPayloadField(payload, [
        "transactionId",
        "transactionid",
        "transid",
        "transId",
        "reference",
        "Reference",
      ]) ?? "",
    )
    const amount = pickPayloadField(payload, ["amount", "Amount"])
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    )

    // Log the incoming webhook (New debugging step)
    await supabase.from("webhook_logs").insert({
        payload,
        status: status || "unknown"
    }).catch(e => console.error("Error logging webhook:", e));

    if (!externalId || externalId === "undefined") {
       console.error("Critical: Received AzamPay webhook without externalId")
       return new Response(JSON.stringify({ success: false, message: "Missing externalId" }), {
         status: 200, // Return 200 so AzamPay doesn't retry broken requests indefinitely
         headers: { ...corsHeaders, "Content-Type": "application/json" }
       })
    }

    const paid =
      status === "success" ||
      status === "completed" ||
      status === "successful" ||
      rawStatus.toLowerCase() === "success"

    if (paid) {
       console.log(`Processing SUCCESS payment for Ref: ${externalId}`)
       
       // 1. Find and Update booking by payment_reference
       const { data: booking, error: bookingError } = await supabase
         .from("bookings")
         .update({ status: "approved" })
         .eq("payment_reference", externalId)
         .select()
         .single()
 
       if (bookingError) {
         console.error(`Database Error finding booking Ref ${externalId}:`, bookingError.message)
         throw bookingError
       }
 
       if (!booking) {
         console.warn(`Anchor Misaligned: No booking found with payment_reference ${externalId}`)
         return new Response(JSON.stringify({ success: false, message: "Booking not found" }), {
           headers: { ...corsHeaders, "Content-Type": "application/json" }
         })
       }
 
       // 2. Insert payment record
       const { error: paymentError } = await supabase
         .from("payment_records")
         .insert({
           booking_id: booking.id,
           amount: Number(amount) || 0,
           status: "paid",
           reference: transactionId || `AZAM-${Date.now()}`,
           paid_at: new Date().toISOString()
         })
 
       if (paymentError) {
         console.error("Error creating payment record:", paymentError.message)
       }
 
       console.log(`Automation Complete: Booking ${booking.id} approved and room locked.`)
    } else {
       console.warn(`Payment for Ref ${externalId} unsuccessful. Status: ${status}`)
    }

    return new Response(JSON.stringify({ success: true, message: "Webhook acknowledged" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error("Webhook Internal Failure:", error.message)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200, // Still return 200 so AzamPay sees we handled the request
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
