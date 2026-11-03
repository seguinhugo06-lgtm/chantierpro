/**
 * Contrat de l'assistant (prototype, 3 nov. 2026) — ce que l'app envoie à la fonction Edge et ce qu'elle attend en
 * retour. Le socle serveur (jeton, quota `usage_ia_log`, coupure, journal sans texte) est celui de la branche
 * `cloud/ia-socle` (voice-intent durci, migration 107) : ce contrat en reprend les codes d'erreur et la forme des
 * réponses. AUCUNE fonction Edge de l'assistant n'existe encore : hors démo, `assistant.js` n'appelle rien tant que
 * `FONCTIONS.assistant` est éteint. Voir `docs/ia/ligne-directrice.md` § 5 et § 7.1.
 *
 * Principe : le modèle COMPREND la demande et propose une ACTION structurée. Il ne calcule aucun total et n'écrit
 * rien en base : les totaux, la TVA et les restes dus sont calculés par l'app (mêmes fonctions que les écrans) ;
 * il ne recopie que les nombres dits par l'artisan, montrés pour relecture ; rien n'est enregistré ni envoyé avant
 * le geste de validation.
 *
 * ── Requête (POST, jeton de l'utilisateur, jamais la clé du modèle côté app) ──────────────────────────────────
 * {
 *   version: 1,
 *   texte: string,              // la demande, dictée ou tapée (1 à 600 caractères)
 *   source: 'voix' | 'clavier',
 *   page: string,               // page ouverte, pour le contexte (« chantiers », « devis »…)
 *   repere: {                   // index MINIMAL pour résoudre les noms, jamais de montants ni de coordonnées
 *     clients:   [{ id, nom }],           // « Jean Martin (SCI Martin) »
 *     chantiers: [{ id, nom, client_id }],
 *     equipe:    [{ id, nom }],
 *   },
 *   reponses?: { [question_id]: string },   // réponses de l'artisan aux questions d'un premier tour
 *   organisation?: uuid,        // l'entreprise active, comme pour voice-intent (le quota se compte par organisation)
 * }
 *
 * ── Réponse (forme du socle, voice-intent) ──────────────────────────────────────────────────────────────────
 * 200 { success: true, intention: { intention, parametres, questions, confiance }, quota?: { limite, utilise, plan } }
 *   intention.intention : une des INTENTIONS ci-dessous ;
 *   intention.parametres : selon l'intention (voir `verifierParametres`) — les identifiants viennent de `repere`,
 *     un nom introuvable reste en texte (`client_nom`) et devient une question ;
 *   intention.questions : [{ id, texte, choix?: [{ valeur, libelle }] }] — ce que le modèle ne sait pas (client,
 *     montant, heures, HT ou TTC…) : l'app les pose, n'invente rien. Le taux de TVA est toujours posé par l'app ;
 *   intention.confiance : 'haute' | 'moyenne' | 'basse' ;
 *   quota : compteur du mois pour l'organisation (limite -1 ou null : sans limite mensuelle).
 * 4xx/5xx { error: string, code } — code : un des codes du socle (ERREURS ci-dessous) ; l'app affiche son propre
 *   message (MESSAGES_ERREUR), pas celui du serveur, qui parle de dictée.
 *
 * Ce que l'app rend à l'écran (lireReponse) : { ok: true, intention, parametres, questions, confiance, restant }
 * ou { ok: false, code, message }.
 */

export const VERSION_CONTRAT = 1;
export const TEXTE_MAX = 600;

export const INTENTIONS = Object.freeze({
  DEVIS: 'devis_brouillon',       // préparer un brouillon de devis
  RELANCES: 'relances_retard',    // préparer les relances des factures échues
  ENCAISSE: 'question_encaisse',  // combien j'ai encaissé (période)
  HEURES: 'heures_chantier',      // ajouter des heures sur un chantier
  INCONNUE: 'inconnue',           // demande non comprise ou hors du périmètre
});

/**
 * Codes d'erreur. Ceux du serveur sont EXACTEMENT ceux du socle (supabase/functions/voice-intent/regles.ts, branche
 * `cloud/ia-socle`) ; HORS_LIGNE et DELAI_DEPASSE sont constatés par l'app elle-même, sans appel.
 */
