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
 *
 * Rétractation en ligne (C. conso. L221-21, D221-5 ; migration 086) :
 *   supabase.functions.invoke('notify-signature', { body: { token, evenement: 'retractation' } })
 *   → accusé de réception au client (adresse qu'il a donnée, enregistrée par retracter_devis, et copie à
 *     l'adresse de sa fiche si elle diffère) et avis à l'artisan. Gardes : rétractation enregistrée en base ;
 *     un seul accusé (réservé par une mise à jour conditionnelle de retractation_accuse_le, rendu si l'envoi
 *     échoue) ; plafond quotidien d'envois du compte de l'artisan (reserver_envoi_email, 077) ; textes dans
 *     retractation.ts.
 *   Appelée aussi par l'artisan (bouton « Envoyer l'accusé », fiche du devis) et, toutes les 10 minutes, par le
 *   job pg_cron « accuses-retractation » (migration 089) pour les accusés que la page du client n'a pas pu
 *   envoyer. Le job n'envoie pas de jeton : déployer SANS vérification de jeton (la sécurité repose sur le lien de
 *   signature, pas sur la clé publique) :
 *     npx supabase functions deploy notify-signature --no-verify-jwt --project-ref kofsbgxkrmryfetevetn
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { echapperHtml, estEmail } from '../_shared/adresses.ts';
import { accuseReception, avisArtisan, type DevisRetracte, type Message } from './retractation.ts';

const APP_URL = Deno.env.get('APP_URL') || 'https://mallettico.fr';

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

