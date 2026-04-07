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

    const AZAMPAY_APP_ID = Deno.env.get("AZAMPAY_APP_ID") || "MOCK_APP_ID"
    const AZAMPAY_APP_SECRET = Deno.env.get("AZAMPAY_APP_SECRET") || "MOCK_APP_SECRET"
    const AZAMPAY_VENDOR_ID = Deno.env.get("AZAMPAY_VENDOR_ID") || "MOCK_VENDOR_ID"

    // 1. Get AzamPay Bearer Token
    const authResponse = await fetch("https://authenticator-sandbox.azampay.co.tz/AppRegistration/GenerateToken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appName: "CampusStay",
        clientId: AZAMPAY_APP_ID,
        clientSecret: AZAMPAY_APP_SECRET,
      }),
    })

    const authData = await authResponse.json()
    console.log("Auth Response:", authData)
    
    if (!authData.success) {
      // In sandbox/mock if keys are missing, we might pretend it worked for UI dev
      if (AZAMPAY_APP_ID === "MOCK_APP_ID") {
         return new Response(
           JSON.stringify({ 
             success: true, 
             checkout_url: `https://sandbox.azampay.co.tz/mock-checkout?bookingId=${bookingId}&amount=${amount}` 
           }),
           { headers: { ...corsHeaders, "Content-Type": "application/json" } }
         )
      }
      throw new Error(`AzamPay Auth Failed: ${authData.message || "Unknown error"}`)
    }

    const token = authData.data.accessToken

    // 2. Initiate Checkout
    const checkoutResponse = await fetch("https://sandbox.azampay.co.tz/azampay/mno/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency: "TZS",
        externalId: bookingId,
        name: name || "CampusStay Tenant",
        phoneNumber: phone || "255700000000",
        email: email || "tenant@campusstay.co",
        appName: "CampusStay",
        redirectFail: `${req.headers.get("origin")}/my-room?payment=failed`,
        redirectSuccess: `${req.headers.get("origin")}/my-room?payment=success`,
        vendorId: AZAMPAY_VENDOR_ID,
        merchantMobileNumber: "255700000000", // Example merchant number
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