export const ERREURS = Object.freeze({
  HORS_LIGNE: 'HORS_LIGNE',             // app : pas de réseau, la demande reste dans le champ, rien n'est perdu
  LENT: 'DELAI_DEPASSE',                // app : pas de réponse en 15 s
  NON_CONNECTE: 'NON_CONNECTE',         // 401 : jeton absent ou refusé
  QUOTA: 'QUOTA_ATTEINT',               // 429 : quota mensuel de l'organisation atteint
  PLAFOND: 'PLAFOND',                   // 429 : trop de demandes en peu de temps (plafond par minute ou par jour)
  COUPURE: 'IA_INDISPONIBLE',           // 503 : clé absente, crédits épuisés, API en panne, compteur absent
  HORS_ORGANISATION: 'HORS_ORGANISATION', // 403 : entreprise active qui n'est pas celle de l'utilisateur
  VIDE: 'DICTEE_VIDE',                  // 400 : texte vide ou trop court
  TROP_LONG: 'DICTEE_TROP_LONGUE',      // 400 : texte trop long
  REFUS: 'NON_TRAITEE',                 // 422 : le modèle a refusé de traiter le texte
  ILLISIBLE: 'ILLISIBLE',               // 502 : réponse du modèle illisible
  PANNE: 'ERREUR',                      // tout le reste (dont une réponse qui ne respecte pas ce contrat)
});

/** Ce que l'artisan lit pour chaque erreur : court, sans jargon, et ce qui marche encore. */
export const MESSAGES_ERREUR = Object.freeze({
  [ERREURS.HORS_LIGNE]: 'Pas de réseau. Votre demande est gardée : réessayez quand le réseau revient.',
  [ERREURS.LENT]: 'La réponse tarde. Réessayez dans un instant.',
  [ERREURS.NON_CONNECTE]: 'Reconnectez-vous pour utiliser l’assistant.',
  [ERREURS.QUOTA]: 'Vous avez utilisé toutes vos demandes du mois. Tout le reste de l’app fonctionne normalement.',
  [ERREURS.PLAFOND]: 'Trop de demandes en peu de temps. Réessayez un peu plus tard. Tout le reste de l’app fonctionne normalement.',
  [ERREURS.COUPURE]: 'L’assistant est momentanément indisponible. Tout le reste de l’app fonctionne normalement.',
  [ERREURS.HORS_ORGANISATION]: 'Cette entreprise n’est pas la vôtre. Changez d’entreprise, puis réessayez.',
  [ERREURS.VIDE]: 'Dites ou tapez votre demande en quelques mots.',
  [ERREURS.TROP_LONG]: 'Demande trop longue. Dites-la en quelques mots.',
  [ERREURS.REFUS]: 'Je n’ai pas pu traiter ce texte. Reformulez en quelques mots.',
  [ERREURS.ILLISIBLE]: 'Je n’ai pas compris la réponse. Réessayez, ou faites-le depuis l’écran concerné.',
  [ERREURS.PANNE]: 'Un souci technique m’empêche de répondre. Réessayez dans un instant.',
});

export const DELAI_MS = 15000;

/** Construit la requête : texte nettoyé et borné, repère réduit aux noms (aucun montant, aucune coordonnée). */
export function construireRequete({ texte, source = 'clavier', page = '', clients = [], chantiers = [], equipe = [], reponses, organisation } = {}) {
  const propre = String(texte || '').replace(/\s+/g, ' ').trim().slice(0, TEXTE_MAX);
  const nomClient = (c) => [c.prenom, c.nom].filter(Boolean).join(' ') + (c.entreprise ? ` (${c.entreprise})` : '');
  return {
    version: VERSION_CONTRAT,
    texte: propre,
    source: source === 'voix' ? 'voix' : 'clavier',
    page: String(page || '').slice(0, 40),
    repere: {
      clients: clients.map((c) => ({ id: c.id, nom: nomClient(c) })),
      chantiers: chantiers.map((c) => ({ id: c.id, nom: c.nom, client_id: c.client_id })),
      equipe: equipe.map((e) => ({ id: e.id, nom: [e.prenom, e.nom].filter(Boolean).join(' ') })),
    },
    ...(reponses ? { reponses } : {}),
    ...(organisation ? { organisation: String(organisation) } : {}),
  };
}

const est = (v, type) => typeof v === type;
const idConnu = (id, liste) => id == null || liste.some((x) => x.id === id);

