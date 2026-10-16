import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { admin, envoyerResend, journaliser } from '../_shared/branchements.ts';
import { echapperHtml } from '../_shared/adresses.ts';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * alerte-relances — prévient l'exploitation quand les relances automatiques s'arrêtent (migration 088).
 *
 * Appelée chaque jour à 10 h 15 (UTC) par le job pg_cron « alerte-relances-quotidienne », seulement si
 * relances_sante() signale un problème. Déployée sans vérification de jeton, sans secret : elle ne lit
 * RIEN de la requête. Elle refait le contrôle elle-même (relances_sante, clé de service), réserve l'envoi
 * (reserver_alerte : un e-mail par 20 h au plus) et écrit à une seule adresse, fixée côté serveur
 * (secret ALERTE_EMAIL, sinon contact@mallettico.fr). L'appeler en boucle n'envoie donc rien de plus :
 * ce n'est pas un relais (aucune adresse, aucun texte venus de l'appelant). Sa réponse ne dit rien de
 * l'état des relances ({ ok }), seul le code HTTP signale une panne (lisible dans net._http_response).
 *
 * Déploiement : SANS vérification de jeton, le job pg_cron n'en envoie pas :
 *   npx supabase functions deploy alerte-relances --no-verify-jwt --project-ref kofsbgxkrmryfetevetn
 * Déployée avec la vérification (réglage par défaut), elle répondrait 401 au job, le jour d'une panne.
 */

const journal = journaliser('alerte-relances');
const reponse = (corps: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { data: lignes, error } = await admin.rpc('relances_sante');
  if (error) {
    journal('erreur', `relances_sante : ${error.message}`);
    return reponse({ ok: false }, 500);
  }
  const sante = Array.isArray(lignes) ? lignes[0] : lignes;
  if (!sante?.alerte) return reponse({ ok: true });

  const raison = String(sante.raison || 'Relances automatiques : état anormal.');
  const { data: reservee, error: errReserve } = await admin.rpc('reserver_alerte', { p_sujet: 'relances', p_raison: raison });
  if (errReserve) {
    journal('erreur', `reserver_alerte : ${errReserve.message}`);
    return reponse({ ok: false }, 500);
  }
  if (!reservee) return reponse({ ok: true });

  const destinataire = Deno.env.get('ALERTE_EMAIL') || 'contact@mallettico.fr';
  let envoi: { ok: boolean; status: number };
  try {
    envoi = await envoyerResend({
      from: `Mallettico <${Deno.env.get('FROM_EMAIL') || 'noreply@mallettico.fr'}>`,
      to: [destinataire],
      subject: 'Mallettico : les relances automatiques ne tournent plus',
      text: `${raison}\n\nContrôle dans l'éditeur SQL de Supabase :\nselect ran_at, dry_run, total_due, sent, failed, error from relance_cron_runs order by ran_at desc limit 10;\n\nPuis net._http_response (réponses de pg_net, conservées quelques heures) et les journaux de la fonction send-scheduled-relances.`,
      html: `<p>${echapperHtml(raison)}</p><p>Contrôle dans l'éditeur SQL de Supabase :</p><pre>select ran_at, dry_run, total_due, sent, failed, error from relance_cron_runs order by ran_at desc limit 10;</pre><p>Puis <code>net._http_response</code> (réponses de pg_net, conservées quelques heures) et les journaux de la fonction send-scheduled-relances.</p>`,
    });
  } catch (e) {
    envoi = { ok: false, status: 0 };
    journal('erreur', `Resend injoignable : ${String((e as Error)?.message || e)}`);
  }
  if (!envoi.ok) {
    // Réservation rendue : le prochain appel réessaiera au lieu de se taire 20 h
    const { error: errLiberer } = await admin.from('alertes_exploitation').delete()
      .eq('sujet', 'relances').gte('envoyee_le', new Date(Date.now() - 5 * 60 * 1000).toISOString());
    journal('erreur', `Resend HTTP ${envoi.status}${errLiberer ? ` ; réservation non rendue : ${errLiberer.message}` : ''}`);
    return reponse({ ok: false }, 502);
  }
  journal('info', `alerte envoyée : ${raison}`);
  return reponse({ ok: true });
});
