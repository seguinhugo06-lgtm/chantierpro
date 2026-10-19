import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Test d'honnêteté du site public (refonte d'octobre 2026, règles : `.claude/rules/marketing.md`).
 *
 * Aucune promesse invérifiable ne doit réapparaître dans le texte du site : avis, statistiques d'usage,
 * « conforme », « certifié », mentions de l'IA ou de la dictée, hébergement « en France », prix en dur…
 * Chaque correspondance est rapportée avec le fichier et la ligne.
 *
 * PÉRIMÈTRE PROGRESSIF. Pendant la refonte, seuls les fichiers de `FICHIERS_CONTROLES` sont contrôlés
 * (les autres, pas encore refaits, contiennent encore des textes à retirer et bloqueraient `npm run verifier`).
 * Chaque tâche de la refonte y ajoute les fichiers qu'elle refait ; la dernière le remplace par '*'
 * (tous les fichiers du site) et ajoute 'index.html'.
 *
 * Syntaxe des entrées, relatives à `src/components/landing/` :
 *   'HeroSection.jsx'              un fichier
 *   'site/*'                       tous les fichiers d'un dossier (récursif)
 *   '*'                            tous les fichiers du site
 *   '../../../index.html'          le `index.html` de la racine (JSON-LD, balises) : pas de contrôle des prix
 */
const FICHIERS_CONTROLES = [
  'site/*',
];

const DOSSIER_SITE = fileURLToPath(new URL('..', import.meta.url));
const RACINE = fileURLToPath(new URL('../../../../', import.meta.url));

// Les espaces des expressions sont `\s+` : une phrase coupée en deux lignes dans le JSX est détectée.
// `\bIA\b` est volontairement sensible à la casse : insensible, il rapporterait des « ia » dans des mots
// ordinaires (« via », « industrialisation »…) ; l'abréviation du site s'écrit toujours « IA ».
const INTERDITS = [
  { nom: 'IA', motif: /\bIA\b/ },
  { nom: 'intelligence artificielle', motif: /intelligence\s+artificielle/i },
  { nom: 'dictée', motif: /\bdict[ée]e/i },
  { nom: 'conforme', motif: /conforme/i },
  { nom: 'certifié', motif: /certifi/i },
  { nom: 'témoignage', motif: /t[ée]moignage/i },
  { nom: 'toutes les mentions', motif: /toutes\s+les\s+mentions/i },
  { nom: 'archivage', motif: /archivage/i },
  { nom: 'SHA-256', motif: /SHA-256/i },
  { nom: 'EN 16931', motif: /EN\s+16931/i },
  { nom: 'RGPD', motif: /RGPD/i },
  { nom: 'Factur-X', motif: /Factur-X/i },
  { nom: 'hébergées en France', motif: /h[ée]berg[ée]es\s+en\s+France/i },
  { nom: 'portail client', motif: /portail\s+client/i },
  { nom: 'paiement en ligne', motif: /paiement\s+en\s+ligne/i },
  { nom: 'essai gratuit de', motif: /essai\s+gratuit\s+de/i },
  { nom: 'statistique « n % des artisans »', motif: /\b\d+\s?%\s+des\s+artisans/i },
  { nom: 'avis ou note de clients', motif: /\b(?:avis|note)\s+(?:clients|4[,.]\d)/i },
];
const PRIX_EN_DUR = { nom: 'prix en dur (ils viennent de PLANS)', motif: /\b(?:9|19)[.,]90/ };

/** Les chaînes JS du site écrivent le français en échappements (`dictée`) : on les décode avant de chercher. */
function decoder(source) {
  return source.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function fichiersDuSite(dossier) {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : fichiersDuSite(p);
    return /\.jsx?$/.test(e.name) ? [p] : [];
  });
}

/** Tous les fichiers candidats, chemins relatifs à `src/components/landing/` (séparateur « / »). */
function candidats() {
  const liste = fichiersDuSite(DOSSIER_SITE).map((p) => path.relative(DOSSIER_SITE, p).split(path.sep).join('/'));
  const indexHtml = path.join(RACINE, 'index.html');
  if (fs.existsSync(indexHtml)) liste.push(path.relative(DOSSIER_SITE, indexHtml).split(path.sep).join('/'));
  return liste;
}

function entreeCouvre(entree, relatif) {
  if (entree === '*') return !relatif.startsWith('..');
  if (entree.endsWith('/*')) return relatif.startsWith(entree.slice(0, -1));
  return relatif === entree;
}

