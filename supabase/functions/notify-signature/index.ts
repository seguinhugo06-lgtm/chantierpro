/**
 * notify-signature — Notifie l'artisan par email quand son devis vient d'être signé.
 *
 * Endpoint public (appelé avec l'anon key depuis la page publique de signature,
 * juste après le succès de la RPC sign_devis). La sécurité repose sur la
 * possession du signature_token (UUID non devinable) + des gardes serveur :
 *   - le devis doit être réellement signé (signature_data non nul)
 *   - la signature doit être récente (< 15 min) — pas de rejeu tardif
 *   - dédupliqué via events_log (une seule notification par devis)
 *
 * Usage: supabase.functions.invoke('notify-signature', { body: { token } })
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const APP_URL = Deno.env.get('APP_URL') || 'https://mallettico.fr';

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
      return json({ error: 'token manquant' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Charger le devis par son token de signature
    const { data: devis, error } = await supabase
      .from('devis')
      .select('id, numero, total_ttc, user_id, signature_data, signature_date, signataire_nom, client:clients(nom, prenom)')
      .eq('signature_token', token)
      .single();

    if (error || !devis) return json({ error: 'devis introuvable' }, 404);

    // 2. Gardes : signé, récent
    if (!devis.signature_data || !devis.signature_date) {
      return json({ error: 'devis non signé' }, 400);
    }
    const ageMs = Date.now() - new Date(devis.signature_date as string).getTime();
    if (Number.isNaN(ageMs) || ageMs > 15 * 60 * 1000) {
      return json({ error: 'signature trop ancienne' }, 400);
    }

    // 3. Déduplication (une notification par devis)
    const { data: already } = await supabase
      .from('events_log')
      .select('id')
      .eq('event_type', 'devis_signed_notified')
      .eq('entity_id', devis.id)
      .limit(1);
    if (already && already.length > 0) {
      return json({ success: true, deduped: true });
    }

    // 4. Email de l'artisan : compte auth, sinon email entreprise
    let artisanEmail: string | null = null;
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(devis.user_id as string);
      artisanEmail = userData?.user?.email ?? null;
    } catch { /* fallback ci-dessous */ }
    if (!artisanEmail) {
      const { data: ent } = await supabase
        .from('entreprise')
        .select('email')
        .eq('user_id', devis.user_id)
        .limit(1)
        .maybeSingle();
      artisanEmail = ent?.email ?? null;
    }
    if (!artisanEmail) return json({ error: 'email artisan introuvable' }, 404);

    // 5. Envoi via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) return json({ error: 'Resend non configuré' }, 500);

    const client = devis.client as { nom?: string; prenom?: string } | null;
    const clientNom = [client?.prenom, client?.nom].filter(Boolean).join(' ') || 'Votre client';
    const signataire = (devis.signataire_nom as string) || clientNom;
    const montant = fmtEUR(devis.total_ttc as number);

    const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1e293b;line-height:1.6;max-width:560px;margin:0 auto">
    <div style="text-align:center;padding:24px 0 8px">
      <div style="font-size:40px">✍️</div>
      <h2 style="margin:8px 0 0">Devis signé !</h2>
    </div>
    <p style="text-align:center;font-size:16px">
      <strong>${signataire}</strong> vient de signer le devis
      <strong>${devis.numero}</strong> d'un montant de <strong>${montant}</strong>.
    </p>
    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:10px">
        Ouvrir Mallettico
      </a>
    </div>
    <p style="font-size:13px;color:#64748b;text-align:center">
      Prochaine étape : transformez ce devis en facture d'acompte en un clic.
    </p>
  </div>`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Mallettico <${Deno.env.get('FROM_EMAIL') || 'noreply@mallettico.fr'}>`,
        to: [artisanEmail],
        subject: `✍️ Devis ${devis.numero} signé — ${montant}`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error('[notify-signature] Resend error:', errBody);
      return json({ error: 'envoi email échoué' }, 502);
    }

    // 6. Log (sert aussi de dédup)
    await supabase.from('events_log').insert([{
      event_type: 'devis_signed_notified',
      entity_type: 'devis',
      entity_id: devis.id,
      success: true,
      metadata: { numero: devis.numero, signataire },
      triggered_at: new Date().toISOString(),
    }]);

    return json({ success: true });
  } catch (error) {
    console.error('[notify-signature] Error:', error);
    return json({ error: (error as Error).message || 'Erreur interne' }, 500);
  }
});
