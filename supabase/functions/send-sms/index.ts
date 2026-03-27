import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * send-sms — Edge Function pour envoyer des SMS via Twilio
 *
 * Actions: send_sms, send_reminder, send_jarrive
 *
 * Usage: supabase.functions.invoke('send-sms', { body: { action: 'send_sms', to: '+33612345678', message: '...' } })
 */

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    // Twilio credentials from env
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER') || '+33000000000';

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Twilio non configuré. Ajoutez TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN dans les secrets Supabase.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'send_sms':
      case 'send_reminder':
      case 'send_jarrive': {
        const { to, message, entreprise_nom } = params;

        if (!to || !message) {
          return new Response(
            JSON.stringify({ error: 'Paramètres manquants: to, message' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Format phone number for France
        let formattedTo = to.replace(/\s/g, '').replace(/\./g, '');
        if (formattedTo.startsWith('0')) {
          formattedTo = '+33' + formattedTo.substring(1);
        }
        if (!formattedTo.startsWith('+')) {
          formattedTo = '+33' + formattedTo;
        }

        // Prepend entreprise name if provided
        const fullMessage = entreprise_nom
          ? `[${entreprise_nom}] ${message}`
          : message;

        // Send via Twilio REST API
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const authHeader = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

        const twilioResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: formattedTo,
            From: TWILIO_FROM_NUMBER,
            Body: fullMessage.substring(0, 1600), // SMS max length
          }),
        });

        const result = await twilioResponse.json();

        if (!twilioResponse.ok) {
          console.error('[send-sms] Twilio error:', result);
          return new Response(
            JSON.stringify({ error: result.message || 'Erreur Twilio', code: result.code }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[send-sms] SMS sent to ${formattedTo} (SID: ${result.sid})`);

        return new Response(
          JSON.stringify({
            success: true,
            sid: result.sid,
            status: result.status,
            to: formattedTo,
            action,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Action inconnue: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[send-sms] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