function fichiersControles() {
  const tous = candidats();
  return tous.filter((relatif) => FICHIERS_CONTROLES.some((entree) => entreeCouvre(entree, relatif)));
}

/** « fichier:ligne — nom : extrait » pour chaque correspondance. */
function chercher(source, regles, relatif) {
  const texte = decoder(source);
  const trouves = [];
  for (const { nom, motif } of regles) {
    const global = new RegExp(motif.source, motif.flags.includes('g') ? motif.flags : motif.flags + 'g');
    for (const m of texte.matchAll(global)) {
      const ligne = texte.slice(0, m.index).split('\n').length;
      trouves.push({ ligne, message: `${relatif}:${ligne} — ${nom} : « ${m[0].replace(/\s+/g, ' ')} »` });
    }
  }
  return trouves.sort((a, b) => a.ligne - b.ligne).map((t) => t.message);
}

function lire(relatif) {
  return fs.readFileSync(path.resolve(DOSSIER_SITE, relatif), 'utf8');
}

describe('honnêteté du site public', () => {
  it('chaque entrée de FICHIERS_CONTROLES désigne au moins un fichier (une faute de frappe ne doit pas rendre le test vide)', () => {
    const tous = candidats();
    const orphelines = FICHIERS_CONTROLES.filter((entree) => !tous.some((relatif) => entreeCouvre(entree, relatif)));
    expect(orphelines, `entrées sans fichier : ${orphelines.join(', ')}`).toEqual([]);
  });

  it('aucune promesse invérifiable dans les fichiers contrôlés', () => {
    const trouves = fichiersControles().flatMap((relatif) => chercher(lire(relatif), INTERDITS, relatif));
    expect(trouves, `Textes interdits (voir .claude/rules/marketing.md) :\n${trouves.join('\n')}`).toEqual([]);
  });

  it('aucun prix en dur dans les fichiers contrôlés du site (ils viennent de PLANS)', () => {
    const trouves = fichiersControles()
      .filter((relatif) => !relatif.startsWith('..'))
      .flatMap((relatif) => chercher(lire(relatif), [PRIX_EN_DUR], relatif));
    expect(trouves, `Prix écrits en dur (utiliser PLANS) :\n${trouves.join('\n')}`).toEqual([]);
  });
});

describe('les motifs interdits reconnaissent ce qu\'ils doivent et laissent passer le français ordinaire', () => {
  const rapporte = (texte) => chercher(texte, INTERDITS, 'exemple.jsx').length > 0;

  it.each([
    "Devis par IA",
    "l'intelligence artificielle",
    'Une dictée vocale',
    'dict\\u00e9e en un geste',
    'Devis conforme',
    'Artisan certifié',
    'Un témoignage',
    'toutes les\n   mentions obligatoires',
    'archivage 10 ans',
    'scellé SHA-256',
    'norme EN 16931',
    'conformes RGPD',
    'fichier Factur-X',
    'données hébergées en France',
    'Le portail client',
    'le paiement en ligne',
    'essai gratuit de 14 jours',
    '83 % des artisans',
    'avis clients',
    'note 4,8',
  ])('rapporte : %s', (texte) => {
    expect(rapporte(texte)).toBe(true);
  });

  it.each([
    'Le préavis est de huit jours',
    "Joignez l'avis d'imposition",
    'Envoyé via votre messagerie',
    'Industrialisation du chantier',
    "Prenez note de l'adresse",
    'Un contrat conformément à la loi',
    'Dictionnaire des métiers',
    'Plus de 1 000 prestations chiffrées',
    'Signature en ligne des devis',
  ])('laisse passer : %s', (texte) => {
    expect(rapporte(texte)).toBe(false);
  });

  it('retrouve la ligne de la correspondance', () => {
    expect(chercher('un\ndeux\nune dictée', INTERDITS, 'x.jsx')[0]).toMatch(/^x\.jsx:3 — dictée/);
  });

  it('détecte un prix en dur et laisse passer un autre nombre', () => {
    expect(chercher('à partir de 9,90 € HT', [PRIX_EN_DUR], 'x.jsx')).toHaveLength(1);
    expect(chercher('soit 19.90 euros', [PRIX_EN_DUR], 'x.jsx')).toHaveLength(1);
    expect(chercher('1 000 articles, 29,90 impossible', [PRIX_EN_DUR], 'x.jsx')).toHaveLength(0);
  });
});
