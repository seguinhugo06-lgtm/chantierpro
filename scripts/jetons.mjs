#!/usr/bin/env node
/**
 * Exporte les jetons de l'interface au format W3C Design Tokens (DTCG), importable dans Figma
 * (variables) ou Tokens Studio. Source unique : src/styles/theme.css (couleurs, élévations) et les
 * conventions de tailwind.config.js (typographie, arrondis, espacements) — rien n'est saisi à la main.
 *
 *   npm run jetons          → design/tokens/*.tokens.json
 * Un test (src/lib/__tests__/jetons.test.js) échoue si les fichiers ne correspondent plus au CSS.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { variablesAccent } from '../src/lib/theme.js';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FICHIER_CSS = path.join(RACINE, 'src/styles/theme.css');
export const DOSSIER = path.join(RACINE, 'design/tokens');

const ROLES = {
  fond: 'Fond de page', surface: 'Carte, volet, barre', 'surface-2': 'Creux, survol, puce neutre',
  bord: 'Traits', 'bord-fort': 'Bord des champs', encre: 'Titres, montants', 'encre-2': 'Texte secondaire',
  'encre-3': 'Méta, libellés', accent: "Action et sélection (couleur de l'entreprise, orange par défaut)",
  'sur-accent': "Texte posé sur l'accent (calculé : le plus contrasté du noir et du blanc)",
  'accent-texte': "L'accent écrit en texte sur une surface (≥ 4,5:1)",
};
const TONS = { neutre: 'brouillon ou clos', info: 'chez le client', succes: 'acquis', alerte: 'à surveiller', danger: 'problème' };

/** Variables d'un bloc CSS (le premier dont le sélecteur contient `selecteur`). */
function lireBloc(css, selecteur) {
  const sansCommentaires = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(sansCommentaires))) {
    if (m[1].includes(selecteur)) {
      const vars = {};
      for (const d of m[2].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
      return vars;
    }
  }
  throw new Error(`Bloc ${selecteur} introuvable dans theme.css`);
}

