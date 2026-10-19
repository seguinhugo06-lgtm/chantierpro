/**
 * Le « devis vivant » du premier écran du site — logique pure (sans React), testée dans
 * `__tests__/devisVivantEtapes.test.js`. L'affichage est dans `DevisVivant.jsx`.
 *
 * Le devis se monte avec un vrai lot de la bibliothèque des métiers (`src/lib/templates/trade-library.js`) :
 * aucun prix n'est recopié dans le site. Les étapes : une par ligne (total TTC cumulé), puis signé,
 * facturé, payé à 40 %, payé en entier ; la boucle reprend.
 *
 * Nom distinct de `DevisVivant.jsx` (pas seulement par la casse) : sur un disque insensible à la casse (macOS),
 * `./DevisVivant` se résolvait sur la logique, essayée avant le `.jsx`.
 */

/** Numéros et client de la démonstration (fictifs, affichés comme tels par la légende). */
export const NUMERO_DEVIS = 'DEV-2026-00012';
export const NUMERO_FACTURE = 'FAC-2026-00042';
export const CLIENT = 'M. Martin';

/**
 * Nom du lot montré, affiché avant le chargement de la bibliothèque (cadre et titre tout de suite) et repris
 * par la légende. Le test vérifie qu'il est bien celui du lot de la bibliothèque.
 */
export const NOM_LOT_DEMONSTRATION = 'Mise aux normes du tableau électrique';

/**
 * Nombre de lignes de ce lot : réserve leur place avant le chargement (pas de saut de mise en page) et figure
 * dans le texte lu par les lecteurs d'écran (« un devis de 7 lignes »). Vérifié par le test.
 */
export const NB_LIGNES_DEMONSTRATION = 7;

/** Arrondi au centime, sans l'erreur du binaire (10,005 € × 100 = 1000,4999… en flottant). */
function auCentime(montant) {
  return Math.round(Number((montant * 100).toPrecision(12))) / 100;
}

/** Somme de quantité × prix unitaire × (1 + TVA / 100), arrondie au centime. */
export function totalTTC(lignes) {
  return auCentime(lignes.reduce((somme, l) => somme + l.quantite * l.prixUnitaire * (1 + l.tva / 100), 0));
}

/**
 * Les étapes de la démonstration, dans l'ordre :
 * `{ type: 'ligne', ligne, totalTTC }` pour chaque ligne du lot, puis `{ type: 'signe' }`,
 * `{ type: 'facture', numero }`, `{ type: 'encaisse', part: 0.4 }` et `{ type: 'encaisse', part: 1 }`.
 */
export function etapesDuDevis(lot) {
  const lignes = lot.lignes.map((ligne, i) => ({ type: 'ligne', ligne, totalTTC: totalTTC(lot.lignes.slice(0, i + 1)) }));
  return [
    ...lignes,
    { type: 'signe' },
    { type: 'facture', numero: NUMERO_FACTURE },
    { type: 'encaisse', part: 0.4 },
    { type: 'encaisse', part: 1 },
  ];
}

/** Le lot « tableau » de la bibliothèque Électricité ; erreur explicite s'il n'y est plus. */
export function lotDemonstration(bibliotheque) {
  const lot = bibliotheque?.electricite?.lots?.find((l) => l.id.includes('tableau'));
  if (!lot) {
    throw new Error(
      'Devis vivant : aucun lot « tableau » dans la bibliothèque Électricité (src/lib/templates/trade-library.js). '
      + 'Choisir un autre lot dans src/components/landing/devisVivant.js et mettre à jour la légende.',
    );
  }
  return lot;
}

/**
 * Ce que la carte affiche à l'étape `index` (-1 = brouillon vide, avant la première ligne).
 * `statut` : 'brouillon' | 'signe' | 'facture' | 'partiel' | 'payee' ; `encaisse` : null avant la facture,
 * puis la part payée (0, 0.4, 1) ; `tampon` : le tampon « signé en ligne », seulement à la signature.
 */
export function etatDuDevis(etapes, index) {
  const jouees = etapes.slice(0, index + 1);
  const lignes = jouees.filter((e) => e.type === 'ligne');
  const derniere = jouees[jouees.length - 1];
  const facturee = jouees.some((e) => e.type === 'facture');
  const paiements = jouees.filter((e) => e.type === 'encaisse');
  const part = paiements.length ? paiements[paiements.length - 1].part : 0;

  let statut = 'brouillon';
  if (jouees.some((e) => e.type === 'signe')) statut = 'signe';
  if (facturee) statut = 'facture';
  if (part > 0) statut = part >= 1 ? 'payee' : 'partiel';

  return {
    lignesVues: lignes.length,
    totalTTC: lignes.length ? lignes[lignes.length - 1].totalTTC : 0,
    statut,
    numero: facturee ? NUMERO_FACTURE : NUMERO_DEVIS,
    tampon: derniere?.type === 'signe',
    encaisse: facturee ? part : null,
  };
}

/**
 * Temps passé à l'étape `index` avant la suivante, en millisecondes : le rythme du prototype validé par Hugo
 * (une ligne toutes les 0,76 s, une pause avant la signature, l'état « payé » tenu plus de 4 s).
 */
export function dureeEtape(etapes, index) {
  if (index < 0) return 700;
  const etape = etapes[index];
  if (!etape) return 700;
  if (etape.type === 'ligne') return etapes[index + 1]?.type === 'ligne' ? 760 : 1600;
  if (etape.type === 'signe') return 1800;
  if (etape.type === 'facture') return 1200;
  return etape.part < 1 ? 1600 : 4100;
}

/** « Total TTC (TVA 10 %) » quand toutes les lignes ont le même taux, sinon « Total TTC ». */
export function libelleTotal(lignes) {
  const taux = [...new Set(lignes.map((l) => l.tva))];
  if (taux.length !== 1) return 'Total TTC';
  return `Total TTC (TVA ${String(taux[0]).replace('.', ',')} %)`;
}
