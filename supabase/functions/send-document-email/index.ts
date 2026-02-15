/**
 * send-document-email — Supabase Edge Function
 *
 * Sends devis/facture documents by email using Resend API.
 * Called from the front-end when user clicks "Envoyer par email".
 *
 * Environment variables required:
 *   RESEND_API_KEY — Resend.com API key
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-provided by Supabase
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured (RESEND_API_KEY missing)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      to,               // recipient email
      subject,          // email subject
      documentType,     // 'devis' | 'facture'
      documentNumero,   // e.g. DEV-2026-00001
      documentId,       // document ID for logging
      companyName,      // sender company name
      companyEmail,     // sender company email (reply-to)
      clientName,       // recipient name
      totalTTC,         // amount
      validityDays,     // validity period (for devis)
      customMessage,    // optional custom message from user
    } = body;

    if (!to || !subject || !documentNumero) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, documentNumero' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build professional email HTML
    const isDevis = documentType === 'devis';
    const docLabel = isDevis ? 'devis' : 'facture';
    const amountFormatted = totalTTC
      ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalTTC)
      : '';

    const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 20px;">${companyName || 'ChantierPro'}</h1>
  </div>

  <div style="border: 1px solid #e5e7eb; border-top: 0; padding: 24px; border-radius: 0 0 12px 12px;">
    <p>Bonjour ${clientName || ''},</p>

    ${customMessage ? `<p>${customMessage}</p>` : `<p>${isDevis
      ? `Suite à notre échange, veuillez trouver ci-dessous les détails de notre ${docLabel} n° <strong>${documentNumero}</strong>.`
      : `Veuillez trouver ci-dessous les détails de notre ${docLabel} n° <strong>${documentNumero}</strong>.`
    }</p>`}

    <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Document</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600;">${documentNumero}</td>
        </tr>
        ${amountFormatted ? `<tr>
          <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Montant TTC</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600; font-size: 18px; color: #f97316;">${amountFormatted}</td>
        </tr>` : ''}
        ${isDevis && validityDays ? `<tr>
          <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Validité</td>
          <td style="padding: 4px 0; text-align: right;">${validityDays} jours</td>
        </tr>` : ''}
      </table>
    </div>

    ${isDevis ? `<p style="font-size: 13px; color: #6b7280;">Ce devis est valable ${validityDays || 30} jours à compter de sa date d'émission.</p>` : ''}

    <p>N'hésitez pas à nous contacter pour toute question.</p>

    <p>Cordialement,<br/><strong>${companyName || ''}</strong></p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
    <p style="font-size: 11px; color: #9ca3af; text-align: center;">
      ${companyName || ''}${companyEmail ? ` — ${companyEmail}` : ''}<br/>
      Envoyé via ChantierPro
    </p>
  </div>
</body>
</html>`;

    // Send via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: companyEmail
          ? `${companyName || 'ChantierPro'} <onboarding@resend.dev>`
          : 'ChantierPro <onboarding@resend.dev>',
        reply_to: companyEmail || undefined,
        to: [to],
        subject,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      // Log failure
      await supabase.from('email_logs').insert({
        user_id: user.id,
        recipient: to,
        subject,
        document_type: documentType,
        document_id: documentId,
        status: 'failed',
        error_message: JSON.stringify(resendData),
      });

      return new Response(
        JSON.stringify({ error: 'Email send failed', details: resendData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log success
    await supabase.from('email_logs').insert({
      user_id: user.id,
      recipient: to,
      subject,
      document_type: documentType,
      document_id: documentId,
      status: 'sent',
    });

    return new Response(
      JSON.stringify({ success: true, emailId: resendData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('send-document-email error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
