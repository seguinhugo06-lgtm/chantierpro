/**
 * Typographie fine du site public — une seule règle, appliquée partout (passe de finition, octobre 2026) :
 *   - une ESPACE FINE INSÉCABLE (U+202F, celle qu'utilise aussi `Intl` pour les montants) à l'intérieur des
 *     guillemets (« mot »), avant ; : ? ! et % quand une espace les précède dans le texte (« 10 % », « Pourquoi ? »),
 *     et entre deux groupes de chiffres (1 000, 2 081,20 €). Insécable : jamais de « ? » ni de « 000 » rejeté seul au
 *     début d'une ligne ;
 *   - l'APOSTROPHE TYPOGRAPHIQUE (\u2019, U+2019) entre deux lettres, à la place de l'apostrophe droite ;
 *   - « 1\u1d49\u02b3 » (lettres en exposant) à la place de « 1er ».
 *
 * Où elle s'applique :
 *   - les textes écrits dans les fichiers du site (texte JSX, chaînes, gabarits, attributs JSX qui sont du texte)
 *     portent déjà les bons caractères : le vrai caractère dans le texte JSX et les attributs JSX, l'échappement
 *     `\u202f` (ou le vrai caractère) dans les chaînes JS ; le test `__tests__/typographie.test.js` refuse toute faute ;
 *   - `fine()` pour les textes qui viennent d'ailleurs et que le site affiche tels quels (libellés de `PLANS`).
 * Ne s'applique ni aux attributs techniques (classes, adresses, identifiants), ni aux textes de la bibliothèque des
 * métiers, des générateurs (document, objets et messages des relances) ou de l'application : ils sont montrés comme
 * l'application les produit.
 */
export const ESPACE_FINE = '\u202f';
export const APOSTROPHE = '\u2019';
export const PREMIER = '1\u1d49\u02b3';

/** Espace ordinaire, insécable ou fine : celles que la règle remplace. */
const ESPACE = '[ \\u00a0\\u202f]';

const OUVRANT = new RegExp(`«${ESPACE}*`, 'g');
const FERMANT = new RegExp(`${ESPACE}*»`, 'g');
// La ponctuation haute n'est rapprochée que si elle termine un mot : « !important » ou « ?a=1 » ne bougent pas
const PONCTUATION = new RegExp(`${ESPACE}+([;:?!%])(?=$|[\\s"'\u2019)\\],.…»])`, 'g');
const MILLIERS = new RegExp(`(\\d)${ESPACE}(?=\\d{3}(?!\\d))`, 'g');
// Apostrophe droite entre deux lettres (« l'application ») ; une apostrophe isolée ou un guillemet de code ne bouge pas
const APOSTROPHE_DROITE = /(\p{L})'(?=\p{L})/gu;
const PREMIER_EN_LIGNE = /(?<![\d\p{L}])1er(?![\p{L}\d])/gu;

/** Le texte avec la typographie fine du site (idempotent : `fine(fine(t)) === fine(t)`). */
export function fine(texte) {
  return String(texte)
    .replace(OUVRANT, `«${ESPACE_FINE}`)
    .replace(FERMANT, `${ESPACE_FINE}»`)
    .replace(PONCTUATION, `${ESPACE_FINE}$1`)
    .replace(MILLIERS, `$1${ESPACE_FINE}`)
    .replace(APOSTROPHE_DROITE, `$1${APOSTROPHE}`)
    .replace(PREMIER_EN_LIGNE, PREMIER);
}

/**
 * Les fautes de typographie d'un texte, pour le test : une espace ordinaire ou insécable (pas fine) à une place où la
 * règle veut une espace fine, des guillemets sans espace, une apostrophe droite entre deux lettres, « 1er ». Chaque
 * faute : l'extrait autour.
 */
export function fautesDeTypographie(texte) {
  const fautes = [];
  const motifs = [
    /«(?!\u202f)/g,
    /(?<!\u202f)»/g,
    /[ \u00a0]([;:?!%])(?=$|[\s"'\u2019)\],.…»])/g,
    /\d[ \u00a0](?=\d{3}(?!\d))/g,
    /\p{L}'(?=\p{L})/gu,
    /(?<![\d\p{L}])1er(?![\p{L}\d])/gu,
  ];
  for (const motif of motifs) {
    for (const m of String(texte).matchAll(motif)) {
      fautes.push(String(texte).slice(Math.max(0, m.index - 20), m.index + 20).replace(/\u202f/g, '⁐').replace(/\u00a0/g, '⍽'));
    }
  }
  return fautes;
}
