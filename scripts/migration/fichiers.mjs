#!/usr/bin/env node
/**
 * Fin de l'ancien code de thème et de couleurs (plan du 19 oct. 2026) : quels fichiers sont concernés
 * et combien d'ancien code ils portent encore.
 *
 *   fichiersConcernes(racine)   fichiers de src/ atteignables depuis src/main.jsx (imports statiques,
 *                               imports d'effet, réexports, import() dynamiques dont lazy), hors exceptions
 *   compterAncienCode(source)   occurrences des quatre motifs dans un fichier
 *   node scripts/migration/fichiers.mjs [--fichiers]   totaux (et, avec --fichiers, le détail par fichier)
 *
 * Le test src/lib/__tests__/ancienCode.test.js compare les totaux au plafond (ancienCode.plafond.json).
 * Module sans dépendance : Node (fs, path) seulement, pour être importable par le test comme par un script.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ENTREE = 'src/main.jsx';

/**
 * Exceptions, jamais comptées ni transformées : le site public, les générateurs de documents et d'e-mails,
 * et les pages publiques de l'artisan (signature, paiement, portail, nouveau mot de passe). Celles-ci montrent
 * à son client la couleur brute de l'artisan (sa marque face à son client), pas l'accent lisible du thème.
 */
export const EXCEPTIONS = {
  dossiers: [
    'src/components/landing/',
    'src/components/signature/', 'src/components/payment/', 'src/components/portal/',
  ],
  fichiers: [
    'src/lib/devisHtmlBuilder.js', 'src/lib/pdfHtmlBuilder.js', 'src/lib/miseEnDemeureBuilder.js',
    'src/lib/rapportChantierPdf.js', 'src/lib/reportPdfBuilder.js', 'src/lib/emailSender.js',
    'src/lib/relanceUtils.js', 'src/lib/echapperHtml.js',
    'src/components/auth/NouveauMotDePasse.jsx',
  ],
};

export const MOTIFS = ['ternaires', 'styleCouleur', 'teinteCouleur', 'orange'];

