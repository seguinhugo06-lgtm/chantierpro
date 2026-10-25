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
 *
 * Exemplaire signé envoyé au client (tâche confirmation-client ; C. conso. L221-13, migration 090) :
 *   supabase.functions.invoke('notify-signature', { body: { token, evenement: 'exemplaire', pdf } })
 *   → le PDF du devis signé, produit par la page du client juste après la signature, part à l'adresse de la FICHE du
 *     client (prise en base, jamais venue du navigateur), avec un e-mail dont les faits (numéro, montant, date de
 *     signature, demande expresse) sont lus en base. Gardes : signé par le lien depuis moins de 30 minutes ; vrai PDF
 *     de taille bornée ; un seul envoi (réservation de exemplaire_client_le, rendue si l'envoi échoue) ; plafond
 *     quotidien d'envois du compte (077) ; textes dans exemplaire.ts. Le PDF venant du navigateur du client, une
 *     copie cachée du MÊME fichier part à l'artisan et son empreinte SHA-256 est journalisée : un exemplaire
 *     retouché par le client se voit aussitôt, et l'artisan garde la preuve de la remise (relecture
 *     gardien-securite du 17 oct. 2026).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { echapperHtml, estEmail } from '../_shared/adresses.ts';
import { nomImprime } from '../_shared/identite.ts';
import { choisirFicheEntreprise, organisationSure, type Piece } from '../_shared/ficheEntreprise.ts';
import { accuseReception, avisArtisan, avisEchecAccuse, type DevisRetracte, type Message } from './retractation.ts';
import { messageExemplaire, nomFichierExemplaire, pdfAcceptable } from './exemplaire.ts';

const APP_URL = Deno.env.get('APP_URL') || 'https://mallettico.fr';

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

/** Envoi par Resend ; vrai si le message est parti. Ne lève jamais (une panne réseau rend faux). */
async function envoyer(message: Message, options: { pieces?: Array<{ filename: string; content: string }>; copieCachee?: string } = {}): Promise<boolean> {
  const { pieces, copieCachee } = options;
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
        ...(pieces?.length ? { attachments: pieces } : {}),
        ...(copieCachee ? { bcc: [copieCachee] } : {}),
      }),
      // Sans réponse de Resend, ne pas attendre que la plateforme tue la fonction (réservation gardée)
      signal: AbortSignal.timeout(20_000),
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

/**
 * L'entreprise du devis, comme les pages publiques (migration 106, _shared/ficheEntreprise.ts) : une fiche de son
 * organisation si son auteur en est membre (celle qu'il désigne d'abord), sinon une fiche de l'auteur. Avant, la
 * fiche personnelle d'un salarié passait devant celle de l'entreprise. Nom tel qu'imprimé (« EI » d'un entrepreneur
 * individuel, C. com. R526-27), coordonnées, adresse de réponse. Une lecture en échec lève une erreur : mieux vaut ne
 * rien envoyer (l'appelant rend sa réservation, le passage suivant réessaie) qu'un e-mail au nom d'une autre société.
 */
// deno-lint-ignore no-explicit-any
async function ficheEntreprise(supabase: any, devis: Piece) {
  let membres: string[] = [];
  if (devis.organization_id) {
    const { data: lignes, error: errMembres } = await supabase
      .from('organization_members').select('user_id').eq('organization_id', devis.organization_id);
    if (errMembres) throw new Error(`lecture des membres : ${errMembres.message}`);
    membres = (lignes || []).map((l: { user_id: string }) => l.user_id);
  }
  const org = organisationSure(devis, membres);
  const requete = supabase
    .from('entreprise')
    .select('id, user_id, organization_id, nom, forme_juridique, settings_json, adresse, telephone, email, is_default, archived_at, created_at');
  const { data: fiches, error: errFiches } = await (org
    ? requete.or(`user_id.eq.${devis.user_id},organization_id.eq.${org}`)
    : requete.eq('user_id', devis.user_id));
  if (errFiches) throw new Error(`lecture des fiches entreprise : ${errFiches.message}`);
  // deno-lint-ignore no-explicit-any
  const fiche: any = choisirFicheEntreprise(fiches || [], devis, membres) || {};
  const nomEntrepreneur = fiche.settings_json?.reglages?.nomEntrepreneur || null;
  return { ...fiche, nom: nomImprime({ nom: fiche.nom, forme_juridique: fiche.forme_juridique, nomEntrepreneur }) };
}

