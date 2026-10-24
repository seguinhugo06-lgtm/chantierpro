import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRADE_LIBRARY } from '../../../lib/templates/trade-library.js';
import { lotsMontres, metiersDeLaBibliotheque } from '../metiers.js';
import { lotDemonstration } from '../devisVivantEtapes.js';
import { buildDevisHtml } from '../../../lib/devisHtmlBuilder.js';
import { htmlDuDocument, ligneDuMetre, texteDuDocument } from '../exemples/exemples.js';

/**
 * Test d'honnêteté du site public (refonte d'octobre 2026, règles : `.claude/rules/marketing.md`).
 *
 * Aucune promesse invérifiable ne doit réapparaître dans le texte du site : avis, statistiques d'usage,
 * « conforme », « certifié », mentions de l'IA ou de la dictée, hébergement « en France », prix en dur…
 * Chaque correspondance est rapportée avec le fichier et la ligne.
 *
 * PÉRIMÈTRE : tous les fichiers du site (`src/components/landing/`, récursif, hors `__tests__`), les pages de
 * fonctionnalités et `featuresContent.js` compris, et le `index.html` de la racine (balises, JSON-LD). Pendant la
 * refonte, le périmètre s'est étendu tâche après tâche ; depuis la tâche 7, plus aucun fichier du site n'y échappe.
 *
 * Syntaxe des entrées, relatives à `src/components/landing/` :
 *   'HeroSection.jsx'              un fichier
 *   'site/*'                       tous les fichiers d'un dossier (récursif)
 *   '*'                            tous les fichiers du site
 *   '../../../index.html'          le `index.html` de la racine (JSON-LD, balises) : pas de contrôle des prix
 */
const FICHIERS_CONTROLES = ['*', '../../../index.html'];

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
  // Le chiffrement de Supabase n'est prouvé par rien dans `src/` (tâche 7, tour de correction 1)
  { nom: 'AES-256', motif: /AES[\s-]?256/i },
  { nom: 'EN 16931', motif: /EN\s+16931/i },
  { nom: 'RGPD', motif: /RGPD/i },
  { nom: 'Factur-X', motif: /Factur-X/i },
  { nom: 'hébergées en France', motif: /h[ée]berg[ée]es\s+en\s+France/i },
  { nom: 'portail client', motif: /portail\s+client/i },
  { nom: 'paiement en ligne', motif: /paiement\s+en\s+ligne/i },
  { nom: 'essai gratuit de', motif: /essai\s+gratuit\s+de/i },
  { nom: 'statistique « n % des artisans »', motif: /\b\d+\s?%\s+des\s+artisans/i },
  { nom: 'avis ou note de clients', motif: /\b(?:avis|note)\s+(?:clients|4[,.]\d)/i },
  { nom: 'dictez', motif: /\bdictez\b/i },
  { nom: 'commande vocale', motif: /commandes?\s+vocales?/i },
  // « 4,8/5 », « 4.9 / 5 », « 5/5 » : une note sur 5 (un « 12/5 », un « 1/50 » ou la classe Tailwind « w-1/5 » ne
  // sont pas des notes)
  { nom: 'note sur 5', motif: /(?<![\w,.-])\d(?:[,.]\d+)?\s*\/\s*5(?!\d)/ },
  { nom: '« N artisans nous font confiance »', motif: /(?:\bartisans|\bclients|\butilisateurs)\s+(?:nous\s+)?font\s+confiance|\bnous\s+font\s+confiance/i },
];
const PRIX_EN_DUR = { nom: 'prix en dur (ils viennent de PLANS)', motif: /\b(?:9|19)[.,]90/ };

