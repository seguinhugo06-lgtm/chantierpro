/**
 * Contrat de l'assistant (prototype, 3 nov. 2026) — ce que l'app envoie à la fonction Edge et ce qu'elle attend en
 * retour. La fonction Edge elle-même (modèle, quota, coupure, journal) est préparée par une autre session
 * (branche `cloud/ia-socle`) : ce fichier n'en fixe que l'interface. Voir `docs/ia/ligne-directrice.md` § 5.
 *
 * Principe : le modèle COMPREND la demande et propose une ACTION structurée. Il ne calcule aucun montant et
 * n'écrit rien en base : les chiffres viennent des données de l'artisan (calculés dans l'app par les mêmes
 * fonctions que les écrans), et rien n'est enregistré ni envoyé avant le geste de validation.
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
 * }
 *
 * ── Réponse ─────────────────────────────────────────────────────────────────────────────────────────────────
 * { ok: true, intention, parametres, questions, confiance, restant }
 *   intention : une des INTENTIONS ci-dessous ;
 *   parametres : selon l'intention (voir `verifierParametres`) — les identifiants viennent de `repere`,
 *     un nom introuvable reste en texte (`client_nom`) et devient une question ;
 *   questions : [{ id, texte, choix?: [{ valeur, libelle }] }] — ce que le modèle ne sait pas (HT ou TTC, taux de TVA,
 *     client ambigu…) : l'app les pose, n'invente rien ;
 *   confiance : 'haute' | 'moyenne' | 'basse' ;
 *   restant : nombre de demandes restantes ce mois pour l'organisation (affiché seulement quand il est bas).
 * { ok: false, code, message }
 *   code : une des ERREURS ci-dessous ; message : phrase courte pour l'artisan.
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

export const ERREURS = Object.freeze({
  HORS_LIGNE: 'hors_ligne',       // pas de réseau : la demande reste dans le champ, rien n'est perdu
  QUOTA: 'quota_atteint',         // quota mensuel de l'organisation atteint
  COUPURE: 'service_coupe',       // crédits du mois épuisés ou coupure manuelle : l'assistant est en pause pour tous
  LENT: 'delai_depasse',          // pas de réponse en 15 s
  REFUS: 'demande_refusee',       // contenu refusé (injection détectée, texte vide ou trop long)
  PANNE: 'erreur',                // tout le reste
});

/** Ce que l'artisan lit pour chaque erreur : court, sans jargon, et ce qui marche encore. */
export const MESSAGES_ERREUR = Object.freeze({
  [ERREURS.HORS_LIGNE]: 'Pas de réseau. Votre demande est gardée : réessayez quand le réseau revient.',
  [ERREURS.QUOTA]: 'Vous avez utilisé toutes vos demandes du mois. Tout le reste de l’app fonctionne normalement.',
  [ERREURS.COUPURE]: 'L’assistant est momentanément indisponible. Tout le reste de l’app fonctionne normalement.',
  [ERREURS.LENT]: 'La réponse tarde. Réessayez dans un instant.',
  [ERREURS.REFUS]: 'Je n’ai pas pu traiter ce texte. Reformulez en quelques mots.',
  [ERREURS.PANNE]: 'Un souci technique m’empêche de répondre. Réessayez dans un instant.',
});

export const DELAI_MS = 15000;

/** Construit la requête : texte nettoyé et borné, repère réduit aux noms (aucun montant, aucune coordonnée). */
export function construireRequete({ texte, source = 'clavier', page = '', clients = [], chantiers = [], equipe = [], reponses } = {}) {
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
  };
}

const est = (v, type) => typeof v === type;
const idConnu = (id, liste) => id == null || liste.some((x) => x.id === id);

/**
 * Valide les paramètres d'une intention contre le repère envoyé. Un identifiant que l'app n'a pas envoyé est
 * rejeté (le modèle ne peut pas désigner un client qui n'existe pas), un montant doit être un nombre positif
 * explicitement dicté. Renvoie la liste des problèmes (vide = valide).
 */
export function verifierParametres(intention, p = {}, repere = { clients: [], chantiers: [], equipe: [] }) {
  const pb = [];
  switch (intention) {
    case INTENTIONS.DEVIS:
      if (!idConnu(p.client_id, repere.clients)) pb.push('client_id inconnu');
      if (p.client_id == null && !est(p.client_nom, 'string')) pb.push('client manquant');
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
      if (!(est(p.heures, 'number') && p.heures > 0 && p.heures <= 24)) pb.push('heures invalides');
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

/** Lit une réponse brute : forme attendue, intention connue, paramètres valides ; sinon une erreur du contrat. */
export function lireReponse(brut, repere) {
  if (!brut || typeof brut !== 'object') return { ok: false, code: ERREURS.PANNE, message: MESSAGES_ERREUR[ERREURS.PANNE] };
  if (brut.ok === false) {
    const code = Object.values(ERREURS).includes(brut.code) ? brut.code : ERREURS.PANNE;
    return { ok: false, code, message: MESSAGES_ERREUR[code] };
  }
  const intention = Object.values(INTENTIONS).includes(brut.intention) ? brut.intention : INTENTIONS.INCONNUE;
  const parametres = brut.parametres && typeof brut.parametres === 'object' ? brut.parametres : {};
  const problemes = verifierParametres(intention, parametres, repere);
  if (problemes.length) return { ok: false, code: ERREURS.PANNE, message: MESSAGES_ERREUR[ERREURS.PANNE], problemes };
  return {
    ok: true,
    intention,
    parametres,
    questions: Array.isArray(brut.questions) ? brut.questions.filter((q) => q && est(q.id, 'string') && est(q.texte, 'string')) : [],
    confiance: ['haute', 'moyenne', 'basse'].includes(brut.confiance) ? brut.confiance : 'basse',
    restant: Number.isFinite(brut.restant) ? brut.restant : null,
  };
}