// ─── Exemplaire signé envoyé au client (L221-13, migration 090) ───
// deno-lint-ignore no-explicit-any
async function traiterExemplaire(supabase: any, token: string, pdf: unknown): Promise<Response> {
  if (!pdfAcceptable(pdf)) return json({ error: 'PDF invalide' }, 400);
  // Décodé et empreinte calculée AVANT toute réservation : un faux base64 ne doit rien laisser derrière lui (une
  // date d'envoi posée sans envoi ferait croire l'exemplaire remis — relecture gardien-securite du 17 oct. 2026)
  let octets: Uint8Array;
  let sha256: string;
  try {
    const binaire = atob(pdf);
    octets = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
    sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', octets)))
      .map((x) => x.toString(16).padStart(2, '0')).join('');
  } catch {
    return json({ error: 'PDF invalide' }, 400);
  }
  const { data: devis, error } = await supabase
    .from('devis')
    .select('id, numero, date, total_ttc, user_id, organization_id, client_id, entreprise_id, signature_data, signature_date, execution_anticipee_le, travaux_urgents, retractation_en_ligne, exemplaire_client_le')
    .eq('signature_token', token)
    .maybeSingle();
  if (error || !devis) return json({ error: 'devis introuvable' }, 404);
  if (!devis.signature_data || !devis.signature_date) return json({ error: 'devis non signé' }, 400);
  const ageMs = Date.now() - new Date(devis.signature_date as string).getTime();
  if (Number.isNaN(ageMs) || ageMs > 30 * 60 * 1000) return json({ error: 'signature trop ancienne' }, 400);
  if (devis.exemplaire_client_le) {
    const le = new Date(devis.exemplaire_client_le).getTime();
    if (le >= new Date(devis.signature_date).getTime() && le <= Date.now()) return json({ success: true, deja: true });
    // Date posée avant la signature ou dans le futur (à la main, dans l'app) : elle ne vaut pas envoi
    await supabase.from('devis').update({ exemplaire_client_le: null }).eq('id', devis.id).eq('exemplaire_client_le', devis.exemplaire_client_le);
  }

  // Le client du devis, dans le compte ou l'organisation de l'artisan : son adresse vient de la base
  const { data: client } = devis.client_id
    ? await supabase.from('clients').select('prenom, nom, email, user_id, organization_id').eq('id', devis.client_id).maybeSingle()
    : { data: null };
  const duCompte = client && (client.user_id === devis.user_id || (devis.organization_id && client.organization_id === devis.organization_id));
  if (!duCompte) return json({ error: 'client introuvable' }, 404);
  // deno-lint-ignore no-explicit-any
  let fiche: any;
  try {
    fiche = await ficheEntreprise(supabase, devis);
  } catch (e) {
    console.error('[notify-signature] Exemplaire non envoyé :', (e as Error).message);
    return json({ error: 'exemplaire non envoyé' }, 500);
  }
  // Particulier signé en ligne (éligibilité figée à la signature, 086) : le lien de la page où il peut renoncer
  const enLigne = devis.retractation_en_ligne === true;
  const message = messageExemplaire({
    devis, pro: fiche, client, particulier: enLigne, lienRetractation: enLigne ? `${APP_URL}/devis/signer/${token}` : '',
  });
  if (!message) return json({ error: 'adresse du client absente ou invalide' }, 400);

  // Un seul exemplaire : réservé avant l'envoi, rendu s'il échoue
  const { data: reserve, error: errReserve } = await supabase
    .from('devis')
    .update({ exemplaire_client_le: new Date().toISOString() })
    .eq('id', devis.id)
    .is('exemplaire_client_le', null)
    .select('id');
  if (errReserve) {
    console.error('[notify-signature] réservation de l\'exemplaire impossible :', errReserve.message);
    return json({ error: 'exemplaire non envoyé' }, 500);
  }
  if (!reserve || reserve.length === 0) return json({ success: true, deja: true });
  const rendre = async (statut: number, erreur: string) => {
    const { error: errRendre } = await supabase.from('devis').update({ exemplaire_client_le: null }).eq('id', devis.id);
    if (errRendre) console.error(`[notify-signature] EXEMPLAIRE NON ENVOYÉ ET RÉSERVATION GARDÉE devis=${devis.id} : ${errRendre.message}`);
    return json({ error: erreur }, statut);
  };

  // Copie cachée du même fichier à l'artisan : l'adresse de son compte seulement (vérifiée à l'inscription). Plus de repli
  // sur l'adresse de sa fiche, modifiable par lui (relecture gardien-securite du 17 oct. 2026, R7) : sans compte lisible,
  // pas de copie.
  let artisan: string | null = null;
  try {
    const { data: userData, error: errCompte } = await supabase.auth.admin.getUserById(devis.user_id as string);
    if (errCompte) console.error(`[notify-signature] compte de l'artisan illisible devis=${devis.id} : ${errCompte.message}`);
    artisan = userData?.user?.email ?? null;
  } catch (e) { console.error('[notify-signature] compte de l\'artisan :', (e as Error).message); }
  artisan = String(artisan || '').trim().toLowerCase();
  const copieCachee = estEmail(artisan) && artisan !== message.a ? artisan : undefined;

  let reservation: unknown = null;
  const libererPlafond = async () => {
    if (reservation == null) return;
    const { error: errLiberer } = await supabase.from('envois_email').delete().eq('id', reservation);
    if (errLiberer) console.error('[notify-signature] réservation du plafond non rendue :', errLiberer.message);
  };
  try {
    const { data, error: errPlafond } = await supabase.rpc('reserver_envoi_email', {
      p_user_id: devis.user_id, p_nb: copieCachee ? 2 : 1, p_limite: limiteJour(),
    });
    if (errPlafond) {
      console.error('[notify-signature] plafond d\'envois indisponible :', errPlafond.message);
      return await rendre(500, 'exemplaire non envoyé');
    }
    if (data == null) return await rendre(429, 'plafond d\'envois atteint');
    reservation = data;

    if (!(await envoyer(message, { pieces: [{ filename: nomFichierExemplaire(devis.numero), content: pdf }], copieCachee }))) {
      await libererPlafond();
      return await rendre(502, 'exemplaire non envoyé');
    }
  } catch (e) {
    // Toute erreur imprévue après la réservation : la rendre, sinon la fiche dirait « envoyé » à tort
    console.error('[notify-signature] exemplaire :', (e as Error).message);
    await libererPlafond();
    return await rendre(500, 'exemplaire non envoyé');
  }

  const { error: errJournal } = await supabase.from('events_log').insert([{
    event_type: 'devis_exemplaire_client',
    entity_type: 'devis',
    entity_id: devis.id,
    user_id: devis.user_id,
    success: true,
    metadata: { numero: devis.numero, sha256, octets: octets.length, copie_artisan: !!copieCachee },
    triggered_at: new Date().toISOString(),
  }]);
  if (errJournal) console.error(`[notify-signature] journal de l'exemplaire perdu devis=${devis.id} : ${errJournal.message}`);
  return json({ success: true });
}

