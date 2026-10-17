import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { admin, envoyerResend, journaliser } from '../_shared/branchements.ts';
import { echapperHtml } from '../_shared/adresses.ts';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * alerte-relances — prévient l'exploitation quand un mécanisme automatique s'arrête :
 *   - les relances automatiques (migration 088, relances_sante) ;
 *   - les accusés de réception des rétractations en ligne (migration 095, accuses_sante : une rétractation attend son
 *     accusé depuis plus d'une heure).
 *
 * Appelée chaque jour à 10 h 15 (UTC) par le job pg_cron « alerte-relances-quotidienne » et à la 5e minute de chaque
 * heure par « alerte-accuses-horaire », seulement si le contrôle correspondant signale un problème. Déployée sans
 * vérification de jeton, sans secret : elle ne lit RIEN de la requête. Elle refait chaque contrôle elle-même (clé de
 * service), réserve l'envoi par sujet (reserver_alerte : un e-mail par 20 h au plus et par sujet) et écrit à une seule
 * adresse, fixée côté serveur (secret ALERTE_EMAIL, sinon contact@mallettico.fr). L'appeler en boucle n'envoie donc
 * rien de plus : ce n'est pas un relais (aucune adresse, aucun texte venus de l'appelant). Sa réponse ne dit rien de
 * l'état ({ ok }), seul le code HTTP signale une panne (lisible dans net._http_response).
 *
 * Déploiement : SANS vérification de jeton, les jobs pg_cron n'en envoient pas :
 *   npx supabase functions deploy alerte-relances --no-verify-jwt --project-ref kofsbgxkrmryfetevetn
 * Déployée avec la vérification (réglage par défaut), elle répondrait 401 aux jobs, le jour d'une panne.
 */

const journal = journaliser('alerte-relances');
const reponse = (corps: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

interface Sujet {
  sujet: string;
  controle: string;
  objet: string;
  verification: string;
  suite: string;
}

const SUJETS: Sujet[] = [
  {
    sujet: 'relances',
    controle: 'relances_sante',
    objet: 'Mallettico : les relances automatiques ne tournent plus',
    verification: 'select ran_at, dry_run, total_due, sent, failed, error from relance_cron_runs order by ran_at desc limit 10;',
    suite: 'Puis net._http_response (réponses de pg_net, conservées quelques heures) et les journaux de la fonction send-scheduled-relances.',
  },
  {
    sujet: 'accuses',
    controle: 'accuses_sante',
    objet: 'Mallettico : des rétractations attendent leur accusé de réception',
    verification: 'select numero, retractation_le, retractation_accuse_essais from devis where retractation_le is not null and retractation_accuse_le is null order by retractation_le;',
    suite: 'Puis le job accuses-retractation (cron.job_run_details), net._http_response et les journaux de la fonction notify-signature. L\'artisan est prévenu par e-mail au dernier essai en échec.',
  },
];

/** Un sujet : contrôle refait ici, réservation, envoi ; vrai si tout s'est bien passé (alerte envoyée ou rien à dire). */
async function traiter(s: Sujet): Promise<boolean> {
  const { data: lignes, error } = await admin.rpc(s.controle);
  if (error) {
    journal('erreur', `${s.controle} : ${error.message}`);
    return false;
  }
  const etat = Array.isArray(lignes) ? lignes[0] : lignes;
  if (!etat?.alerte) return true;

  const raison = String(etat.raison || `${s.objet}.`);
  const { data: reservee, error: errReserve } = await admin.rpc('reserver_alerte', { p_sujet: s.sujet, p_raison: raison });
  if (errReserve) {
    journal('erreur', `reserver_alerte (${s.sujet}) : ${errReserve.message}`);
    return false;
  }
  if (!reservee) return true;

  const destinataire = Deno.env.get('ALERTE_EMAIL') || 'contact@mallettico.fr';
  let envoi: { ok: boolean; status: number };
  try {
    envoi = await envoyerResend({
      from: `Mallettico <${Deno.env.get('FROM_EMAIL') || 'noreply@mallettico.fr'}>`,
      to: [destinataire],
      subject: s.objet,
      text: `${raison}\n\nContrôle dans l'éditeur SQL de Supabase :\n${s.verification}\n\n${s.suite}`,
      html: `<p>${echapperHtml(raison)}</p><p>Contrôle dans l'éditeur SQL de Supabase :</p><pre>${echapperHtml(s.verification)}</pre><p>${echapperHtml(s.suite)}</p>`,
    });
  } catch (e) {
    envoi = { ok: false, status: 0 };
    journal('erreur', `Resend injoignable : ${String((e as Error)?.message || e)}`);
  }
  if (!envoi.ok) {
    // Réservation rendue : le prochain appel réessaiera au lieu de se taire 20 h
    const { error: errLiberer } = await admin.from('alertes_exploitation').delete()
      .eq('sujet', s.sujet).gte('envoyee_le', new Date(Date.now() - 5 * 60 * 1000).toISOString());
    journal('erreur', `Resend HTTP ${envoi.status} (${s.sujet})${errLiberer ? ` ; réservation non rendue : ${errLiberer.message}` : ''}`);
    return false;
  }
  journal('info', `alerte envoyée (${s.sujet}) : ${raison}`);
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  // Chaque sujet indépendamment : une panne de l'un n'empêche pas l'alerte de l'autre
  const resultats = [];
  for (const s of SUJETS) resultats.push(await traiter(s));
  return resultats.every(Boolean) ? reponse({ ok: true }) : reponse({ ok: false }, 500);
});
