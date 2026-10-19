/**
 * Fin de l'ancien code de thème et de couleurs (plan du 19 oct. 2026) : la table de correspondances de la spec
 * (docs/superpowers/specs/2026-10-19-ancien-code-design.md, section « Correspondances ») et sa lecture,
 * classe par classe. Seules ces correspondances sont permises : une classe colorée absente de la table n'en a pas.
 *
 *   jetonsPour(classesClaires)   la branche claire d'un ternaire isDark traduite en jetons, ou null si une seule
 *                                classe colorée n'a pas de correspondance (le ternaire reste alors intact)
 *   correspondance(classe)       une classe seule traduite (null : pas de correspondance)
 *   remplacerOranges(classes)    les seules lignes orange de la table, pour les className (hors ternaires)
 *
 * Une classe se lit « variantes + ! + utilitaire + /opacité » (sm:hover:!bg-white/80) : la correspondance porte sur
 * l'utilitaire et garde variantes, important et opacité. Elle est « colorée » si son utilitaire nomme une couleur de
 * palette (slate, orange…, white, black, et les anciennes primary/success/warning/danger-NNN) ou une couleur
 * arbitraire (bg-[#f5f5f5]) ; les jetons du thème (bg-surface, text-encre-2, bg-accent/10…) et les couleurs qui ne
 * dépendent pas du thème (transparent, current, inherit) restent tels quels ; le reste (text-sm, p-4, shadow…) aussi.
 * Le classement est volontairement large : une couleur prise pour une classe neutre serait gardée telle quelle et
 * imposerait la teinte claire au mode sombre ; une couleur sans correspondance laisse au contraire le code intact.
 */

/** La table de la spec, côté clair → jeton. `survol` : ligne propre aux états de survol (hover:, group-hover:). */
export const CORRESPONDANCES = [
  { de: ['bg-white'], vers: 'bg-surface' },
  { de: ['bg-slate-50', 'bg-gray-50'], vers: 'bg-fond' },
  { de: ['bg-slate-100', 'bg-gray-100'], vers: 'bg-surface-2' },
  { de: ['border-slate-100', 'border-slate-200', 'border-gray-200'], vers: 'border-bord' },
  { de: ['border-slate-300', 'border-gray-300'], vers: 'border-bord-fort' },
  { de: ['text-slate-900', 'text-slate-800', 'text-gray-900', 'text-[#1a1a1a]'], vers: 'text-encre' },
  { de: ['text-slate-700', 'text-slate-600', 'text-gray-700', 'text-gray-600'], vers: 'text-encre-2' },
  { de: ['text-slate-500', 'text-slate-400', 'text-gray-500', 'text-gray-400'], vers: 'text-encre-3' },
  { de: ['bg-slate-50', 'bg-slate-100', 'bg-gray-50', 'bg-gray-100'], vers: 'bg-surface-2', survol: true },
  { de: ['placeholder-slate-400'], vers: 'placeholder:text-encre-3' },
  { de: ['bg-orange-500', 'bg-orange-600', 'bg-[#f97316]'], vers: 'bg-accent', orange: true },
  { de: ['text-orange-500', 'text-orange-600', 'text-orange-700'], vers: 'text-accent-texte', orange: true },
  { de: ['bg-orange-50', 'bg-orange-100'], vers: 'bg-accent/10', orange: true },
  { de: ['border-orange-200', 'border-orange-300'], vers: 'border-accent/30', orange: true },
  { de: ['ring-orange-500'], vers: 'ring-accent', orange: true },
];

const PAR_BASE = new Map();
const AU_SURVOL = new Map();
for (const ligne of CORRESPONDANCES) {
  for (const de of ligne.de) {
    if (ligne.survol) AU_SURVOL.set(de, ligne.vers);
    else PAR_BASE.set(de, { vers: ligne.vers, orange: Boolean(ligne.orange) });
  }
}
/** Variantes de survol : la ligne « hover:bg-slate-50|100 → hover:bg-surface-2 » s'y applique. */
const SURVOLS = new Set(['hover', 'group-hover']);

const UTILITAIRE = '([a-z]+(?:-[a-z]+)*?)';
const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|primary|success|warning|danger';
const RE_PALETTE = new RegExp(`^${UTILITAIRE}-(?:(?:${PALETTE})-\\d{2,3}|white|black|marque-[a-z0-9-]+)$`);
const RE_ARBITRAIRE = new RegExp(`^${UTILITAIRE}-\\[(?:#[0-9a-fA-F]{3,8}|(?:rgb|hsl)a?\\(.*\\)|color:.*)\\]$`);
const JETONS = [
  'fond', 'surface', 'surface-2', 'bord', 'bord-fort', 'encre', 'encre-2', 'encre-3',
  'accent', 'accent-fort', 'accent-texte', 'sur-accent', 'signature',
  '(?:neutre|info|succes|alerte|danger)-(?:fond|texte|point)', 'vedette-(?:bord|libelle|valeur|contexte)',
  'transparent', 'current', 'inherit',
].join('|');
const RE_JETON = new RegExp(`^${UTILITAIRE}-(?:${JETONS})$`);