/**
 * Envoi unique d'un événement par devis (index unique de 091) : la ligne du journal est posée « en cours »
 * (success false) AVANT l'envoi, confirmée après, rendue s'il échoue. Une réservation restée « en cours » plus de
 * 2 minutes (fonction interrompue) se reprend — relecture gardien-securite du 17 oct. 2026.
 */
// deno-lint-ignore no-explicit-any
async function reserver(supabase: any, type: string, devis: any, metadata: Record<string, unknown>): Promise<'ok' | 'deja' | 'erreur'> {
  const { error } = await supabase.from('events_log').insert([{
    event_type: type, entity_type: 'devis', entity_id: devis.id, user_id: devis.user_id,
    success: false, metadata, triggered_at: new Date().toISOString(),
  }]);
  if (!error) return 'ok';
  if (error.code !== '23505') {
    console.error(`[notify-signature] réservation ${type} impossible devis=${devis.id} : ${error.message}`);
    return 'erreur';
  }
  const { data: reprise, error: errReprise } = await supabase.from('events_log')
    .update({ triggered_at: new Date().toISOString() })
    .eq('event_type', type).eq('entity_id', devis.id).eq('success', false)
    .lt('triggered_at', new Date(Date.now() - 2 * 60 * 1000).toISOString())
    .select('id');
  if (errReprise) {
    console.error(`[notify-signature] reprise de la réservation ${type} impossible devis=${devis.id} : ${errReprise.message}`);
    return 'erreur';
  }
  return reprise && reprise.length > 0 ? 'ok' : 'deja';
}