/**
 * Valide les paramètres d'une intention contre le repère envoyé. Un identifiant que l'app n'a pas envoyé est
 * rejeté (le modèle ne peut pas désigner un client qui n'existe pas), un montant doit être un nombre positif (sa
 * présence dans la demande n'est pas encore vérifiée). Ce qui manque est accepté seulement si la question
 * correspondante est posée (client, heures) : l'app la pose, rien n'est deviné. Renvoie la liste des problèmes
 * (vide = valide).
 */
export function verifierParametres(intention, p = {}, repere = { clients: [], chantiers: [], equipe: [] }, questions = []) {
  const pb = [];
  const posee = (id) => Array.isArray(questions) && questions.some((q) => q && q.id === id);
  switch (intention) {
    case INTENTIONS.DEVIS:
      if (!idConnu(p.client_id, repere.clients)) pb.push('client_id inconnu');
      if (p.client_id == null && !(est(p.client_nom, 'string') && p.client_nom.trim()) && !posee('client')) pb.push('client manquant');
      if (!Array.isArray(p.lignes) || !p.lignes.length) pb.push('aucune ligne');
      (p.lignes || []).forEach((l, i) => {
        if (!est(l.description, 'string') || !l.description.trim()) pb.push(`ligne ${i + 1} sans description`);
        if (l.montant != null && !(est(l.montant, 'number') && l.montant > 0)) pb.push(`ligne ${i + 1} : montant invalide`);
      });
      if (p.base != null && !['HT', 'TTC'].includes(p.base)) pb.push('base HT/TTC invalide');
      break;
    case INTENTIONS.HEURES:
      if (!idConnu(p.chantier_id, repere.chantiers)) pb.push('chantier_id inconnu');
      if (!idConnu(p.employe_id, repere.equipe)) pb.push('employe_id inconnu');
      if (p.heures == null ? !posee('heures') : !(est(p.heures, 'number') && p.heures > 0 && p.heures <= 24)) pb.push('heures invalides');
      break;
    case INTENTIONS.ENCAISSE:
      if (p.periode != null && !['mois', 'mois_precedent', 'annee', 'semaine'].includes(p.periode)) pb.push('période invalide');
      break;
    case INTENTIONS.RELANCES:
    case INTENTIONS.INCONNUE:
      break;
    default:
      pb.push('intention inconnue');
  }
  return pb;
}

/** Une erreur du contrat : un code connu donne son message ; tout autre code devient une panne générique. */
export function erreurContrat(code) {
  const connu = Object.values(ERREURS).includes(code) ? code : ERREURS.PANNE;
  return { ok: false, code: connu, message: MESSAGES_ERREUR[connu] };
}

/** Demandes restantes ce mois, d'après le compteur du socle (null : sans limite mensuelle ou inconnu). */
function restantDe(quota) {
  const limite = Number(quota?.limite);
  const utilise = Number(quota?.utilise);
  if (!Number.isFinite(limite) || limite < 0 || !Number.isFinite(utilise)) return null;
  return Math.max(0, limite - utilise);
}

/**
 * Lit une réponse brute, de la forme du socle : `{ success: true, intention: {…}, quota }` ou `{ error, code }`.
 * Forme attendue, intention connue, paramètres valides ; sinon une erreur du contrat.
 */
export function lireReponse(brut, repere) {
  if (!brut || typeof brut !== 'object') return erreurContrat(ERREURS.PANNE);
  if (brut.success !== true) return erreurContrat(brut.code);
  const corps = brut.intention && typeof brut.intention === 'object' ? brut.intention : {};
  const intention = Object.values(INTENTIONS).includes(corps.intention) ? corps.intention : INTENTIONS.INCONNUE;
  const parametres = corps.parametres && typeof corps.parametres === 'object' ? corps.parametres : {};
  const questions = Array.isArray(corps.questions) ? corps.questions.filter((q) => q && est(q.id, 'string') && est(q.texte, 'string')) : [];
  const problemes = verifierParametres(intention, parametres, repere, questions);
  if (problemes.length) return { ...erreurContrat(ERREURS.PANNE), problemes };
  return {
    ok: true,
    intention,
    parametres,
    questions,
    confiance: ['haute', 'moyenne', 'basse'].includes(corps.confiance) ? corps.confiance : 'basse',
    restant: restantDe(brut.quota),
  };
}