/** Dernière position de `car` hors crochets (les valeurs arbitraires peuvent contenir « : » ou « / »). */
function derniereHorsCrochets(texte, car) {
  let profondeur = 0;
  let position = -1;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (c === '[') profondeur++;
    else if (c === ']') profondeur--;
    else if (c === car && profondeur === 0) position = i;
  }
  return position;
}

/** La base d'une classe, couleurs hexadécimales arbitraires en minuscules (bg-[#F97316] → bg-[#f97316]). */
const normaliser = (base) => base.replace(/\[#([0-9a-fA-F]+)\]/, (_, hex) => `[#${hex.toLowerCase()}]`);

/**
 * Une classe découpée : { classe, variantes ('sm:hover:'), important ('!'), base ('bg-white'), opacite ('/80'),
 * utilitaire ('bg', 'text', 'border-t'…), genre ('couleur' | 'jeton' | 'neutre') }.
 */
export function analyserClasse(classe) {
  const deuxPoints = derniereHorsCrochets(classe, ':');
  const variantes = classe.slice(0, deuxPoints + 1);
  let reste = classe.slice(deuxPoints + 1);
  const important = reste.startsWith('!') ? '!' : '';
  reste = reste.slice(important.length);
  const barre = derniereHorsCrochets(reste, '/');
  const base = barre === -1 ? reste : reste.slice(0, barre);
  const opacite = barre === -1 ? '' : reste.slice(barre);
  let genre = 'neutre';
  let m = RE_PALETTE.exec(base) || RE_ARBITRAIRE.exec(base);
  if (m) genre = 'couleur';
  else if ((m = RE_JETON.exec(base))) genre = 'jeton';
  return { classe, variantes, important, base, opacite, utilitaire: m ? m[1] : null, genre };
}

/** Le jeton est-il une classe Tailwind (et non une valeur : #fff, rgba(…), 1px, 0.5) ? */
function estClasse(jeton) {
  const horsCrochets = jeton.replace(/\[[^\]]*\]/g, '');
  if (horsCrochets === '') return /^\[.+\]$/.test(jeton); // propriété arbitraire : [mask-type:alpha]
  if (!/^[!a-zA-Z0-9_\-:./%@]+$/.test(horsCrochets)) return false;
  return /^-?[a-z@]/.test(analyserClasse(jeton).base);
}

/** Une chaîne faite uniquement de classes Tailwind (la chaîne vide en est une). */
export function estChaineDeClasses(texte) {
  return texte.split(/\s+/).filter(Boolean).every(estClasse);
}

/** La dernière variante d'une chaîne de variantes : 'sm:hover:' → 'hover'. */
const derniereVariante = (variantes) => variantes.slice(0, -1).split(':').pop();

function assembler(a, vers) {
  const i = vers.lastIndexOf(':');
  const utilitaire = vers.slice(i + 1);
  if (a.opacite && utilitaire.includes('/')) return null; // bg-orange-50/50 : le jeton porte déjà une opacité
  return a.variantes + vers.slice(0, i + 1) + a.important + utilitaire + a.opacite;
}

function correspondanceAnalysee(a) {
  if (a.genre !== 'couleur') return a.classe;
  const cle = normaliser(a.base);
  const vers = (SURVOLS.has(derniereVariante(a.variantes)) && AU_SURVOL.get(cle)) || PAR_BASE.get(cle)?.vers;
  return vers ? assembler(a, vers) : null;
}

/** Une classe seule traduite selon la table ; telle quelle si elle n'est pas colorée ; null sans correspondance. */
export function correspondance(classe) {
  return correspondanceAnalysee(analyserClasse(classe));
}

/** La classe relève-t-elle d'une ligne orange de la table ? */
function estLigneOrange(a) {
  return a.genre === 'couleur' && Boolean(PAR_BASE.get(normaliser(a.base))?.orange);
}

/** La classe telle que la deviendrait une ligne orange de la table (elle-même sinon). */
export function traductionOrange(classe) {
  const a = analyserClasse(classe);
  return estLigneOrange(a) ? (correspondanceAnalysee(a) ?? classe) : classe;
}

/** Un aplat d'accent plein (bg-accent, sans opacité), qui demande un texte blanc par-dessus. */
function estAplatAccent(classe) {
  const a = analyserClasse(classe);
  return a.base === 'bg-accent' && a.opacite === '';
}

export const estCouleurDeTexte = (a) => a.utilitaire === 'text' && a.genre !== 'neutre';
export const estCouleurDeFond = (a) => a.utilitaire === 'bg' && a.genre !== 'neutre';
const estBlanc = (a) => a.base === 'text-white';
const estSurAccent = (a) => a.base === 'text-sur-accent';

/**
 * Traduit les classes d'une même chaîne. Un texte blanc posé sur un aplat d'accent de mêmes variantes devient
 * text-sur-accent ; un texte d'une autre couleur sur cet aplat le rendrait illisible : l'aplat est refusé.
 *   complet         toutes les classes colorées passent par la table ; une seule sans correspondance → null
 *   seulementOrange seules les lignes orange sont traduites, les autres classes restent telles quelles
 * Rend { classes, changements, manquantes, refus } (classes : null en mode complet si la traduction est impossible).
 */
function traduire(jetons, { seulementOrange }) {
  const analyses = jetons.map(analyserClasse);
  const traduites = analyses.map((a) => {
    if (a.genre !== 'couleur' || (seulementOrange && !estLigneOrange(a))) return a.classe;
    // seulementOrange : une ligne orange sans traduction possible (bg-orange-50/50) reste telle quelle
    return correspondanceAnalysee(a) ?? (seulementOrange ? a.classe : null);
  });
  // aplats d'accent par chaîne de variantes : ceux de la traduction, et ceux qui étaient déjà des jetons
  const aplats = new Map();
  traduites.forEach((t, i) => {
    if (t && estAplatAccent(t)) {
      const v = analyses[i].variantes;
      if (!aplats.has(v)) aplats.set(v, { indices: [], traduit: false });
      aplats.get(v).indices.push(i);
      if (t !== analyses[i].classe) aplats.get(v).traduit = true;
    }
  });
  const refus = [];
  for (const [v, aplat] of aplats) {
    // un texte de mêmes variantes qui n'est ni blanc ni déjà text-sur-accent
    const fonce = analyses.find((a) => a.variantes === v && estCouleurDeTexte(a) && !estBlanc(a) && !estSurAccent(a));
    if (fonce) {
      if (!seulementOrange) return { classes: null, changements: 0, manquantes: [], refus: [{ classe: fonce.classe, raison: 'texte non blanc sur aplat' }] };
      for (const i of aplat.indices) traduites[i] = analyses[i].classe;
      refus.push({ classe: aplat.indices.map((i) => analyses[i].classe).join(' '), raison: 'texte non blanc sur aplat' });
      aplat.refuse = true;
    }
  }
  analyses.forEach((a, i) => {
    const aplat = aplats.get(a.variantes);
    if (estBlanc(a) && aplat && !aplat.refuse && (aplat.traduit || !seulementOrange)) {
      traduites[i] = assembler(a, 'text-sur-accent');
    }
  });
  const manquantes = analyses.filter((a, i) => traduites[i] === null).map((a) => a.classe);
  if (!seulementOrange && manquantes.length) return { classes: null, changements: 0, manquantes, refus };
  const changements = analyses.filter((a, i) => estLigneOrange(a) && traduites[i] !== a.classe).length;
  return { classes: traduites, changements, manquantes, refus };
}

/**
 * La branche claire d'un ternaire isDark en jetons : { resultat, manquantes, refus }.
 * resultat est null si une seule classe colorée n'a pas de correspondance, ou si un texte foncé tombe sur un aplat.
 */
export function analyserBrancheClaire(classesClaires) {
  const jetons = classesClaires.split(/\s+/).filter(Boolean);
  const { classes, manquantes, refus } = traduire(jetons, { seulementOrange: false });
  return { resultat: classes ? classes.join(' ') : null, manquantes, refus };
}

/** La branche claire d'un ternaire isDark traduite en jetons, ou null (le ternaire reste alors intact). */
export function jetonsPour(classesClaires) {
  return analyserBrancheClaire(classesClaires).resultat;
}

/**
 * Les lignes orange de la table appliquées aux classes d'une même chaîne de className (hors ternaires isDark) :
 * { classes (même longueur, même ordre), changements (classes orange traduites), refus }.
 */
export function remplacerOranges(jetons) {
  const { classes, changements, refus } = traduire(jetons, { seulementOrange: true });
  return { classes, changements, refus };
}
