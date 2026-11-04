/**
 * Règles de voice-intent : qui peut dicter, le quota mensuel de l'organisation, les erreurs rendues à l'app.
 * Sans import distant : testé sous vitest (src/lib/__tests__/voiceIntentServeur.test.js). index.ts ne fait que
 * brancher ces règles sur Supabase et sur l'API d'Anthropic.
 *
 * Ordre d'un appel : jeton vérifié → dictée ouverte à ce compte (secret IA_DICTEE) → dictée valide → accord de l'artisan
 * enregistré à la version attendue (migration 109, sinon 403 ACCORD_REQUIS) → clé API présente → usage RÉSERVÉ (atomique, côté base, migration
 * 107) → appel du modèle → usage TERMINÉ (jetons, durée, réussite ou échec). Une panne de notre côté (API, crédits, clé,
 * délai, réseau) est close en « échec » et ne décompte pas ; un refus du modèle ou une réponse illisible, provoqués par
 * la dictée, sont clos en « échec » mais décomptent (motifs `refus`, `illisible`, comptés par la base). Une réponse
 * coupée par le plafond de jetons (`max_tokens`) a son motif à part, `coupee`, qui décompte aussi : une dictée très
 * longue la provoque (relecture gardien-securite du 4 nov., 3). Le délai ne décompte pas (décision d'Hugo attendue).
 * Une exception imprévue rend 503 IA_INDISPONIBLE, avec corsHeaders (filet global).
 */

import { corsHeaders } from '../_shared/cors.ts';
import { identifierAppelant, type Utilisateur } from '../_shared/appelant.ts';
import { MODELE, requeteDictee } from './consignes.ts';

/**
 * Nombre d'usages par mois et par organisation, selon le plan (-1 : sans limite mensuelle). Recopie de
 * `PLANS[plan].limits.dictees` (src/stores/subscriptionStore.js), seule source de vérité : un test vérifie que les deux
 * disent la même chose. Décision d'Hugo du 4 nov. 2026 : 5 au plan Gratuit, 100 au plan Artisan, sans limite mensuelle
 * au plan Équipe, avec 100 par jour et par personne au plus (plafond du jour, migration 107).
 * La fonction `assistant` n'a pas encore de quota décidé : tant qu'elle n'est pas listée ici, elle est refusée.
 */
export const LIMITES: Record<string, Record<string, number>> = {
  dictee: { gratuit: 5, artisan: 100, equipe: -1 },
};

/**
 * Version du texte de l'écran « Avant votre première dictée » que l'artisan doit avoir accepté. Recopie de
 * `ACCORD_IA_VERSION` (src/lib/accordIa.js) : un test vérifie que les deux sont identiques. Changer le texte de l'écran
 * oblige à changer la version des deux côtés : l'accord est alors redemandé à chacun.
 */
export const ACCORD_IA_VERSION = '2026-11-03';

/** Offre proposée quand le quota du mois est atteint (textes de l'offre, décision d'Hugo du 4 nov. 2026). */
const SUITE_QUOTA: Record<string, string> = {
  gratuit: 'passez au plan Artisan : 100 dictées par mois.',
  artisan: 'passez au plan Équipe : dictées sans limite mensuelle (100 par jour et par personne au plus).',
};

export const MESSAGES = {
  nonConnecte: 'Reconnectez-vous pour utiliser la dictée.',
  vide: 'Dictée vide ou trop courte.',
  tropLongue: 'Dictée trop longue (5000 caractères maximum). Coupez-la en deux.',
  horsOrganisation: 'Cette entreprise n’est pas la vôtre. Saisissez votre devis à la main.',
  sansDroit: 'Votre rôle ne permet pas de créer un devis.',
  quota: (limite: number, plan = 'gratuit') => SUITE_QUOTA[plan]
    ? `Vos ${limite} dictées du mois sont utilisées. Saisissez votre devis à la main, ou ${SUITE_QUOTA[plan]}`
    : `Vos ${limite} dictées du mois sont utilisées. Saisissez votre devis à la main.`,
  plafond: 'Trop de dictées en peu de temps. Réessayez un peu plus tard, ou saisissez votre devis à la main.',
  // Texte de juriste-btp (4 nov. 2026) : le plafond compte tous les appels, nos pannes comprises ; « vous avez fait 100
  // dictées » pouvait être faux (C. conso. L121-2).
  plafondJour: (parJour: number) =>
    `Vous avez atteint le maximum de ${parJour} analyses par jour et par personne. Saisissez votre devis à la main, ou réessayez demain.`,
  accordRequis: 'Avant votre première dictée, il faut accepter l’analyse par l’intelligence artificielle. Touchez « Dicter » pour lire l’écran d’accord.',
  indisponible: 'Dictée indisponible pour le moment. Saisissez votre devis à la main.',
  nonTraitee: 'Cette dictée n’a pas pu être analysée. Saisissez votre devis à la main.',
  illisible: 'L’analyse a échoué. Réessayez, ou saisissez votre devis à la main.',
} as const;

