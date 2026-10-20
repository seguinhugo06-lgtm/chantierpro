import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import babelParser from '@babel/parser';
import babelTraverse from '@babel/traverse';
import { ESPACE_FINE, fautesDeTypographie, fine } from '../site/typographie';
import { libelleAffiche } from '../comparaisonPlans';
import { PLANS } from '../../../stores/subscriptionStore';

/**
 * Typographie fine du site (passe de finition, octobre 2026) : une espace fine insécable (U+202F) à l'intérieur des
 * « », avant ; : ? ! %, et entre deux groupes de chiffres — une seule règle, partout (`site/typographie.js`).
 *
 * Le test lit le TEXTE des fichiers du site (texte JSX, chaînes, gabarits ; pas les commentaires ni le code) avec
 * @babel/parser, qui vient de node_modules comme pour l'outil de migration des jetons (scripts/migration/
 * transformer.mjs). Ne sont pas lus : les valeurs d'attributs JSX qui ne sont pas du texte (classes, adresses,
 * identifiants…), les clés d'objets, les chemins d'import, la règle elle-même (`site/typographie.js`) et les données
 * fictives passées au générateur de devis (`exemples/donneesFictives.js` : l'entreprise est la même que celle des
 * captures, mot pour mot).
 */
const traverse = babelTraverse.default ?? babelTraverse;
const DOSSIER_SITE = fileURLToPath(new URL('..', import.meta.url));
const NON_LUS = new Set(['site/typographie.js', 'exemples/donneesFictives.js']);
const ATTRIBUTS_CODE = /^(className|style|href|src|srcDoc|srcSet|id|key|type|role|sandbox|loading|decoding|fetchpriority|viewBox|d|points|fill|stroke|strokeWidth|strokeDasharray|rx|ref|htmlFor|name|value|rel|target|tabIndex|inputMode|autoComplete|data-.*|aria-(controls|labelledby|describedby|hidden|live|pressed|expanded|selected|modal|orientation|current|haspopup))$/;

function fichiersDuSite(dossier) {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : fichiersDuSite(p);
    return /\.jsx?$/.test(e.name) ? [p] : [];
  });
}

/** Les textes d'un fichier source : `{ ligne, texte }` (valeur réelle, échappements décodés). */
function textesDuSource(source) {
  const ast = babelParser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const textes = [];
  const garder = (p, texte) => textes.push({ ligne: p.node.loc.start.line, texte });
  const dansUnAttributDeCode = (p) => {
    const attribut = p.findParent((q) => q.isJSXAttribute());
    return !!attribut && ATTRIBUTS_CODE.test(attribut.node.name.name);
  };
  traverse(ast, {
    JSXText(p) { garder(p, p.node.value); },
    StringLiteral(p) {
      if (p.parentPath.isImportDeclaration() || p.parentPath.isExportNamedDeclaration() || p.parentPath.isExportAllDeclaration()) return;
      if (p.parentPath.isObjectProperty() && p.parentPath.node.key === p.node) return;
      if (dansUnAttributDeCode(p)) return;
      garder(p, p.node.value);
    },
    TemplateElement(p) {
      if (dansUnAttributDeCode(p)) return;
      garder(p, p.node.value.cooked ?? p.node.value.raw);
    },
  });
  return textes;
}

describe('typographie fine du site', () => {
  it('la règle : espace fine dans les « », avant ; : ? ! %, entre les groupes de chiffres', () => {
    const f = ESPACE_FINE;
    expect(fine('Le devis passe en « Signé » : voilà ; 10 % ? Oui !')).toBe(`Le devis passe en «${f}Signé${f}»${f}: voilà${f}; 10${f}%${f}? Oui${f}!`);
    expect(fine('«Signé»')).toBe(`«${f}Signé${f}»`);
    expect(fine('plus de 1 000 prestations, 2\u00a0081,20 €')).toBe(`plus de 1${f}000 prestations, 2${f}081,20 €`);
    // Une espace insécable ordinaire est remplacée, une espace fine reste
    expect(fine('Objet\u00a0:')).toBe(`Objet${f}:`);
    expect(fine(`Objet${f}:`)).toBe(`Objet${f}:`);
  });

  it('la règle laisse le code et le français ordinaire : adresses, heures, classes, ponctuation collée', () => {
    for (const texte of ['https://mallettico.fr/?demo=true', '14:30', 'hover:bg-white !pt-6', 'w-[45%]', 'art. 293 B du CGI', '06 39 98 00 00', 'J+7']) {
      expect(fine(texte), texte).toBe(texte);
    }
  });

  it('idempotente : appliquée deux fois, elle ne change plus rien', () => {
    const texte = 'Questions : « Signé » ; 1 000 € ; 10 % ?';
    expect(fine(fine(texte))).toBe(fine(texte));
    expect(fautesDeTypographie(fine(texte))).toEqual([]);
  });

  it('cas témoin : chaque faute est relevée (espace ordinaire ou insécable, guillemets collés)', () => {
    expect(fautesDeTypographie('Pourquoi ?')).toHaveLength(1);
    expect(fautesDeTypographie('Objet\u00a0:')).toHaveLength(1);
    expect(fautesDeTypographie('« Signé »')).toHaveLength(2);
    expect(fautesDeTypographie('«Signé»')).toHaveLength(2);
    expect(fautesDeTypographie('10 %')).toHaveLength(1);
    expect(fautesDeTypographie('1 000 prestations')).toHaveLength(1);
  });

  it('les libellés de PLANS que le site affiche passent par la règle (ils ne sont pas réécrits dans PLANS)', () => {
    const libelles = Object.values(PLANS).flatMap((p) => p.featureLabels.map((l) => l.name));
    const affiches = libelles.map(libelleAffiche);
    expect(affiches.flatMap(fautesDeTypographie)).toEqual([]);
    expect(affiches.some((t) => t.includes(`bibliothèque${ESPACE_FINE}:`))).toBe(true);
  });

  it('aucun texte des fichiers du site ne s\'écarte de la règle', () => {
    const fichiers = fichiersDuSite(DOSSIER_SITE);
    expect(fichiers.length).toBeGreaterThan(30);
    const fautes = fichiers.flatMap((fichier) => {
      const relatif = path.relative(DOSSIER_SITE, fichier).split(path.sep).join('/');
      if (NON_LUS.has(relatif)) return [];
      return textesDuSource(fs.readFileSync(fichier, 'utf8'))
        .flatMap(({ ligne, texte }) => fautesDeTypographie(texte).map((extrait) => `${relatif}:${ligne} — « ${extrait} »`));
    });
    expect(fautes, `Typographie fine (site/typographie.js) :\n${fautes.join('\n')}`).toEqual([]);
  });

  it('le lecteur de textes voit le texte JSX, les chaînes et les gabarits, pas les classes ni les commentaires', () => {
    const source = [
      "// Pourquoi ? un commentaire",
      "const a = 'Objet :';",
      'const b = `Total ${1} %`;',
      'const c = <p className="hover:x !pt-6">Une question ?</p>;',
      'const d = <img alt="Le lot « tableau »" src="/a b :c" />;',
    ].join('\n');
    const fautes = textesDuSource(source).flatMap((t) => fautesDeTypographie(t.texte));
    expect(fautes).toHaveLength(5); // « : », « % », « ? », et les deux guillemets de l'attribut alt
  });
});
