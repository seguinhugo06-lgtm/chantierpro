import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * send-email — Edge Function pour envoyer des emails via Resend
 *
 * Actions: send_email, send_campaign, send_review_request
 *
 * Usage: supabase.functions.invoke('send-email', { body: { action: 'send_email', to: 'client@email.com', subject: '...', html: '...' } })
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Anti-relais ouvert : verify_jwt laisse passer l'anon key (JWT public,
    // embarqué dans le bundle). On exige un utilisateur connecté ou le
    // service_role — sinon n'importe qui peut émettre depuis notre domaine.
    const authJwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    let jwtRole = '';
    try {
      const payload = JSON.parse(atob(authJwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      jwtRole = payload?.role || '';
    } catch { /* jwt illisible → refus */ }
    if (jwtRole !== 'authenticated' && jwtRole !== 'service_role') {
      return new Response(
        JSON.stringify({ error: 'Authentification requise' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...params } = await req.json();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@mallettico.fr';

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Resend non configuré. Ajoutez RESEND_API_KEY dans les secrets Supabase.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'send_email':
      case 'send_campaign':
      case 'send_review_request': {
        const { to, subject, html, text, from_name, reply_to, attachments } = params;

        if (!to || !subject) {
          return new Response(
            JSON.stringify({ error: 'Paramètres manquants: to, subject' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Build email payload for Resend
        const emailPayload: Record<string, unknown> = {
          from: from_name ? `${from_name} <${FROM_EMAIL}>` : FROM_EMAIL,
          to: Array.isArray(to) ? to : [to],
          subject,
        };

        if (html) emailPayload.html = html;
        if (text) emailPayload.text = text;
        if (!html && !text) emailPayload.text = subject; // Fallback
        if (reply_to) emailPayload.reply_to = reply_to;

        // Pièces jointes (ex. PDF du devis/facture) : Resend attend
        // [{ filename, content }] où content est une chaîne base64.
        if (Array.isArray(attachments) && attachments.length > 0) {
          emailPayload.attachments = attachments;
        }

        // Add tracking pixel for campaign emails
        if (action === 'send_campaign' && html) {
          emailPayload.html = html + '<img src="https://mallettico.fr/api/track/open?id={{email_id}}" width="1" height="1" style="display:none" />';
        }

        // Send via Resend API
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload),
        });

        const result = await resendResponse.json();

        if (!resendResponse.ok) {
          console.error('[send-email] Resend error:', result);
          return new Response(
            JSON.stringify({ error: result.message || 'Erreur Resend', details: result }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[send-email] Email sent to ${to} (ID: ${result.id})`);

        return new Response(
          JSON.stringify({
            success: true,
            id: result.id,
            to,
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
    console.error('[send-email] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