export type Reservation =
  | { autorise: true; id: number; limite: number | null; utilise: number; plan: string }
  | { autorise: false; limite: number | null; utilise: number | null; plan: string; motif?: 'quota' | 'plafond' | 'plafond_jour' | 'global'; parJour?: number | null }
  | { indisponible: true }
  | { horsOrganisation: true }
  | { sansDroit: true };

export type Fin = {
  statut: 'reussi' | 'echec';
  modele: string;
  jetonsEntree?: number | null;
  jetonsSortie?: number | null;
  dureeMs: number;
  motif?: string | null;
};

type Message = {
  stop_reason?: string | null;
  content?: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export type Dependances = {
  cleServeur?: string;
  cleApi?: string;
  /** Dictée ouverte à ce compte côté serveur (secret IA_DICTEE : liste d'identifiants, ou « tous »). Absente : fermée. */
  ouverte?: (userId: string) => boolean;
  /** Accord en cours de l'artisan à la version donnée (table accords_ia, migration 109). Absente : refus (fermé). */
  accord?: (userId: string, version: string) => Promise<'ok' | 'absent' | 'indisponible'>;
  utilisateur: (jeton: string) => Promise<Utilisateur | null>;
  reserver: (demande: { userId: string; organisation: string | null; fonction: string; limites: Record<string, number> }) => Promise<Reservation>;
  terminer: (id: number, fin: Fin) => Promise<void>;
  appeler: (requete: ReturnType<typeof requeteDictee>) => Promise<Message>;
  maintenant?: () => number;
  journal?: (niveau: 'info' | 'erreur', message: string) => void;
};

/**
 * La dictée est-elle ouverte à ce compte (secret IA_DICTEE : « tous », ou identifiants séparés par des virgules) ?
 * Casse et espaces ignorés partout : « Tous » ou « tous  » ouvrent aussi (contrôle local du 4 nov. 2026 : la valeur
 * était comparée telle quelle, et « Tous » aurait laissé la dictée fermée pour tout le monde le jour de l'allumage).
 */
export function ouvertePour(secret: string | null | undefined, userId: string): boolean {
  const valeur = String(secret ?? '').trim().toLowerCase();
  if (!valeur || !userId) return false;
  if (valeur === 'tous') return true;
  return valeur.split(',').map((x) => x.trim()).filter(Boolean).includes(userId.trim().toLowerCase());
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const repondre = (corps: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const erreur = (code: string, message: string, status: number, extra: Record<string, unknown> = {}) =>
  repondre({ error: message, code, ...extra }, status);

/**
 * Pourquoi l'appel à l'API a échoué, pour le journal (jamais montré à l'artisan, qui lit seulement « indisponible »).
 * `credits` : crédits épuisés (402, ou 400 « credit balance is too low ») ; `cle` : clé refusée ; `debit` : trop de
 * requêtes ; `surcharge` : API surchargée (529) ; `panne` : erreur 5xx ; `delai` : délai dépassé ; `reseau` : pas de
 * connexion ; `requete` : requête refusée (400, défaut de notre côté).
 */
export function classerErreurApi(e: unknown): string {
  const err = (e ?? {}) as { status?: number; name?: string; message?: string; type?: string; error?: { error?: { type?: string } } };
  const type = err.type || err.error?.error?.type || '';
  const status = typeof err.status === 'number' ? err.status : null;
  const nom = err.name || '';
  if (/Timeout/i.test(nom)) return 'delai';
  if (status === 402 || type === 'billing_error' || (status === 400 && /credit balance/i.test(err.message || ''))) return 'credits';
  if (status === 401 || status === 403 || type === 'authentication_error' || type === 'permission_error') return 'cle';
  if (status === 429 || type === 'rate_limit_error') return 'debit';
  if (status === 529 || type === 'overloaded_error') return 'surcharge';
  if (status !== null && status >= 500) return 'panne';
  if (/Connection/i.test(nom) || status === null) return 'reseau';
  if (status === 400) return 'requete';
  return 'inconnue';
}

/** Une requête de dictée, de bout en bout. Chaque réponse porte corsHeaders, même après une exception imprévue. */
export async function traiterDictee(req: Request, dep: Dependances): Promise<Response> {
  try {
    return await traiter(req, dep);
  } catch (e) {
    try { (dep.journal ?? (() => {}))('erreur', `exception imprévue : ${(e as Error)?.message || e}`); } catch { /* journal en panne : la réponse part quand même */ }
    return erreur('IA_INDISPONIBLE', MESSAGES.indisponible, 503);
  }
}

async function traiter(req: Request, dep: Dependances): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const maintenant = dep.maintenant ?? (() => Date.now());
  const journal = dep.journal ?? (() => {});

  // La clé anon est publique et passe verify_jwt : on exige un utilisateur dont le jeton est validé par le serveur
  // d'authentification. Le serveur (clé de service) n'a pas de quota à décompter : refusé aussi.
  const appelant = await identifierAppelant(req, { cleServeur: dep.cleServeur, utilisateur: dep.utilisateur });
  if (!appelant || appelant.serveur) return erreur('NON_CONNECTE', MESSAGES.nonConnecte, 401);
  // Interrupteur côté serveur : FONCTIONS.ia ne masque que l'interface. Fermée, rien n'est réservé ni envoyé.
  if (!dep.ouverte?.(appelant.utilisateur.id)) return erreur('IA_INDISPONIBLE', MESSAGES.indisponible, 503);

  let corps: { transcript?: unknown; contexte?: unknown; organisation?: unknown } = {};
  try { corps = await req.json(); } catch { corps = {}; }
  const transcript = typeof corps.transcript === 'string' ? corps.transcript : '';
  if (transcript.trim().length < 3) return erreur('DICTEE_VIDE', MESSAGES.vide, 400);
  // Garde-fou coût : une dictée d'artisan fait quelques centaines de caractères.
  if (transcript.length > 5000) return erreur('DICTEE_TROP_LONGUE', MESSAGES.tropLongue, 400);
  const organisation = typeof corps.organisation === 'string' && UUID.test(corps.organisation) ? corps.organisation : null;

  // Accord de l'artisan avant sa première dictée (Apple 5.1.2(i) ; migration 109) : sans lui, rien n'est réservé ni envoyé.
  let accord: 'ok' | 'absent' | 'indisponible' = 'indisponible';
  try { accord = dep.accord ? await dep.accord(appelant.utilisateur.id, ACCORD_IA_VERSION) : 'indisponible'; }
  catch (e) { journal('erreur', `accord illisible : ${(e as Error).message}`); accord = 'indisponible'; }
  if (accord === 'indisponible') {
    journal('erreur', 'accord de l’artisan illisible (migration 109 non appliquée ?) : dictée refusée');
    return erreur('IA_INDISPONIBLE', MESSAGES.indisponible, 503);
  }
  if (accord !== 'ok') return erreur('ACCORD_REQUIS', MESSAGES.accordRequis, 403);

  if (!dep.cleApi) {
    journal('erreur', 'ANTHROPIC_API_KEY absente des secrets de la fonction');
    return erreur('IA_INDISPONIBLE', MESSAGES.indisponible, 503);
  }

  // Réservation AVANT l'appel : deux dictées simultanées ne dépassent pas le quota (verrou côté base).
  let reservation: Reservation;
  try {
    reservation = await dep.reserver({ userId: appelant.utilisateur.id, organisation, fonction: 'dictee', limites: LIMITES.dictee });
  } catch (e) {
    journal('erreur', `réservation impossible : ${(e as Error).message}`);
    return erreur('IA_INDISPONIBLE', MESSAGES.indisponible, 503);
  }
  if ('indisponible' in reservation) {
    journal('erreur', 'compteur absent (migration 107 non appliquée) : dictée refusée');
    return erreur('IA_INDISPONIBLE', MESSAGES.indisponible, 503);
  }
  if ('horsOrganisation' in reservation) return erreur('HORS_ORGANISATION', MESSAGES.horsOrganisation, 403);
  if ('sansDroit' in reservation) return erreur('SANS_DROIT', MESSAGES.sansDroit, 403);
  if (!reservation.autorise && reservation.motif === 'global') {
    journal('erreur', 'coupe-circuit global atteint (usage_ia_log, 24 h) : dictée refusée');
    return erreur('IA_INDISPONIBLE', MESSAGES.indisponible, 503);
  }
  if (!reservation.autorise && reservation.motif === 'plafond') return erreur('PLAFOND', MESSAGES.plafond, 429);
  if (!reservation.autorise && reservation.motif === 'plafond_jour') {
    // Au plan gratuit, le plafond du jour (20) compte aussi les échecs non décomptés : « 20 dictées » serait faux.
    return erreur('PLAFOND_JOUR', reservation.plan === 'gratuit' ? MESSAGES.plafond : MESSAGES.plafondJour(reservation.parJour ?? 100), 429);
  }
  if (!reservation.autorise) {
    return erreur('QUOTA_ATTEINT', MESSAGES.quota(reservation.limite ?? 0, reservation.plan), 429,
      { quota: { limite: reservation.limite, utilise: reservation.utilise, plan: reservation.plan } });
  }

  const id = reservation.id;
  const debut = maintenant();
  const terminer = async (fin: Omit<Fin, 'modele' | 'dureeMs'>) => {
    try { await dep.terminer(id, { modele: MODELE, dureeMs: Math.max(0, Math.round(maintenant() - debut)), ...fin }); }
    catch (e) { journal('erreur', `usage ${id} non clos : ${(e as Error).message}`); }
  };

  let message: Message;
  try {
    message = await dep.appeler(requeteDictee(transcript, corps.contexte as never));
  } catch (e) {
    const motif = classerErreurApi(e);
    journal('erreur', `API indisponible (${motif}) : ${(e as Error)?.message || e}`);
    await terminer({ statut: 'echec', motif });
    return erreur('IA_INDISPONIBLE', MESSAGES.indisponible, 503);
  }

  const jetons = { jetonsEntree: message.usage?.input_tokens ?? null, jetonsSortie: message.usage?.output_tokens ?? null };
  if (message.stop_reason === 'refusal') {
    await terminer({ statut: 'echec', motif: 'refus', ...jetons });
    return erreur('NON_TRAITEE', MESSAGES.nonTraitee, 422);
  }
  // Coupée par le plafond de jetons (une dictée très longue la provoque) : motif à part, décompté par la base (107).
  if (message.stop_reason === 'max_tokens') {
    journal('erreur', 'réponse coupée par max_tokens');
    await terminer({ statut: 'echec', motif: 'coupee', ...jetons });
    return erreur('ILLISIBLE', MESSAGES.illisible, 502);
  }
  // La réponse peut commencer par un bloc `thinking` (réflexion adaptative) : on lit le bloc `text`.
  const bloc = message.content?.find((b) => b.type === 'text');
  let intention: unknown = null;
  try { intention = bloc?.text ? JSON.parse(bloc.text) : null; } catch { intention = null; }
  if (!intention || typeof intention !== 'object') {
    journal('erreur', `réponse illisible (arrêt : ${message.stop_reason})`);
    await terminer({ statut: 'echec', motif: 'illisible', ...jetons });
    return erreur('ILLISIBLE', MESSAGES.illisible, 502);
  }

  await terminer({ statut: 'reussi', ...jetons });
  return repondre({
    success: true,
    intention,
    usage: { input_tokens: jetons.jetonsEntree, output_tokens: jetons.jetonsSortie, duree_ms: Math.round(maintenant() - debut) },
    quota: { limite: reservation.limite, utilise: reservation.utilise, plan: reservation.plan },
  });
}