const CHAINE_SIMPLE = String.raw`(?:'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")`;
const RE = {
  // isDark ? '…' : '…' : les deux branches sont des chaînes simples, espaces et retours à la ligne permis
  ternaires: new RegExp(String.raw`\bisDark\s*\?\s*${CHAINE_SIMPLE}\s*:\s*${CHAINE_SIMPLE}`, 'g'),
  // la couleur brute de l'entreprise posée en style
  styleCouleur: /(?:background|backgroundColor|color|borderColor|borderTopColor)\s*:\s*(?:couleur|accent)\b/g,
  // une teinte de cette couleur : ${couleur}15
  teinteCouleur: /\$\{(?:couleur|accent)\}[0-9a-fA-F]{2}/g,
  // l'orange en dur
  orange: /(?:\b(?:bg|text|border|from|to|via|ring)-orange-\d{2,3}|#f97316|#ea580c)/gi,
};

/* ------------------------------------------------------------------------------------------------
 * Neutralisation : on remplace par des espaces (les retours à la ligne restent : positions et numéros
 * de ligne inchangés) ce qui ne doit pas être compté ni suivi, c'est-à-dire
 *   - les commentaires ;
 *   - les chaînes et gabarits qui contiennent « < » (HTML de document ou d'e-mail : une couleur y est
 *     une valeur d'impression, pas du thème). Dans un gabarit, on regarde le texte fixe, pas les
 *     expressions ${…} : « ${a < b ? … : …} » n'est pas du HTML.
 * Balayeur simple, pas un analyseur : il sait ignorer une apostrophe de texte JSX (« l'artisan »,
 * collée à une lettre) et une expression régulière.
 * ---------------------------------------------------------------------------------------------- */

const LETTRE = /[\p{L}\p{N}_$]/u;

/** Le texte remplacé par des espaces, retours à la ligne conservés. */
const blanchir = (texte) => texte.replace(/[^\n]/g, ' ');

function finDeChaine(src, debut) {
  const guillemet = src[debut];
  for (let j = debut + 1; j < src.length; j++) {
    const c = src[j];
    if (c === '\\') j++;
    else if (c === guillemet) return j;
    else if (c === '\n') return -1;
  }
  return -1;
}

function finDeRegex(src, debut) {
  let classe = false;
  for (let j = debut + 1; j < src.length; j++) {
    const c = src[j];
    if (c === '\\') j++;
    else if (c === '\n') return -1;
    else if (c === '[') classe = true;
    else if (c === ']') classe = false;
    else if (c === '/' && !classe) return j;
  }
  return -1;
}

function gabarit(src, debut) {
  let fixe = '';
  let sortie = '`';
  let j = debut + 1;
  while (j < src.length) {
    const c = src[j];
    if (c === '\\') {
      fixe += src.slice(j, j + 2);
      sortie += src.slice(j, j + 2);
      j += 2;
    } else if (c === '`') {
      sortie += '`';
      j++;
      break;
    } else if (c === '$' && src[j + 1] === '{') {
      const dedans = balayer(src, j + 2, true);
      sortie += '${' + dedans.sortie + '}';
      j = dedans.fin + 1;
    } else {
      fixe += c;
      sortie += c;
      j++;
    }
  }
  return { sortie: fixe.includes('<') ? blanchir(src.slice(debut, j)) : sortie, fin: j };
}

/**
 * Débute-t-on une expression régulière ici ? (d'après le dernier caractère significatif émis)
 * Pas après « } » : c'est presque toujours la fin d'une expression d'attribut JSX (<Icone size={14} />),
 * et une barre qui la suit est le « /> » de la balise, pas une expression régulière.
 */
function debutDeRegex(dernier, sortie) {
  if (dernier === '' || '(,=:[!&|?{;+-*%~^'.includes(dernier)) return true;
  return /(?:^|[^\w$])(?:return|typeof|case)\s*$/.test(sortie.slice(-12));
}

/** Balaie le code depuis `debut` ; dans un ${…} de gabarit, s'arrête à l'accolade fermante correspondante. */
function balayer(src, debut, dansGabarit = false) {
  let sortie = '';
  let dernier = '';
  let accolades = 0;
  let i = debut;
  while (i < src.length) {
    const c = src[i];
    const suivant = src[i + 1];
    if (c === '/' && suivant === '/') {
      const debutCommentaire = i;
      while (i < src.length && src[i] !== '\n') i++;
      sortie += blanchir(src.slice(debutCommentaire, i));
    } else if (c === '/' && suivant === '*') {
      const fin = src.indexOf('*/', i + 2);
      const finCommentaire = fin === -1 ? src.length : fin + 2;
      sortie += blanchir(src.slice(i, finCommentaire));
      i = finCommentaire;
    } else if ((c === '"' || c === "'") && !(i > 0 && LETTRE.test(src[i - 1]))) {
      const fin = finDeChaine(src, i);
      if (fin === -1) {
        sortie += c; // guillemet de texte, pas une chaîne
        i++;
      } else {
        const chaine = src.slice(i, fin + 1);
        sortie += chaine.includes('<') ? blanchir(chaine) : chaine;
        i = fin + 1;
        dernier = c;
      }
    } else if (c === '`') {
      const g = gabarit(src, i);
      sortie += g.sortie;
      i = g.fin;
      dernier = '`';
    } else if (c === '/' && debutDeRegex(dernier, sortie) && finDeRegex(src, i) !== -1) {
      const fin = finDeRegex(src, i);
      sortie += src.slice(i, fin + 1);
      i = fin + 1;
      dernier = ')';
    } else {
      if (dansGabarit && c === '{') accolades++;
      else if (dansGabarit && c === '}') {
        if (accolades === 0) return { sortie, fin: i };
        accolades--;
      }
      sortie += c;
      if (!/\s/.test(c)) dernier = c;
      i++;
    }
  }
  return { sortie, fin: src.length };
}

/** Le code d'un fichier sans ses commentaires ni son HTML en chaîne. */
export function neutraliser(source) {
  return balayer(source, 0).sortie;
}

/** Occurrences des quatre motifs de l'ancien code dans `source` (commentaires et HTML en chaîne exclus). */
export function compterAncienCode(source) {
  return compterMotifs(neutraliser(source));
}

/** Les quatre motifs dans un code déjà neutralisé. */
export function compterMotifs(code) {
  return Object.fromEntries(MOTIFS.map((m) => [m, (code.match(RE[m]) || []).length]));
}

/* ------------------------------------------------------------------------------------------------
 * Fichiers atteignables depuis src/main.jsx
 * ---------------------------------------------------------------------------------------------- */

const SUFFIXES = ['', '.jsx', '.js', '/index.jsx', '/index.js'];
/** Du code source de l'application : sous src/, ni feuille de style, ni JSON, ni code d'un autre dossier. */
const estCode = (fichier) => fichier.startsWith('src/') && /\.(?:jsx?|tsx?)$/.test(fichier);

/** Spécificateurs relatifs importés par un code déjà neutralisé. */
function specificateurs(code) {
  const trouves = [];
  const modeles = [
    /^[ \t]*import\s*['"]([^'"]+)['"]/gm, // import './effet'
    /^[ \t]*(?:import|export)\s+[^;'"`]*?\sfrom\s*['"]([^'"]+)['"]/gm, // import x from '…' ; export … from '…'
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, // import('…'), lazy(() => import('…'))
  ];
  for (const re of modeles) for (const m of code.matchAll(re)) trouves.push(m[1]);
  return trouves.filter((s) => s.startsWith('.'));
}

function resoudre(racine, depuis, specificateur) {
  const base = path.posix.join(path.posix.dirname(depuis), specificateur);
  if (base.startsWith('..')) return null;
  for (const suffixe of SUFFIXES) {
    const candidat = base + suffixe;
    try {
      if (fs.statSync(path.join(racine, candidat)).isFile()) return candidat;
    } catch {
      // ce suffixe ne donne pas de fichier : on essaie le suivant
    }
  }
  return null;
}

/** Tous les fichiers de code de src/ atteignables depuis src/main.jsx, exceptions comprises. */
export function fichiersAtteignables(racine) {
  const vus = new Set();
  const pile = [ENTREE];
  while (pile.length) {
    const fichier = pile.pop();
    if (vus.has(fichier) || !estCode(fichier)) continue; // feuille de style, JSON, fonctions Edge… : rien à suivre
    vus.add(fichier);
    const code = neutraliser(fs.readFileSync(path.join(racine, fichier), 'utf8'));
    for (const spec of specificateurs(code)) {
      const cible = resoudre(racine, fichier, spec);
      if (cible && !vus.has(cible)) pile.push(cible);
    }
  }
  return [...vus].sort();
}

function estException(fichier) {
  return EXCEPTIONS.fichiers.includes(fichier) || EXCEPTIONS.dossiers.some((d) => fichier.startsWith(d));
}

/** Fichiers de code atteignables depuis src/main.jsx, hors exceptions : ceux que le plan convertit. */
export function fichiersConcernes(racine) {
  return fichiersAtteignables(racine).filter((f) => !estException(f));
}

/** Totaux par motif et détail par fichier (fichiers à zéro omis). */
export function mesurer(racine) {
  const totaux = Object.fromEntries(MOTIFS.map((m) => [m, 0]));
  const parFichier = {};
  for (const fichier of fichiersConcernes(racine)) {
    const n = compterAncienCode(fs.readFileSync(path.join(racine, fichier), 'utf8'));
    const somme = MOTIFS.reduce((s, m) => s + n[m], 0);
    for (const m of MOTIFS) totaux[m] += n[m];
    if (somme > 0) parFichier[fichier] = { ...n, total: somme };
  }
  return { totaux, parFichier };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const { totaux, parFichier } = mesurer(racine);
  const sortie = [`${fichiersConcernes(racine).length} fichiers concernés`, JSON.stringify(totaux)];
  if (process.argv.includes('--fichiers')) {
    const lignes = Object.entries(parFichier).sort((a, b) => b[1].total - a[1].total);
    for (const [f, n] of lignes) sortie.push(`${String(n.total).padStart(5)} ${f} ${MOTIFS.map((m) => `${m}=${n[m]}`).join(' ')}`);
  }
  process.stdout.write(sortie.join('\n') + '\n');
}