/** Envoi par Resend ; vrai si le message est parti. Ne lève jamais (une panne réseau rend faux). */
async function envoyer(message: Message): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    console.error('[notify-signature] Resend non configuré');
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Mallettico <${Deno.env.get('FROM_EMAIL') || 'noreply@mallettico.fr'}>`,
        to: [message.a],
        ...(message.repondreA ? { reply_to: message.repondreA } : {}),
        subject: message.sujet,
        html: message.html,
        text: message.texte,
      }),
    });
    if (!res.ok) console.error('[notify-signature] Resend error:', await res.text());
    return res.ok;
  } catch (e) {
    console.error('[notify-signature] Resend injoignable :', (e as Error).message);
    return false;
  }
}

/** Plafond quotidien par compte (secret EMAIL_LIMITE_JOUR, 50 par défaut), comme send-email. */
function limiteJour(): number {
  const lue = Number.parseInt(Deno.env.get('EMAIL_LIMITE_JOUR') ?? '', 10);
  return Number.isFinite(lue) && lue > 0 ? lue : 50;
}

// ─── Rétractation en ligne : accusé de réception (D221-5) et avis à l'artisan ───
// deno-lint-ignore no-explicit-any
async function traiterRetractation(supabase: any, token: string): Promise<Response> {
  const { data: devis, error } = await supabase
    .from('devis')
    .select('id, numero, date, user_id, organization_id, client_id, entreprise_id, signature_date, travaux_urgents, execution_anticipee_le, retractation_le, retractation_nom, retractation_email, retractation_accuse_le')
    .eq('signature_token', token)
    .maybeSingle();
  if (error || !devis) return json({ error: 'devis introuvable' }, 404);
  if (!devis.retractation_le) return json({ error: 'aucune rétractation enregistrée' }, 400);
  if (devis.retractation_accuse_le) return json({ success: true, deja: true });

  // Un seul accusé : on réserve l'envoi avant de le faire (deux appels simultanés n'en envoient qu'un)
  const maintenant = new Date().toISOString();
  const { data: reserve, error: errReserve } = await supabase
    .from('devis')
    .update({ retractation_accuse_le: maintenant })
    .eq('id', devis.id)
    .is('retractation_accuse_le', null)
    .select('id');
  if (errReserve) {
    console.error('[notify-signature] réservation de l\'accusé impossible :', errReserve.message);
    return json({ error: 'accusé non envoyé' }, 500);
  }
  if (!reserve || reserve.length === 0) return json({ success: true, deja: true });
  const rendre = () => supabase.from('devis').update({ retractation_accuse_le: null }).eq('id', devis.id);

  // L'entreprise du devis (sinon la fiche par défaut de son auteur) : nom, coordonnées, adresse de réponse
  const { data: fiches } = await supabase
    .from('entreprise')
    .select('id, nom, adresse, telephone, email, is_default, created_at')
    .eq('user_id', devis.user_id);
  const fiche = (fiches || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
    Number(b.id === devis.entreprise_id) - Number(a.id === devis.entreprise_id)
    || Number(!!b.is_default) - Number(!!a.is_default)
    || String(a.created_at).localeCompare(String(b.created_at)))[0] || {};

  const echec = async (statut: number, message: string) => {
    const { error: errRendre } = await rendre();
    if (errRendre) console.error(`[notify-signature] ACCUSÉ NON ENVOYÉ ET RÉSERVATION GARDÉE devis=${devis.id} : ${errRendre.message}`);
    return json({ error: message }, statut);
  };

  const accuse = accuseReception(devis as DevisRetracte, fiche);
  if (!accuse) return await echec(400, 'adresse de l\'accusé invalide');
  // Copie à l'adresse de la fiche du client (prise en base) : s'il n'est pas l'auteur de la déclaration (quelqu'un
  // d'autre détient le lien), il l'apprend (relecture gardien-securite du 12 oct. 2026)
  let copie: typeof accuse | null = null;
  if (devis.client_id) {
    const { data: client } = await supabase
      .from('clients').select('email, user_id, organization_id').eq('id', devis.client_id).maybeSingle();
    const adresse = String(client?.email || '').trim().toLowerCase();
    const duCompte = client && (client.user_id === devis.user_id || (devis.organization_id && client.organization_id === devis.organization_id));
    // Même contenu (l'adresse saisie dans la déclaration y reste), envoyé aussi à l'adresse de la fiche
    if (duCompte && adresse && adresse !== accuse.a && estEmail(adresse)) copie = { ...accuse, a: adresse };
  }
  // Plafond d'envois du compte de l'artisan (077) : un lien de signature ne sert pas de relais
  const { data: reservation, error: errPlafond } = await supabase.rpc('reserver_envoi_email', {
    p_user_id: devis.user_id, p_nb: copie ? 2 : 1, p_limite: limiteJour(),
  });
  if (errPlafond) {
    console.error('[notify-signature] plafond d\'envois indisponible :', errPlafond.message);
    return await echec(500, 'accusé non envoyé');
  }
  if (reservation == null) return await echec(429, 'plafond d\'envois atteint');

  if (!(await envoyer(accuse))) {
    // Rien n'est parti : la réservation du plafond est rendue aussi
    const { error: errLiberer } = await supabase.from('envois_email').delete().eq('id', reservation);
    if (errLiberer) console.error('[notify-signature] réservation du plafond non rendue :', errLiberer.message);
    return await echec(502, 'accusé non envoyé');
  }
  if (copie && !(await envoyer(copie))) {
    console.error(`[notify-signature] copie de l'accusé à la fiche du client non envoyée devis=${devis.id}`);
  }

  // Avis à l'artisan : au mieux (l'accusé du client est parti)
  try {
    let artisanEmail: string | null = null;
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(devis.user_id as string);
      artisanEmail = userData?.user?.email ?? null;
    } catch { /* repli ci-dessous */ }
    const avis = avisArtisan(devis as DevisRetracte, artisanEmail || (fiche as { email?: string }).email, APP_URL);
    if (avis && !(await envoyer(avis))) console.error(`[notify-signature] avis de rétractation à l'artisan non envoyé devis=${devis.id}`);
  } catch (e) {
    console.error('[notify-signature] avis à l\'artisan :', (e as Error).message);
  }

  const { error: errJournal } = await supabase.from('events_log').insert([{
    event_type: 'devis_retractation_accuse',
    entity_type: 'devis',
    entity_id: devis.id,
    success: true,
    metadata: { numero: devis.numero, retractation_le: devis.retractation_le },
    triggered_at: maintenant,
  }]);
  if (errJournal) console.error(`[notify-signature] journal de l'accusé perdu devis=${devis.id} : ${errJournal.message}`);
  return json({ success: true });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token, evenement } = await req.json();
    if (!token || typeof token !== 'string') {
      return json({ error: 'token manquant' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (evenement === 'retractation') return await traiterRetractation(supabase, token);

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
    // Le nom du signataire est saisi librement par quiconque détient le lien : échappé dans le HTML (un lien
    // d'hameçonnage passait dans un e-mail authentifié par Mallettico — relecture gardien-securite du 10 oct. 2026)
    const signataire = (devis.signataire_nom as string) || clientNom;
    const montant = fmtEUR(devis.total_ttc as number);

    const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1e293b;line-height:1.6;max-width:560px;margin:0 auto">
    <div style="text-align:center;padding:24px 0 8px">
      <div style="font-size:40px">✍️</div>
      <h2 style="margin:8px 0 0">Devis signé !</h2>
    </div>
    <p style="text-align:center;font-size:16px">
      <strong>${echapperHtml(signataire)}</strong> vient de signer le devis
      <strong>${echapperHtml(devis.numero)}</strong> d'un montant de <strong>${montant}</strong>.
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

    // 6. Log — sert aussi de clé de DÉDUP. S'il échoue en silence, l'artisan
    //    peut recevoir plusieurs fois la même notification de signature.
    const { error: errJournal } = await supabase.from('events_log').insert([{
      event_type: 'devis_signed_notified',
      entity_type: 'devis',
      entity_id: devis.id,
      success: true,
      metadata: { numero: devis.numero, signataire },
      triggered_at: new Date().toISOString(),
    }]);
    if (errJournal) {
      console.error(`[notify-signature] JOURNAL/DÉDUP PERDU devis=${devis.id} : ${errJournal.message}`);
    }

    return json({ success: true });
  } catch (error) {
    console.error('[notify-signature] Error:', error);
    return json({ error: (error as Error).message || 'Erreur interne' }, 500);
  }
});