/**
 * Règles de code des fichiers du site (pas de `index.html`) : la charte et la typographie, pas le sens des textes.
 *   - pas de texte orange : l'orange du logo est décoratif, illisible sur fond clair (2,8:1) ; `bg-marque-orange`
 *     (point, lueur) reste permis ;
 *   - pas de couleur de la palette recopiée en dur (#F0FAFF, #DCEFFB) : les jetons `marque` de Tailwind ;
 *   - une fonction présentée comme réservée à un plan, entre parenthèses (« (plan Équipe) ») : aucun plan ne
 *     verrouille une fonction aujourd'hui, seulement des limites (décision D-29, `PLANS`).
 * Les entités HTML (`&nbsp;`, `&eacute;`…) sont contrôlées à part, dans les seuls fichiers JSX (`ENTITES_JSX`).
 */
const INTERDITS_CODE = [
  { nom: 'texte orange (text-marque-orange)', motif: /\btext-marque-orange\b/ },
  { nom: 'texte orange (ancienne palette text-orange-…)', motif: /\btext-orange-\d/ },
  { nom: 'couleur de la palette en dur (#F0FAFF, #DCEFFB : jetons marque)', motif: /#(?:F0FAFF|DCEFFB)\b/i },
  { nom: 'fonction réservée à un plan', motif: /\(plan\s+(?:Gratuit|Artisan|[ÉE]quipe)\)/i },
];
/** Le texte JSX s'écrit avec de vrais caractères (espace insécable comprise), pas en entités HTML. */
const ENTITES_JSX = { nom: 'entité HTML dans le JSX (écrire le vrai caractère)', motif: /&(?:[a-zA-Z]+|#\d+|#x[\da-fA-F]+);/ };

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

  it('le périmètre couvre tout le site : pages de fonctionnalités, featuresContent.js et index.html compris', () => {
    const controles = fichiersControles();
    for (const attendu of ['featuresContent.js', 'FeaturesDetailPage.jsx', 'FeatureDeepDivePage.jsx', 'ResourcesPage.jsx', 'FAQSection.jsx', 'FinalCta.jsx', 'FooterSection.jsx', '../../../index.html']) {
      expect(controles, attendu).toContain(attendu);
    }
    expect(controles.length).toBe(candidats().length);
  });

  it('ni texte orange, ni couleur en dur, ni fonction réservée à un plan dans les fichiers du site', () => {
    const trouves = fichiersControles()
      .filter((relatif) => !relatif.startsWith('..'))
      .flatMap((relatif) => chercher(lire(relatif), INTERDITS_CODE, relatif));
    expect(trouves, `Règles de la charte (voir global-constraints) :\n${trouves.join('\n')}`).toEqual([]);
  });

  it('aucune entité HTML (&nbsp;, &eacute;…) dans le JSX du site : les vrais caractères', () => {
    const trouves = fichiersControles()
      .filter((relatif) => relatif.endsWith('.jsx'))
      .flatMap((relatif) => chercher(lire(relatif), [ENTITES_JSX], relatif));
    expect(trouves, `Entités HTML dans le JSX :\n${trouves.join('\n')}`).toEqual([]);
  });
});

/**
 * Les textes de la bibliothèque des métiers que la page affiche : ils ne sont écrits dans aucun fichier du site,
 * le contrôle des fichiers ne les voit donc pas. L'explorateur des métiers montre les 17 noms de métiers en pastilles
 * (`metiersDeLaBibliotheque`) et, pour chacun, le nom, le résumé et les premières lignes de ses premiers lots
 * (`lotsMontres`) ; le devis vivant montre le nom et
 * toutes les lignes de son lot (`lotDemonstration`) ; « Les fonctionnalités en action » montrent la ligne de carrelage
 * du métré (`ligneDuMetre`) et le lot du document et de la signature (`lotDemonstration`, rendu par le générateur de
 * devis). `ou` situe le texte : métier ou exemple, lot, champ.
 */
function textesDeLaBibliothequeAffiches(bibliotheque) {
  const textes = [];
  for (const { nom } of metiersDeLaBibliotheque(bibliotheque)) textes.push({ ou: `${nom} — pastille du métier`, texte: nom });
  for (const metier of Object.values(bibliotheque)) {
    for (const lot of lotsMontres(bibliotheque, metier.id)) {
      const lieu = `${metier.nom} — lot « ${lot.nom} »`;
      textes.push({ ou: `${lieu} — nom`, texte: lot.nom });
      if (lot.resume) textes.push({ ou: `${lieu} — résumé`, texte: lot.resume });
      lot.lignes.forEach((ligne, i) => textes.push({ ou: `${lieu} — ligne ${i + 1}`, texte: ligne.designation }));
    }
  }
  const demonstration = lotDemonstration(bibliotheque);
  for (const exemple of ['Devis vivant', 'Fonctionnalités, document et signature']) {
    const lieu = `${exemple} — lot « ${demonstration.nom} »`;
    textes.push({ ou: `${lieu} — nom`, texte: demonstration.nom });
    demonstration.lignes.forEach((ligne, i) => textes.push({ ou: `${lieu} — ligne ${i + 1}`, texte: ligne.designation }));
  }
  textes.push({ ou: 'Fonctionnalités, métré — ligne de carrelage', texte: ligneDuMetre(bibliotheque).designation });
  return textes;
}

/**
 * Exceptions : noms de documents ou de prestations du métier qui contiennent un mot interdit sans rien affirmer de
 * Mallettico ni de l'ouvrage (ex. « certificat de conformité », un document que l'artisan fournit). Chaque entrée
 * donne le passage EXACT toléré et la raison ; le passage est retiré du texte avant le contrôle, le reste du texte
 * est contrôlé. Liste à relire par le juriste (T8). Une affirmation (« conforme à… », « certifié… ») ne va pas ici :
 * elle se reformule dans la bibliothèque (« selon la norme… », la classe du produit seule).
 */
const EXCEPTIONS_BIBLIOTHEQUE = [];

/** « où — motif : « extrait » » pour chaque mot interdit trouvé dans les textes affichés, exceptions retirées. */
function controlerTextes(textes, exceptions = EXCEPTIONS_BIBLIOTHEQUE) {
  const trouves = [];
  for (const { ou, texte } of textes) {
    const reste = exceptions.reduce((t, e) => t.split(e.texte).join(' '), texte);
    for (const { nom, motif } of INTERDITS) {
      const m = motif.exec(reste);
      if (m) trouves.push(`${ou} — ${nom} : « ${texte} »`);
    }
  }
  return trouves;
}

describe('honnêteté des textes de la bibliothèque affichés par le site', () => {
  const textes = textesDeLaBibliothequeAffiches(TRADE_LIBRARY);

  it('relève les textes de l\'explorateur (17 métiers), du devis vivant et des fonctionnalités en action', () => {
    const lieux = new Set(textes.map((t) => t.ou.split(' — ')[0]));
    expect(lieux.size).toBe(20); // 17 métiers + le devis vivant + le document et la signature + le métré
    expect(textes.some((t) => t.ou.startsWith('Serrurerie') && t.ou.endsWith('résumé'))).toBe(true);
    expect(textes.filter((t) => t.ou.endsWith('pastille du métier'))).toHaveLength(17);
    expect(textes.some((t) => t.ou.startsWith('Fonctionnalités, métré'))).toBe(true);
  });

  it('aucune promesse invérifiable dans ce que l\'explorateur, le devis vivant et les exemples affichent', () => {
    const trouves = controlerTextes(textes);
    expect(trouves, `Textes interdits affichés depuis src/lib/templates/trade-library.js :\n${trouves.join('\n')}`).toEqual([]);
  });

  it('chaque exception sert encore (une exception devenue inutile est retirée de la liste)', () => {
    const inutiles = EXCEPTIONS_BIBLIOTHEQUE.filter((e) => !textes.some((t) => t.texte.includes(e.texte)));
    expect(inutiles.map((e) => e.texte)).toEqual([]);
  });

  it('le contrôle nomme le métier, le lot et le texte, et une exception ne couvre que son passage exact', () => {
    const exemple = [{ ou: 'Serrurerie — lot « Garde-corps » — résumé', texte: 'Pose de garde-corps conforme à la norme' }];
    expect(controlerTextes(exemple, [])).toEqual(['Serrurerie — lot « Garde-corps » — résumé — conforme : « Pose de garde-corps conforme à la norme »']);
    const exception = [{ texte: 'certificat de conformité', raison: 'document du métier' }];
    expect(controlerTextes([{ ou: 'x', texte: 'Remise du certificat de conformité' }], exception)).toEqual([]);
    expect(controlerTextes([{ ou: 'x', texte: 'Remise du certificat de conformité, travaux conformes' }], exception)).toHaveLength(1);
  });
});

/**
 * Le document montré par l'exemple « Le document que reçoit votre client » (« Les fonctionnalités en action ») : le
 * HTML du vrai générateur de devis (src/lib/devisHtmlBuilder.js, que le site ne modifie pas), produit par la fonction
 * même de la page (`htmlDuDocument`). Son texte passe sous les mots interdits ; son HTML, en plus, sous les liens de
 * paiement en ligne (`/pay/`, fonction éteinte : `FONCTIONS.paiementEnLigne`).
 *
 * Exceptions : passages EXACTS du document de l'artisan, imprimés par le générateur, qui contiennent un mot interdit
 * sans rien promettre de Mallettico. Le passage est retiré du texte avant le contrôle, le reste est contrôlé. Liste à
 * relire par le juriste (T8), qui tranchera aussi le texte du générateur.
 */
const EXCEPTIONS_DOCUMENT = [
  {
    texte: "Conditions de paiement et pénalités de retard conformes à l'article L441-10",
    raison: "renvoi légal au pied du devis de l'artisan (art. L441-10 C. com.) : il porte sur ses conditions, pas sur Mallettico",
  },
  {
    texte: 'CERTIFICATION DU CLIENT',
    raison: "titre de l'attestation de TVA à taux réduit : depuis la loi n° 2025-127 (art. 41), le client certifie sur le devis ou la facture (src/lib/mentionTvaReduite.js, modèles du BOFiP)",
  },
  {
    texte: 'M. Martin certifie',
    raison: "« Je soussigné(e) M. Martin certifie… » : le modèle de devis du BOFiP (BOI-LETTRE-000280, § 10), signé par le client fictif",
  },
  {
    texte: 'vaut certification',
    raison: "« La signature du présent devis vaut certification. » : même mécanisme légal de la TVA à taux réduit",
  },
];

/** Mots interdits du document seulement : un lien vers la page de paiement en ligne (fonction éteinte). */
const INTERDITS_DOCUMENT_HTML = [{ nom: 'lien de paiement en ligne', motif: /\/pay\// }];

/** « document — motif : « …extrait… » » pour chaque mot interdit trouvé (texte, exceptions retirées ; puis HTML). */
function controlerDocument(html, exceptions = EXCEPTIONS_DOCUMENT) {
  const extrait = (source, m) => source.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).trim();
  const texte = exceptions.reduce((t, e) => t.split(e.texte).join(' '), texteDuDocument(html));
  const trouves = [];
  for (const { nom, motif } of INTERDITS) {
    const m = motif.exec(texte);
    if (m) trouves.push(`document — ${nom} : « …${extrait(texte, m)}… »`);
  }
  for (const { nom, motif } of INTERDITS_DOCUMENT_HTML) {
    const m = motif.exec(html);
    if (m) trouves.push(`document (HTML) — ${nom} : « …${extrait(html, m)}… »`);
  }
  return trouves;
}

describe('honnêteté du document affiché par « Les fonctionnalités en action »', () => {
  const html = htmlDuDocument(buildDevisHtml, TRADE_LIBRARY);

  it('aucune promesse invérifiable ni lien de paiement en ligne dans le document (exceptions retirées)', () => {
    const trouves = controlerDocument(html);
    expect(trouves, `Textes interdits dans le document produit par src/lib/devisHtmlBuilder.js :\n${trouves.join('\n')}`).toEqual([]);
  });

  it('chaque exception du document sert encore (une exception devenue inutile est retirée de la liste)', () => {
    const texte = texteDuDocument(html);
    const inutiles = EXCEPTIONS_DOCUMENT.filter((e) => !texte.includes(e.texte));
    expect(inutiles.map((e) => e.texte)).toEqual([]);
  });

  it('cas témoin : un nouveau mot interdit ou un lien /pay/ est rapporté ; une exception ne couvre que son passage exact', () => {
    expect(controlerDocument('<p>Réglez par paiement en ligne</p>')).toEqual(['document — paiement en ligne : « …Réglez par paiement en ligne… »']);
    expect(controlerDocument('<p>Payer : <a href="https://mallettico.fr/pay/abc">ici</a></p>')).toHaveLength(1);
    expect(controlerDocument("<p>Conditions de paiement et pénalités de retard conformes à l'article L441-10</p>")).toEqual([]);
    expect(controlerDocument("<p>Conditions de paiement et pénalités de retard conformes à l'article L441-10 ; ouvrage conforme</p>")).toHaveLength(1);
    expect(controlerDocument('<p>Le client certifie</p>')).toHaveLength(1);
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
    'chiffrée au repos (AES-256)',
    'chiffrement AES 256 bits',
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
    'Dictez votre devis',
    'par commande vocale',
    'Noté 4,8/5',
    'note de 4.9 / 5',
    '5/5 sur les stores',
    '500 artisans nous font confiance',
    'Ils nous font confiance',
    // Typographie fine du site (site/typographie.js) : les espaces fines insécables, écrites en échappement dans les
    // chaînes JS (décodé par `decoder`) ou en vrai caractère dans le texte JSX, ne cachent aucun mot interdit
    '«\u202fconforme\u202f»',
    "«\\u202fconforme\\u202f»",
    '83\u202f% des artisans',
    '83\\u202f% des artisans',
    'données hébergées\u202fen\u202fFrance',
    'Noté 4,8\u202f/\u202f5',
    'toutes les\u202fmentions obligatoires',
    'Ils nous\u202ffont confiance',
    // Apostrophe typographique du site (site/typographie.js) : elle ne cache aucun mot interdit non plus
    'L\u2019IA rédige vos devis',
    'Durée d\u2019archivage : 10 ans',
    'l\u2019intelligence artificielle',
    'Lisez nos avis d\u2019artisans : avis clients 4,8',
    'Factures conformes à l\u2019EN 16931',
  ])('rapporte : %s', (texte) => {
    expect(rapporte(texte)).toBe(true);
  });

  it.each([
    ['<p className="text-marque-orange">', true],
    ['<p className="text-orange-500">', true],
    ["style={{ background: '#F0FAFF' }}", true],
    ["color: '#dceffb'", true],
    ["'Export FEC (plan Équipe)'", true],
    ['<span className="bg-marque-orange" />', false],
    ['<p className="text-marque-nuit">', false],
    ['bg-marque-glacier-1', false],
    ['le plan Équipe va jusqu\'à 10 collaborateurs', false],
  ])('règles de code — %s : %s', (texte, attendu) => {
    expect(chercher(texte, INTERDITS_CODE, 'x.jsx').length > 0).toBe(attendu);
  });

  it.each([
    ['<p>Questions fr&eacute;quentes</p>', true],
    ['<>&nbsp;</>', true],
    ['&#160;', true],
    ["{'\\u00a0'}", false],
    ['a && b', false],
    ['R&D', false],
  ])('entités JSX — %s : %s', (texte, attendu) => {
    expect(chercher(texte, [ENTITES_JSX], 'x.jsx').length > 0).toBe(attendu);
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
    'Le 12/5, livraison',
    'Étape 1/50',
    '<span className="h-6 w-1/5" />',
    'Les artisans font le choix',
    'La confiance se gagne',
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
