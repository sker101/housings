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
    const AZAMPAY_APP_NAME = Deno.env.get("AZAMPAY_APP_NAME") || "iRent"
    /** Set to "production" when using live AzamPay credentials and checkout. */
    const AZAMPAY_ENV = (Deno.env.get("AZAMPAY_ENV") || "sandbox").toLowerCase()
    const isSandbox = AZAMPAY_ENV !== "production" && AZAMPAY_ENV !== "live"

    let token = ""

    // 1. Get AzamPay Bearer Token dynamically
    // We try the Partner endpoint first, then the Aggregator endpoint
    const authBase =
      Deno.env.get("AZAMPAY_AUTH_BASE") ||
      (isSandbox
        ? "https://authenticator-sandbox.azampay.co.tz"
        : "https://authenticator.azampay.co.tz")
    const authEndpoints = [
      {
        url: `${authBase}/api/v1/gettoken`,
        payload: {
          appName: AZAMPAY_APP_NAME,
          clientId: AZAMPAY_CLIENT_ID,
          clientSecret: AZAMPAY_CLIENT_SECRET,
        }
      },
      {
        url: `${authBase}/AppRegistration/GenerateToken`,
        payload: {
          appName: AZAMPAY_APP_NAME,
          clientId: AZAMPAY_CLIENT_ID,
          clientSecret: AZAMPAY_CLIENT_SECRET,
        }
      }
    ]

    for (const auth of authEndpoints) {
      console.log(`Trying auth at: ${auth.url}`)
      try {
        const authResponse = await fetch(auth.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(auth.payload),
        })

        const responseText = await authResponse.text()
        console.log(`Auth Raw Response (${auth.url}):`, responseText)

        if (authResponse.ok && !responseText.includes("UnAuthorized")) {
          const authData = JSON.parse(responseText)
          token = authData.data?.accessToken || authData.accessToken
          if (token) break
        }
      } catch (e) {
        console.error(`Auth failed for ${auth.url}:`, e.message)
      }
    }
    
    if (!token) {
       throw new Error("AzamPay Auth Failed: Could not get valid token from any endpoint. Check your Client ID, Secret, and App Name.")
    }

    const shortBooking = bookingId.substring(0, 8)
    const shortTs = Date.now().toString().slice(-10)
    const attemptId = `${shortBooking}${shortTs}`
    const defaultPartnerCheckout = isSandbox
      ? "https://sandbox.azampay.co.tz/api/v1/Partner/PostCheckout"
      : "https://checkout.azampay.co.tz/api/v1/Partner/PostCheckout"
    const checkoutUrl = Deno.env.get("AZAMPAY_CHECKOUT_URL") || defaultPartnerCheckout
    
    // 2.5 Save the Payment Reference to the Booking
    console.log(`Saving payment reference ${attemptId} to booking ${bookingId}...`)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    )
    
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ payment_reference: attemptId })
      .eq("id", bookingId)
    
    if (updateError) {
      console.error("Error saving payment reference:", updateError)
      throw new Error(`Failed to initialize payment session: ${updateError.message}`)
    }

        const origin =
          req.headers.get("origin") ||
          Deno.env.get("PUBLIC_APP_URL") ||
          Deno.env.get("APP_ORIGIN") ||
          "https://housings-pied.vercel.app"
        console.log(`Using origin for redirects: ${origin}`)

        const checkoutResponse = await fetch(checkoutUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "X-API-Key": AZAMPAY_APP_NAME
          },
          body: JSON.stringify({
            appName: AZAMPAY_APP_NAME,
            clientId: AZAMPAY_CLIENT_ID,
            vendorId: AZAMPAY_CLIENT_ID,
            vendorName: AZAMPAY_APP_NAME,
            amount: Math.floor(Number(amount)).toString(),
            currency: "TZS",
            externalId: attemptId,
            language: "en",
            requestOrigin: "application",
            redirectFailURL: `${origin}/my-room?payment=failed`,
            redirectSuccessURL: `${origin}/my-room?payment=success`,
            cart: {
          items: [
            {
              name: "Room Reservation" // SDK only expects name here
            }
          ]
        }
      }),
    })

    const responseText = await checkoutResponse.text()
    console.log("Raw Partner Response:", responseText)

    let result
    try {
      result = JSON.parse(responseText)
    } catch (e) {
      // If it's not JSON but Status 200, let's see if it's a raw URL
      if (checkoutResponse.ok && (responseText.startsWith("http") || responseText.includes("azampay.co.tz"))) {
         return new Response(
           JSON.stringify({ success: true, checkout_url: responseText.trim() }),
           { headers: { ...corsHeaders, "Content-Type": "application/json" } }
         )
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `AzamPay returned non-JSON response (Status ${checkoutResponse.status})`,
          rawText: responseText.substring(0, 500)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!checkoutResponse.ok || !result.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message || (result.errors ? JSON.stringify(result.errors) : "AzamPay Checkout Failed"),
          raw: result
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // PostCheckout returns `data` as a string URL (see AzamPay SDK docs); normalize for the app.
    const dataField = result.data
    const checkout_url =
      typeof dataField === "string" && /^https?:\/\//i.test(dataField.trim())
        ? dataField.trim()
        : typeof dataField === "object" && dataField != null && typeof (dataField as { url?: string }).url === "string"
          ? (dataField as { url: string }).url
          : typeof result.checkout_url === "string"
            ? result.checkout_url
            : typeof result.url === "string"
              ? result.url
              : undefined

    if (!checkout_url) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "AzamPay checkout succeeded but no payment URL was returned. Check API response shape.",
          raw: result,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    return new Response(
      JSON.stringify({ ...result, success: true, checkout_url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("Critical Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
