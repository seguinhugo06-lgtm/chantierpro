/**
 * send-lifecycle-email — Supabase Edge Function
 *
 * Sends lifecycle emails using Resend API:
 *   - welcome: New user signup
 *   - trial_ending: 3 days before trial ends
 *   - trial_expired: Trial has ended
 *   - payment_success: Subscription payment confirmed
 *   - payment_failed: Payment attempt failed
 *
 * Called from database triggers (handle-db-events) or scheduled CRON.
 *
 * Environment variables required:
 *   RESEND_API_KEY — Resend.com API key
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Email templates ────────────────────────────────────────────────────────

const TEMPLATES: Record<string, { subject: string; html: (data: any) => string }> = {
  welcome: {
    subject: 'Bienvenue sur ChantierPro !',
    html: (data) => `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:16px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:56px;height:56px;background:#f97316;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;">
          <span style="font-size:28px;">🏗️</span>
        </div>
      </div>
      <h1 style="font-size:24px;font-weight:700;color:#0f172a;text-align:center;margin:0 0 8px;">
        Bienvenue sur ChantierPro !
      </h1>
      <p style="color:#64748b;text-align:center;margin:0 0 24px;font-size:15px;">
        Votre assistant de gestion pour artisans du BTP
      </p>
      <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:14px;color:#334155;font-weight:600;">Pour bien commencer :</p>
        <ol style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:2;">
          <li>Configurez votre entreprise dans Param\u00e8tres</li>
          <li>Ajoutez vos articles dans le Catalogue</li>
          <li>Cr\u00e9ez votre premier devis</li>
        </ol>
      </div>
      <div style="text-align:center;">
        <a href="https://chantierpro.vercel.app" style="display:inline-block;background:#f97316;color:white;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;font-size:14px;">
          Acc\u00e9der \u00e0 ChantierPro
        </a>
      </div>
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px;">
      ChantierPro — Gestion de chantier pour artisans BTP
    </p>
  </div>
</body>
</html>`
  },

  trial_ending: {
    subject: 'Votre essai ChantierPro se termine dans 3 jours',
    html: (data) => `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:16px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:48px;">⏰</span>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:#0f172a;text-align:center;margin:0 0 8px;">
        Plus que 3 jours d'essai
      </h1>
      <p style="color:#64748b;text-align:center;margin:0 0 24px;font-size:15px;">
        Votre essai Pro se termine bient\u00f4t. Passez au Pro pour garder toutes vos fonctionnalit\u00e9s.
      </p>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#9a3412;">
          <strong>Plan Pro — 14,90\u20ac/mois</strong><br/>
          Devis illimit\u00e9s, signatures, export comptable, IA, et plus encore.
        </p>
      </div>
      <div style="text-align:center;">
        <a href="https://chantierpro.vercel.app" style="display:inline-block;background:#f97316;color:white;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;font-size:14px;">
          Activer le plan Pro
        </a>
      </div>
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px;">
      ChantierPro — Gestion de chantier pour artisans BTP
    </p>
  </div>
</body>
</html>`
  },

  trial_expired: {
    subject: 'Votre essai ChantierPro est terminé',
    html: (data) => `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:16px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:48px;">📋</span>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:#0f172a;text-align:center;margin:0 0 8px;">
        Votre essai est termin\u00e9
      </h1>
      <p style="color:#64748b;text-align:center;margin:0 0 24px;font-size:15px;">
        Vous \u00eates maintenant sur le plan Gratuit. Vos donn\u00e9es sont conserv\u00e9es et accessibles.
      </p>
      <div style="background:#f1f5f9;border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:14px;color:#334155;font-weight:600;">Ce que vous gardez :</p>
        <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.8;">
          <li>3 devis par mois</li>
          <li>5 clients</li>
          <li>1 chantier actif</li>
          <li>Planning</li>
        </ul>
      </div>
      <div style="text-align:center;">
        <a href="https://chantierpro.vercel.app" style="display:inline-block;background:#f97316;color:white;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;font-size:14px;">
          Passer au Pro — 14,90\u20ac/mois
        </a>
      </div>
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px;">
      ChantierPro — Gestion de chantier pour artisans BTP
    </p>
  </div>
</body>
</html>`
  },

  payment_success: {
    subject: 'Paiement confirmé — ChantierPro Pro',
    html: (data) => `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:16px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:48px;">✅</span>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:#0f172a;text-align:center;margin:0 0 8px;">
        Paiement confirm\u00e9
      </h1>
      <p style="color:#64748b;text-align:center;margin:0 0 24px;font-size:15px;">
        Merci pour votre confiance ! Votre plan Pro est actif.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#166534;">
          <strong>Plan Pro</strong> — ${data?.amount || '14,90\u20ac'}<br/>
          Prochain renouvellement : ${data?.nextBilling || 'dans 30 jours'}
        </p>
      </div>
      <div style="text-align:center;">
        <a href="https://chantierpro.vercel.app" style="display:inline-block;background:#f97316;color:white;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;font-size:14px;">
          Continuer sur ChantierPro
        </a>
      </div>
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px;">
      ChantierPro — Gestion de chantier pour artisans BTP
    </p>
  </div>
</body>
</html>`
  },

  payment_failed: {
    subject: 'Échec de paiement — Action requise',
    html: (data) => `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:16px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:48px;">⚠️</span>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:#0f172a;text-align:center;margin:0 0 8px;">
        \u00c9chec de paiement
      </h1>
      <p style="color:#64748b;text-align:center;margin:0 0 24px;font-size:15px;">
        Nous n'avons pas pu traiter votre paiement. Veuillez mettre \u00e0 jour votre moyen de paiement.
      </p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#991b1b;">
          Sans action de votre part, votre plan Pro sera d\u00e9sactiv\u00e9 dans 7 jours.
        </p>
      </div>
      <div style="text-align:center;">
        <a href="https://chantierpro.vercel.app" style="display:inline-block;background:#ef4444;color:white;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;font-size:14px;">
          Mettre \u00e0 jour mon paiement
        </a>
      </div>
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px;">
      ChantierPro — Gestion de chantier pour artisans BTP
    </p>
  </div>
</body>
</html>`
  }
};

// ─── Handler ────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { type, to, data } = await req.json();

    if (!type || !to) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, to' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const template = TEMPLATES[type];
    if (!template) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${type}. Available: ${Object.keys(TEMPLATES).join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ChantierPro <noreply@chantierpro.fr>',
        to: [to],
        subject: template.subject,
        html: template.html(data || {}),
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('Resend error:', res.status, errorBody);
      return new Response(
        JSON.stringify({ error: `Resend API error: ${res.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await res.json();
    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('send-lifecycle-email error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
