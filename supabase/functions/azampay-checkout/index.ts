import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { bookingId, amount, name, email, phone, months } = await req.json()

    if (!bookingId || !amount) {
      throw new Error("Missing required fields: bookingId or amount")
    }

    const AZAMPAY_CLIENT_ID = Deno.env.get("AZAMPAY_CLIENT_ID") || "MOCK_CLIENT_ID"
    const AZAMPAY_CLIENT_SECRET = Deno.env.get("AZAMPAY_CLIENT_SECRET") || "MOCK_CLIENT_SECRET"
    const AZAMPAY_TOKEN = Deno.env.get("AZAMPAY_TOKEN")
    const AZAMPAY_APP_NAME = Deno.env.get("AZAMPAY_APP_NAME") || "CampusStay"

    let token = AZAMPAY_TOKEN

    // 1. Get AzamPay Bearer Token (if not provided statically)
    if (!token || token === "MOCK_TOKEN") {
      const authResponse = await fetch("https://authenticator-sandbox.azampay.co.tz/AppRegistration/GenerateToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName: AZAMPAY_APP_NAME,
          clientId: AZAMPAY_CLIENT_ID,
          clientSecret: AZAMPAY_CLIENT_SECRET,
        }),
      })

      const authData = await authResponse.json()
      console.log("Auth Response:", authData)
      
      if (authData.success && authData.data?.accessToken) {
        token = authData.data.accessToken
      } else if (AZAMPAY_CLIENT_ID === "MOCK_CLIENT_ID") {
         // Fallback for local dev/testing without keys
         return new Response(
           JSON.stringify({ 
             success: true, 
             checkout_url: `https://sandbox.azampay.co.tz/mock-checkout?bookingId=${bookingId}&amount=${amount}` 
           }),
           { headers: { ...corsHeaders, "Content-Type": "application/json" } }
         )
      } else {
        throw new Error(`AzamPay Auth Failed: ${authData.message || "Unknown error"}`)
      }
    }

    // 2. Initiate Checkout
    // We add a timestamp to externalId to ensure every payment attempt is unique in AzamPay
    const attemptId = `${bookingId}_${Date.now()}`

    const checkoutResponse = await fetch("https://sandbox.azampay.co.tz/azampay/mno/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency: "TZS",
        externalId: attemptId,
        name: name || "CampusStay Tenant",
        phoneNumber: phone || "255700000000",
        email: email || "tenant@campusstay.co",
        appName: AZAMPAY_APP_NAME,
        redirectFail: `${req.headers.get("origin")}/my-room?payment=failed`,
        redirectSuccess: `${req.headers.get("origin")}/my-room?payment=success`,
        vendorId: AZAMPAY_CLIENT_ID, 
        merchantMobileNumber: "255700000000", 
      }),
    })

    const checkoutData = await checkoutResponse.json()
    console.log("Checkout Response:", checkoutData)

    return new Response(
      JSON.stringify(checkoutData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Error in azampay-checkout:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
