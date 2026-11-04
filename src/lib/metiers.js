/**
 * Le métier de l'artisan (lot 1 de docs/metiers/synthese.md, § 3.1 et 3.2 ; décision d'Hugo du 4 nov. 2026).
 *
 * Principe : un métier ne crée pas une autre app. Il règle l'ordre du catalogue et des modèles, et allume des modules.
 * Rien n'est caché définitivement (« Afficher tous les métiers ») ; un artisan qui ne choisit rien garde l'app telle
 * qu'elle est. Choix multiple : plombier-chauffagiste, serrurier-métallier…
 *
 * Enregistré dans `entreprise.metiers` (migration 110) ; tant que la colonne n'existe pas, dans
 * `settings_json.reglages.metiers` (src/services/entrepriseService.js). Logique pure, testée dans
 * src/lib/__tests__/metiers.test.js.
 *
 * Correspondances :
 * - `bibliotheque` : clés de TRADE_LIBRARY (src/lib/templates/trade-library.js) ;
 * - `referentiel` : catégories du référentiel d'articles (src/lib/data/articles-btp.js, import du catalogue) ;
 * - `modeles` : familles de MODELES_DEVIS (src/lib/data/modeles/index.js) ;
 * - `qualifications` : types de « Mes qualifications » proposés en premier (src/lib/qualifications.js).
 */

export const METIERS = [
  { id: 'electricien', nom: 'Électricien', bibliotheque: ['electricite'], referentiel: ['electricite'], modeles: ['electricite', 'domotique', 'irve-solaire'], qualifications: ['irve', 'rge'] },
  { id: 'plombier', nom: 'Plombier', bibliotheque: ['plomberie'], referentiel: ['plomberie'], modeles: ['plomberie', 'assainissement'], qualifications: ['pg_gaz', 'rge'] },
  { id: 'chauffagiste', nom: 'Chauffagiste', bibliotheque: ['chauffage', 'plomberie'], referentiel: ['chauffage', 'plomberie'], modeles: ['chauffage', 'renovation-energetique'], qualifications: ['rge', 'pg_gaz', 'fluides'] },
  { id: 'frigoriste', nom: 'Frigoriste, climaticien', bibliotheque: ['froid', 'chauffage'], referentiel: ['chauffage'], modeles: ['chauffage'], qualifications: ['fluides', 'rge'] },
  { id: 'ramoneur', nom: 'Ramoneur', bibliotheque: ['ramonage'], referentiel: ['chauffage'], modeles: ['ramonage'], qualifications: [], modules: ['ramonage'] },
  { id: 'macon', nom: 'Maçon', bibliotheque: ['maconnerie', 'terrassement', 'demolition'], referentiel: ['maconnerie', 'terrassement', 'demolition'], modeles: ['maconnerie', 'terrassement', 'demolition', 'ravalement', 'assainissement'], qualifications: ['rge'] },
  { id: 'couvreur', nom: 'Couvreur', bibliotheque: ['couverture', 'etancheite'], referentiel: ['couverture', 'etancheite'], modeles: ['couverture', 'etancheite'], qualifications: ['rge'] },
  { id: 'charpentier', nom: 'Charpentier', bibliotheque: ['charpente'], referentiel: ['menuiserie', 'couverture'], modeles: ['charpente'], qualifications: ['rge', 'certibiocide'] },
  { id: 'menuisier', nom: 'Menuisier', bibliotheque: ['menuiserie', 'vitrerie'], referentiel: ['menuiserie', 'vitrerie'], modeles: ['menuiserie', 'fermetures', 'cuisine', 'vitrerie'], qualifications: ['rge'] },
  { id: 'plaquiste', nom: 'Plaquiste, plâtrier', bibliotheque: ['platrerie', 'isolation'], referentiel: ['isolation'], modeles: ['platrerie', 'isolation'], qualifications: ['rge'] },
  { id: 'peintre', nom: 'Peintre', bibliotheque: ['peinture'], referentiel: ['peinture'], modeles: ['peinture', 'sols-souples', 'ravalement'], qualifications: [] },
  { id: 'carreleur', nom: 'Carreleur', bibliotheque: ['carrelage'], referentiel: ['carrelage'], modeles: ['carrelage', 'sols-souples'], qualifications: [] },
  { id: 'serrurier', nom: 'Serrurier, métallier', bibliotheque: ['serrurerie', 'vitrerie'], referentiel: ['serrurerie', 'vitrerie'], modeles: ['serrurerie', 'metallerie', 'fermetures'], qualifications: [] },
  { id: 'paysagiste', nom: 'Paysagiste', bibliotheque: ['paysagisme'], referentiel: ['paysagisme'], modeles: ['paysagisme'], qualifications: ['certiphyto', 'sap'] },
  { id: 'multiservice', nom: 'Multiservice, petits travaux', bibliotheque: ['multiservice'], referentiel: ['plomberie', 'electricite', 'peinture'], modeles: ['nettoyage'], qualifications: ['sap'] },
  { id: 'autre', nom: 'Autre', bibliotheque: [], referentiel: [], modeles: [], qualifications: [] },
];