// deno-lint-ignore no-explicit-any
async function confirmerReservation(supabase: any, type: string, devisId: string) {
  const { error } = await supabase.from('events_log').update({ success: true }).eq('event_type', type).eq('entity_id', devisId);
  if (error) console.error(`[notify-signature] ${type} envoyé mais non confirmé au journal devis=${devisId} : ${error.message}`);
}

// deno-lint-ignore no-explicit-any
async function rendreReservation(supabase: any, type: string, devisId: string, raison: string) {
  const { error } = await supabase.from('events_log').delete().eq('event_type', type).eq('entity_id', devisId);
  if (error) console.error(`[notify-signature] ${type} NON ENVOYÉ (${raison}) ET RÉSERVATION GARDÉE devis=${devisId} : ${error.message}`);
  else console.error(`[notify-signature] ${type} non envoyé (${raison}) devis=${devisId}`);
}

/** Avis d'échec de l'accusé à l'artisan : une seule fois par devis. */
// deno-lint-ignore no-explicit-any
async function prevenirEchecAccuse(supabase: any, devis: any, fiche: { email?: string }) {
  const TYPE = 'devis_retractation_accuse_echec';
  if ((await reserver(supabase, TYPE, devis, { numero: devis.numero })) !== 'ok') return;
  try {
    let artisan: string | null = null;
    try {
      const { data: userData, error: errCompte } = await supabase.auth.admin.getUserById(devis.user_id as string);
      if (errCompte) console.error(`[notify-signature] compte de l'artisan illisible devis=${devis.id} : ${errCompte.message}`);
      artisan = userData?.user?.email ?? null;
    } catch (e) { console.error('[notify-signature] compte de l\'artisan :', (e as Error).message); }
    // Sans adresse de compte : réservation rendue et journalisée ; le job s'arrête à 5 essais, l'alerte horaire (095)
    // prévient l'exploitant que l'accusé attend
    const avis = avisEchecAccuse(devis as DevisRetracte, fiche, artisan, APP_URL);
    if (avis && (await envoyer(avis))) await confirmerReservation(supabase, TYPE, devis.id);
    else await rendreReservation(supabase, TYPE, devis.id, avis ? 'envoi' : 'adresse');
  } catch (e) {
    await rendreReservation(supabase, TYPE, devis.id, (e as Error).message);
  }
}

