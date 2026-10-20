/**
 * Typographie fine du site public — une seule règle, appliquée partout (passe de finition, octobre 2026) :
 * une ESPACE FINE INSÉCABLE (U+202F, celle qu'utilise aussi `Intl` pour les montants) :
 *   - à l'intérieur des guillemets : « mot » ;
 *   - avant ; : ? ! et % (quand une espace les précède dans le texte : « 10 % », « Pourquoi ? ») ;
 *   - entre deux groupes de chiffres : 1 000, 2 081,20 €.
 * Insécable : jamais de « ? » ni de « 000 » rejeté seul au début d'une ligne.
 *
 * Où elle s'applique :
 *   - les textes écrits dans les fichiers du site (texte JSX, chaînes, gabarits) portent déjà le bon caractère :
 *     le vrai caractère dans le texte JSX et les attributs JSX, l'échappement `\u202f` dans les chaînes JS ; le test
 *     `__tests__/typographie.test.js` refuse toute espace ordinaire ou insécable à ces places ;
 *   - `fine()` pour les textes qui viennent d'ailleurs et que le site affiche tels quels (libellés de `PLANS`).
 * Ne s'applique pas aux textes de la bibliothèque des métiers ni à ceux des générateurs (document, objets des
 * relances) : ils sont montrés comme l'application les produit.
 */
export const ESPACE_FINE = '\u202f';

/** Espace ordinaire, insécable ou fine : celles que la règle remplace. */
const ESPACE = '[ \\u00a0\\u202f]';

const OUVRANT = new RegExp(`«${ESPACE}*`, 'g');
const FERMANT = new RegExp(`${ESPACE}*»`, 'g');
// La ponctuation haute n'est rapprochée que si elle termine un mot : « !important » ou « ?a=1 » ne bougent pas
const PONCTUATION = new RegExp(`${ESPACE}+([;:?!%])(?=$|[\\s"'’)\\],.…»])`, 'g');
const MILLIERS = new RegExp(`(\\d)${ESPACE}(?=\\d{3}(?!\\d))`, 'g');

/** Le texte avec la typographie fine du site (idempotent : `fine(fine(t)) === fine(t)`). */
export function fine(texte) {
  return String(texte)
    .replace(OUVRANT, `«${ESPACE_FINE}`)
    .replace(FERMANT, `${ESPACE_FINE}»`)
    .replace(PONCTUATION, `${ESPACE_FINE}$1`)
    .replace(MILLIERS, `$1${ESPACE_FINE}`);
}

/**
 * Les fautes de typographie d'un texte, pour le test : une espace ordinaire ou insécable (pas fine) à une place où la
 * règle veut une espace fine, ou des guillemets sans espace. Chaque faute : l'extrait autour.
 */
export function fautesDeTypographie(texte) {
  const fautes = [];
  const motifs = [
    /«(?!\u202f)/g,
    /(?<!\u202f)»/g,
    /[ \u00a0]([;:?!%])(?=$|[\s"'’)\],.…»])/g,
    /\d[ \u00a0](?=\d{3}(?!\d))/g,
  ];
  for (const motif of motifs) {
    for (const m of String(texte).matchAll(motif)) {
      fautes.push(String(texte).slice(Math.max(0, m.index - 20), m.index + 20).replace(/\u202f/g, '⁐').replace(/\u00a0/g, '⍽'));
    }
  }
  return fautes;
}