const PAR_ID = Object.fromEntries(METIERS.map((m) => [m.id, m]));

/** Les métiers connus, sans doublon, dans l'ordre de la liste (une valeur inconnue ou mal formée est ignorée). */
export function normaliserMetiers(valeur) {
  const choisis = new Set(Array.isArray(valeur) ? valeur.filter((v) => typeof v === 'string') : []);
  return METIERS.filter((m) => choisis.has(m.id)).map((m) => m.id);
}

const reunir = (metiers, cle) => {
  const vus = [];
  for (const id of normaliserMetiers(metiers)) {
    for (const v of PAR_ID[id][cle] || []) if (!vus.includes(v)) vus.push(v);
  }
  return vus;
};

/** Clés de la bibliothèque (TRADE_LIBRARY) des métiers choisis, dans l'ordre du choix. */
export const bibliothequeDes = (metiers) => reunir(metiers, 'bibliotheque');
/** Catégories du référentiel d'articles des métiers choisis. */
export const referentielDes = (metiers) => reunir(metiers, 'referentiel');
/** Familles de modèles de devis des métiers choisis. */
export const modelesDes = (metiers) => reunir(metiers, 'modeles');
/** Types de qualification proposés en premier pour ces métiers. */
export const qualificationsDes = (metiers) => reunir(metiers, 'qualifications');

/**
 * Sépare une liste en « du métier » (dans l'ordre des métiers choisis) et « les autres » (dans leur ordre d'origine).
 * Sans métier choisi, ou sans rien de reconnu, tout est dans `premiers` : l'app reste telle qu'elle est.
 * @param {Array} elements
 * @param {string[]} cles   clés préférées (bibliothequeDes, modelesDes…)
 * @param {(e: any) => string} idDe
 */
export function partagerParMetier(elements, cles, idDe) {
  const liste = Array.isArray(elements) ? elements : [];
  const preferes = (cles || []).map((c) => liste.find((e) => idDe(e) === c)).filter(Boolean);
  if (!preferes.length) return { premiers: liste, autres: [] };
  return { premiers: preferes, autres: liste.filter((e) => !preferes.includes(e)) };
}

/**
 * Les changements à enregistrer sur la fiche entreprise quand l'artisan choisit ses métiers. Les modules du métier
 * s'allument (ramoneur → « J'effectue des ramonages ») ; aucun n'est éteint quand un métier est retiré : l'artisan
 * l'éteint lui-même dans Paramètres, ses attestations restent.
 */
export function changementsDuChoix(entreprise, metiers) {
  const ids = normaliserMetiers(metiers);
  const patch = { metiers: ids };
  const modules = new Set(ids.flatMap((id) => PAR_ID[id].modules || []));
  if (modules.has('ramonage') && !entreprise?.ramonageActif) patch.ramonageActif = true;
  return patch;
}

/** « Électricien, Plombier » pour un résumé, ou '' . */
export function nomsDesMetiers(metiers) {
  return normaliserMetiers(metiers).map((id) => PAR_ID[id].nom).join(', ');
}