const hex = (triplet) => {
  const p = triplet.split(/\s+/).map(Number);
  if (p.length !== 3 || p.some((v) => Number.isNaN(v))) throw new Error(`Couleur illisible : ${triplet}`);
  return `#${p.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

/** « 0 8px 24px -6px rgb(15 23 42 / 0.18) » → ombre DTCG. */
function ombre(valeur) {
  if (/^0 0 #0000$/.test(valeur)) return { color: '#00000000', offsetX: '0px', offsetY: '0px', blur: '0px', spread: '0px' };
  const m = valeur.match(/^(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?(?:\s+(-?[\d.]+)(?:px)?)?\s+rgb\((\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\)$/);
  if (!m) return null;
  const a = Math.round(Number(m[8]) * 255).toString(16).padStart(2, '0');
  return {
    color: `${hex(`${m[5]} ${m[6]} ${m[7]}`)}${a}`,
    offsetX: `${m[1]}px`, offsetY: `${m[2]}px`, blur: `${m[3]}px`, spread: `${m[4] || 0}px`,
  };
}

function couleurs(vars) {
  const neutres = {};
  for (const nom of ['fond', 'surface', 'surface-2', 'bord', 'bord-fort', 'encre', 'encre-2', 'encre-3']) {
    neutres[nom] = { $type: 'color', $value: hex(vars[nom]), $description: ROLES[nom] };
  }
  const accent = {};
  for (const nom of ['accent', 'sur-accent', 'accent-texte']) {
    if (vars[nom]) accent[nom] = { $type: 'color', $value: hex(vars[nom]), $description: ROLES[nom] };
  }
  const tons = {};
  for (const [ton, sens] of Object.entries(TONS)) {
    tons[ton] = {
      $description: `Statuts « ${sens} »`,
      fond: { $type: 'color', $value: hex(vars[`${ton}-fond`]) },
      texte: { $type: 'color', $value: hex(vars[`${ton}-texte`]) },
      point: { $type: 'color', $value: hex(vars[`${ton}-point`]) },
    };
  }
  const elevations = {};
  for (const [cle, nom] of [['e1', 'pose'], ['e2', 'flottant'], ['e3', 'modal']]) {
    const o = ombre(vars[cle] || '');
    if (o) elevations[nom] = { $type: 'shadow', $value: o };
  }
  return { couleur: { neutre: neutres, accent, ton: tons }, ...(Object.keys(elevations).length ? { elevation: elevations } : {}) };
}

/** Jetons indépendants du thème : typographie, arrondis, espacements, cibles tactiles. */
function base() {
  const taille = (px, usage) => ({ $type: 'dimension', $value: `${px}px`, $description: usage });
  return {
    police: {
      famille: { $type: 'fontFamily', $value: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'] },
      graisse: {
        normale: { $type: 'fontWeight', $value: 400 }, moyenne: { $type: 'fontWeight', $value: 500 },
        semigras: { $type: 'fontWeight', $value: 600 }, gras: { $type: 'fontWeight', $value: 700 },
      },
      taille: {
        legende: taille(12, 'Pastilles, légendes — plancher absolu (text-xs)'),
        petit: taille(14, 'Méta, libellés, boutons (text-sm)'),
        corps: taille(16, 'Corps, titres de carte, tous les champs (text-base)'),
        section: taille(18, 'Titre de section (text-lg)'),
        page: taille(24, 'Titre de page, chiffres des tuiles (text-2xl)'),
        heros: taille(36, 'Montant héros (text-4xl)'),
      },
    },
    arrondi: {
      controle: taille(12, 'Boutons, champs, segments (rounded-xl)'),
      carte: taille(16, 'Cartes, panneaux, modales (rounded-2xl)'),
      pilule: taille(9999, 'Pastilles, puces, avatars (rounded-full)'),
    },
    espace: {
      1: taille(4), 2: taille(8), 3: taille(12), 4: taille(16), 5: taille(20), 6: taille(24),
      carte: taille(16, 'Marge intérieure des cartes au téléphone (p-4), 20 au bureau'),
    },
    cible: {
      minimum: taille(44, 'Hauteur et largeur minimales de toute cible tactile'),
      champ: taille(48, 'Hauteur des champs de saisie'),
    },
  };
}

export function genererJetons(css) {
  // L'accent vient de la couleur de l'entreprise : on exporte celui de l'orange par défaut, calculé
  // par le même code que l'app (src/lib/theme.js) pour chaque mode.
  const accent = (sombre) => Object.fromEntries(Object.entries(variablesAccent('#f97316', sombre)).map(([k, v]) => [k.slice(2), v]));
  const clair = { ...lireBloc(css, ":root, [data-theme='clair']"), ...accent(false) };
  const sombre = { ...clair, ...lireBloc(css, "[data-theme='sombre']"), ...accent(true) };
  const entete = (mode) => ({
    $description: `Mallettico — jetons d'interface${mode ? `, mode ${mode}` : ''}. Généré par scripts/jetons.mjs depuis src/styles/theme.css : ne pas modifier à la main.`,
  });
  return {
    'mallettico.base.tokens.json': { ...entete(''), ...base() },
    'mallettico.clair.tokens.json': { ...entete('clair'), ...couleurs(clair) },
    'mallettico.sombre.tokens.json': { ...entete('sombre'), ...couleurs(sombre) },
  };
}

export const serialiser = (objet) => `${JSON.stringify(objet, null, 2)}\n`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const fichiers = genererJetons(fs.readFileSync(FICHIER_CSS, 'utf8'));
  fs.mkdirSync(DOSSIER, { recursive: true });
  for (const [nom, contenu] of Object.entries(fichiers)) {
    fs.writeFileSync(path.join(DOSSIER, nom), serialiser(contenu));
    console.log(`✓ design/tokens/${nom}`);
  }
}
