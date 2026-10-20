import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PLANS } from '../../../stores/subscriptionStore';
import { FONCTIONS } from '../../../lib/fonctions';
import { CAPTURES, CARTES_FONCTIONNALITES, FEATURES_CONTENT, FEATURE_SLUGS, VUES_RESSOURCES } from '../featuresContent';
import { questionsFaq } from '../faq';

/**
 * Les pages de fonctionnalités (/fonctionnalites, /fonctionnalites/:slug, /ressources) lisent leur contenu dans
 * `featuresContent.js`. Les captures sont celles de `scripts/site-captures.cjs` (identité fictive « Élec Exemple »,
 * D-27), jamais les anciennes de `public/screenshots/` (entreprise de démonstration réelle, adresses gmail, ancienne
 * palette, et une capture qui montrait un compte réel).
 */
const PUBLIC = fileURLToPath(new URL('../../../../public/', import.meta.url));

/** Largeur et hauteur d'une image WebP (en-têtes VP8, VP8L et VP8X). */
function dimensionsWebp(chemin) {
  const b = fs.readFileSync(chemin);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') throw new Error(`${chemin} n'est pas un WebP`);
  const bloc = b.toString('ascii', 12, 16);
  if (bloc === 'VP8 ') return { largeur: b.readUInt16LE(26) & 0x3fff, hauteur: b.readUInt16LE(28) & 0x3fff };
  if (bloc === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { largeur: (bits & 0x3fff) + 1, hauteur: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (bloc === 'VP8X') return { largeur: b.readUIntLE(24, 3) + 1, hauteur: b.readUIntLE(27, 3) + 1 };
  throw new Error(`${chemin} : en-tête WebP inconnu (${bloc})`);
}

const capturesDesPages = () => [
  ...Object.values(FEATURES_CONTENT).map((f) => ({ ou: `/fonctionnalites/${f.slug}`, capture: f.capture })),
  ...CARTES_FONCTIONNALITES.map((c) => ({ ou: `/fonctionnalites — ${c.titre}`, capture: c.capture })),
  ...VUES_RESSOURCES.map((v) => ({ ou: `/ressources — ${v.libelle}`, capture: v.capture })),
];

/**
 * Chaque capture, sa vue téléphone (`mobile`) et sa vignette recadrée (`vignette`, avec le texte de remplacement de la
 * capture) quand elle en a : toutes s'affichent selon l'écran.
 */
const toutesLesCaptures = () => capturesDesPages().flatMap(({ ou, capture }) => [
  { ou, capture },
  ...(capture?.mobile ? [{ ou: `${ou} (téléphone)`, capture: capture.mobile }] : []),
  ...(capture?.vignette ? [{ ou: `${ou} (vignette)`, capture: { ...capture.vignette, alt: capture.alt } }] : []),
]);

describe('pages de fonctionnalités : captures', () => {
  it('chaque page et chaque carte montre une capture du site (public/site/*.webp), aux dimensions réelles du fichier', () => {
    for (const { ou, capture } of toutesLesCaptures()) {
      expect(capture, ou).toBeTruthy();
      expect(capture.src, ou).toMatch(/^\/site\/[a-z0-9-]+\.webp$/);
      const fichier = `${PUBLIC}${capture.src.slice(1)}`;
      expect(fs.existsSync(fichier), `${ou} : ${capture.src} absent`).toBe(true);
      const { largeur, hauteur } = dimensionsWebp(fichier);
      expect({ largeur: capture.largeur, hauteur: capture.hauteur }, `${ou} : ${capture.src}`).toEqual({ largeur, hauteur });
      expect(capture.alt.length, `${ou} : texte de remplacement`).toBeGreaterThan(20);
    }
  });

  it('au téléphone, chaque capture d\'ordinateur a sa vue téléphone (une capture d\'ordinateur réduite ne se lit plus)', () => {
    const sansVue = capturesDesPages().filter(({ capture }) => !capture.telephone && !capture.mobile).map(({ ou }) => ou);
    expect(sansVue).toEqual([]);
    for (const { ou, capture } of capturesDesPages().filter((c) => c.capture.mobile)) {
      expect(capture.mobile.src, ou).toMatch(/^\/site\/tel-[a-z0-9-]+\.webp$/);
      expect({ largeur: capture.mobile.largeur, hauteur: capture.mobile.hauteur }, ou).toEqual({ largeur: 1170, hauteur: 2532 });
    }
  });

  it('chaque capture d\'ordinateur a sa vignette recadrée de 720 × 450 px à densité 2 (relecture DA-6)', () => {
    const sansVignette = capturesDesPages().filter(({ capture }) => !capture.telephone && !capture.vignette).map(({ ou }) => ou);
    expect(sansVignette).toEqual([]);
    for (const { ou, capture } of capturesDesPages().filter((c) => c.capture.vignette)) {
      expect(capture.vignette.src, ou).toMatch(/^\/site\/vignette-[a-z0-9-]+\.webp$/);
      expect({ largeur: capture.vignette.largeur, hauteur: capture.vignette.hauteur }, ou).toEqual({ largeur: 1440, hauteur: 900 });
    }
  });

  it('plus aucune image de public/screenshots/ (ni la page de signature d\'un compte réel)', () => {
    const source = fs.readFileSync(fileURLToPath(new URL('../featuresContent.js', import.meta.url)), 'utf8');
    expect(source).not.toMatch(/\/screenshots\//);
    expect(Object.keys(CAPTURES).length).toBeGreaterThan(0);
  });
});

describe('pages de fonctionnalités : ce qui est annoncé', () => {
  it('aucune page pour une fonction éteinte (dictée vocale tant que FONCTIONS.ia est faux)', () => {
    if (!FONCTIONS.ia) expect(FEATURE_SLUGS).not.toContain('dictee-vocale');
    expect(FEATURE_SLUGS).toEqual(expect.arrayContaining(['devis-factures', 'signature-electronique', 'relances']));
  });

  it('chaque carte qui mène à une page mène à une page qui existe', () => {
    for (const carte of CARTES_FONCTIONNALITES.filter((c) => c.slug)) expect(FEATURE_SLUGS, carte.titre).toContain(carte.slug);
    for (const page of Object.values(FEATURES_CONTENT)) {
      for (const lie of page.related || []) expect(FEATURE_SLUGS, `${page.slug} → ${lie}`).toContain(lie);
    }
  });

  it('le nombre de collaborateurs vient de PLANS ; aucune fonction n\'est dite réservée à un plan', () => {
    const equipe = JSON.stringify(FEATURES_CONTENT.equipe);
    expect(equipe).toContain(`vous + ${PLANS.equipe.limits.equipe} collaborateurs`);
    expect(equipe).toContain(`vous + ${PLANS.gratuit.limits.equipe} collaborateur`);
    expect(equipe).not.toMatch(/Jusqu'à 10 utilisateurs/);
    const tout = JSON.stringify({ FEATURES_CONTENT, CARTES_FONCTIONNALITES, VUES_RESSOURCES });
    expect(tout).not.toMatch(/Plan\s+[ÉE]quipe/);
    expect(tout).not.toMatch(/\(plan\s/i);
  });

  it('l\'application montre le nom et la date de la signature ; l\'heure, seulement l\'exemplaire du client', () => {
    // DevisPage.jsx (« Accepté par … · date ») et AuditTimeline.jsx n'affichent pas l'heure ; devisHtmlBuilder.js l'imprime
    const tout = JSON.stringify({ FEATURES_CONTENT, CARTES_FONCTIONNALITES, VUES_RESSOURCES });
    expect(tout).not.toMatch(/dans votre application, avec le nom du signataire, la date et l'heure/);
    expect(tout).toContain("Le devis passe en «\u202fSigné\u202f» dans votre application, avec le nom du signataire et la date. L\u2019heure est enregistrée et figure sur l\u2019exemplaire signé du client");
  });

  it('« plus de 1 000 » n\'est jamais dit du catalogue seul (523 articles) : toujours avec la bibliothèque', () => {
    // Toutes les chaînes des pages (feuilles de l'objet), une par une
    const chaines = (v) => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(chaines) : []);
    const textes = [
      ...chaines({ FEATURES_CONTENT, CARTES_FONCTIONNALITES, VUES_RESSOURCES }),
      ...questionsFaq().flatMap((q) => [q.q, q.a]),
      ...Object.values(PLANS).flatMap((p) => p.featureLabels.map((f) => f.name)),
    ].map((t) => t.replace(/[  ]/g, ' '));
    const fautifs = textes.filter((t) => /1 000/.test(t) && !/biblioth[eè]que/i.test(t));
    expect(fautifs).toEqual([]);
  });

  it('le lien de signature vit jusqu\'à la fin de validité du devis, pas « 30 jours » (migration 083)', () => {
    const signature = JSON.stringify(FEATURES_CONTENT['signature-electronique']);
    expect(signature).not.toMatch(/30\s+jours/);
    expect(signature).toMatch(/fin de validité du devis/);
  });
});