// ─── Rétractation en ligne : accusé de réception (D221-5) et avis à l'artisan ───
// deno-lint-ignore no-explicit-any
async function traiterRetractation(supabase: any, token: string): Promise<Response> {
  const { data: devis, error } = await supabase
    .from('devis')
    .select('id, numero, date, user_id, organization_id, client_id, entreprise_id, signature_date, travaux_urgents, execution_anticipee_le, retractation_le, retractation_nom, retractation_email, retractation_accuse_le, retractation_accuse_essais')
    .eq('signature_token', token)
    .maybeSingle();
  if (error || !devis) return json({ error: 'devis introuvable' }, 404);
  if (!devis.retractation_le) return json({ error: 'aucune rétractation enregistrée' }, 400);
  if (devis.retractation_accuse_le) {
    // Réservé il y a moins de 2 minutes et pas encore journalisé : un envoi est en cours (le bouton ne doit pas
    // annoncer « envoyé » s'il échoue ensuite — relecture gardien-securite du 17 oct. 2026)
    const recent = Date.now() - new Date(devis.retractation_accuse_le).getTime() < 2 * 60 * 1000;
    if (recent) {
      const { data: journal } = await supabase.from('events_log').select('id')
        .eq('event_type', 'devis_retractation_accuse').eq('entity_id', devis.id).limit(1);
      if (!journal || journal.length === 0) return json({ success: false, en_cours: true });
    }
    return json({ success: true, deja: true });
  }

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

  // deno-lint-ignore no-explicit-any
  let fiche: any;
  try {
    fiche = await ficheEntreprise(supabase, devis);
  } catch (e) {
    const { error: errRendre } = await rendre();
    console.error(`[notify-signature] Accusé non envoyé devis=${devis.id} : ${(e as Error).message}${errRendre ? ` ; RÉSERVATION GARDÉE : ${errRendre.message}` : ''}`);
    return json({ error: 'accusé non envoyé' }, 500);
  }

  const echec = async (statut: number, message: string) => {
    const { error: errRendre } = await rendre();
    if (errRendre) console.error(`[notify-signature] ACCUSÉ NON ENVOYÉ ET RÉSERVATION GARDÉE devis=${devis.id} : ${errRendre.message}`);
    // Dernier essai du serveur (089) en échec : l'artisan est prévenu, une fois, hors plafond (un seul e-mail, à
    // l'adresse de son compte, prise en base) — tâche accuse-echec
    if (Number(devis.retractation_accuse_essais || 0) >= 5) await prevenirEchecAccuse(supabase, devis, fiche);
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
      const { data: userData, error: errCompte } = await supabase.auth.admin.getUserById(devis.user_id as string);
      if (errCompte) console.error(`[notify-signature] compte de l'artisan illisible devis=${devis.id} : ${errCompte.message}`);
      artisanEmail = userData?.user?.email ?? null;
    } catch (e) { console.error('[notify-signature] compte de l\'artisan :', (e as Error).message); }
    const avis = avisArtisan(devis as DevisRetracte, artisanEmail, APP_URL);
    if (!avis) console.error(`[notify-signature] avis de rétractation à l'artisan non envoyé (pas d'adresse de compte) devis=${devis.id}`);
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

  // Corps borné avant lecture (un exemplaire en base64 fait au plus 14 M caractères)
  if (req.method !== 'POST') return json({ error: 'méthode non permise' }, 405);
  if (Number(req.headers.get('content-length') || 0) > 15_000_000) return json({ error: 'requête trop lourde' }, 413);

  try {
    const { token, evenement, pdf } = await req.json();
    if (!token || typeof token !== 'string') {
      return json({ error: 'token manquant' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (evenement === 'retractation') return await traiterRetractation(supabase, token);
    if (evenement === 'exemplaire') return await traiterExemplaire(supabase, token, pdf);

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

    // 3. Une notification par devis, réservée au journal avant l'envoi (index unique, 091) — avant, lire puis écrire
    //    laissait des appels simultanés envoyer plusieurs e-mails
    const TYPE = 'devis_signed_notified';
    const reservation = await reserver(supabase, TYPE, devis, { numero: devis.numero, signataire: devis.signataire_nom || null });
    if (reservation === 'deja') return json({ success: true, deduped: true });
    if (reservation === 'erreur') return json({ error: 'notification non envoyée' }, 500);
    try {
      // 4. Email de l'artisan : l'adresse de son compte seulement (R7, 17 oct. 2026 : plus de repli sur sa fiche)
      let artisanEmail: string | null = null;
      try {
        const { data: userData, error: errCompte } = await supabase.auth.admin.getUserById(devis.user_id as string);
        if (errCompte) console.error(`[notify-signature] compte de l'artisan illisible devis=${devis.id} : ${errCompte.message}`);
        artisanEmail = userData?.user?.email ?? null;
      } catch (e) { console.error('[notify-signature] compte de l\'artisan :', (e as Error).message); }
      // Compte illisible : réservation rendue (un nouvel appel pourra notifier), 502 plutôt que 404 (panne, pas absence)
      if (!artisanEmail) { await rendreReservation(supabase, TYPE, devis.id, 'adresse'); return json({ error: 'email artisan introuvable' }, 502); }

      const client =devis.client as { nom?: string; prenom?: string } | null;
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

      // 5. Envoi (délai maximal, ne lève pas), confirmé au journal
      const texte = `${signataire} vient de signer le devis ${devis.numero} d'un montant de ${montant}.\n\n${APP_URL}`;
      const parti = await envoyer({ a: artisanEmail, sujet: `✍️ Devis ${devis.numero} signé — ${montant}`, html, texte });
      if (!parti) {
        await rendreReservation(supabase, TYPE, devis.id, 'envoi');
        return json({ error: 'envoi email échoué' }, 502);
      }
      await confirmerReservation(supabase, TYPE, devis.id);
      return json({ success: true });
    } catch (e) {
      // Erreur imprévue après la réservation : la rendre, sinon la notification serait perdue pour de bon
      await rendreReservation(supabase, TYPE, devis.id, (e as Error).message);
      throw e;
    }
  } catch (error) {
    console.error('[notify-signature] Error:', error);
    return json({ error: (error as Error).message || 'Erreur interne' }, 500);
  }
});
