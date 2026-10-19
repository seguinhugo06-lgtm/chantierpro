import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fichiersConcernes, compterAncienCode, neutraliser } from '../../../scripts/migration/fichiers.mjs';

/**
 * Cliquet de la fin de l'ancien code de thème et de couleurs (plan du 19 oct. 2026).
 * Les écrans affichés n'utilisent que les jetons du thème (src/styles/theme.css, règle « interface ») ;
 * quatre motifs de l'ancien code sont comptés dans les fichiers atteignables depuis src/main.jsx :
 *   ternaires       isDark ? '…' : '…' (deux chaînes simples)
 *   styleCouleur    background|color|… : couleur|accent (couleur brute de l'entreprise en style)
 *   teinteCouleur   ${couleur}NN (teinte hexadécimale à deux chiffres)
 *   orange          classes orange Tailwind et #f97316 / #ea580c en dur
 * Le plafond (ancienCode.plafond.json) ne fait que baisser : quand un lot en retire, l'abaisser ici
 * aux nouveaux totaux ; il vaut 0 quand l'ancien code a disparu.
 * Exceptions (jamais comptées) : le site public, les générateurs de documents et d'e-mails, le HTML
 * produit en chaîne dans DevisPage.jsx, les fichiers jamais importés.
 */

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MOTIFS = ['ternaires', 'styleCouleur', 'teinteCouleur', 'orange'];

describe('fichiersConcernes', () => {
  const fichiers = fichiersConcernes(RACINE);

  it('contient les écrans migrés et ne contient ni le site public ni les générateurs de documents', () => {
    expect(fichiers).toContain('src/components/Dashboard.jsx');
    expect(fichiers).toContain('src/components/DevisPage.jsx');
    expect(fichiers.filter((f) => f.startsWith('src/components/landing/'))).toEqual([]);
    for (const exception of [
      'src/lib/devisHtmlBuilder.js', 'src/lib/pdfHtmlBuilder.js', 'src/lib/miseEnDemeureBuilder.js',
      'src/lib/rapportChantierPdf.js', 'src/lib/reportPdfBuilder.js', 'src/lib/emailSender.js',
      'src/lib/relanceUtils.js', 'src/lib/echapperHtml.js',
    ]) {
      expect(fichiers, exception).not.toContain(exception);
    }
  });

  it('donne des chemins relatifs à la racine, existants, uniques, en code source seulement', () => {
    expect(fichiers.length).toBeGreaterThan(200);
    expect(new Set(fichiers).size).toBe(fichiers.length);
    for (const f of fichiers) {
      expect(f.startsWith('src/'), f).toBe(true);
      expect(f.includes('\\'), f).toBe(false);
      expect(/\.(jsx?|tsx?)$/.test(f), f).toBe(true);
      expect(fs.existsSync(path.join(RACINE, f)), f).toBe(true);
    }
  });

  describe('parcours des imports (arborescence fictive)', () => {
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'ancien-code-'));
    afterAll(() => fs.rmSync(dossier, { recursive: true, force: true }));
    const ecrire = (relatif, contenu = 'export default 1;\n') => {
      const p = path.join(dossier, relatif);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, contenu);
    };

    ecrire('src/main.jsx', [
      "import React from 'react';",
      "import './effet.js';",
      "import Statique from './Statique';",
      "import { Barre } from './barre';",
      "const Page = React.lazy(() => import('./pages/Page.jsx'));",
      "const Autre = lazy(() => import(\"./pages/Autre\"));",
      "export { Relais } from './relais/Relais';",
      "// import Commente from './Commente';",
      "/* import Bloc from './Bloc'; */",
      "const texte = 'import Chaine from \"./Chaine\"';",
    ].join('\n'));
    ecrire('src/effet.js');
    ecrire('src/Statique.jsx', "import { aide } from '../src/lib/aide';\nimport './style.css';\n");
    ecrire('src/barre/index.jsx');
    ecrire('src/pages/Page.jsx', "import Profond from '../profond/Profond.jsx';\n");
    ecrire('src/pages/Autre.js');
    ecrire('src/relais/Relais.jsx');
    ecrire('src/lib/aide.js');
    ecrire('src/style.css', 'body {}\n');
    ecrire('src/profond/Profond.jsx');
    ecrire('src/Commente.jsx');
    ecrire('src/Bloc.jsx');
    ecrire('src/Chaine.jsx');
    ecrire('src/Orphelin.jsx');
    ecrire('src/components/landing/Accueil.jsx', "import Partage from '../Partage';\n");
    ecrire('src/components/Partage.jsx');
    ecrire('src/lib/echapperHtml.js');
    ecrire('src/lib/__tests__/aide.test.js', "import { aide } from '../aide';\n");
    // le point d'entrée importe aussi le site public et un générateur exclu
    fs.appendFileSync(path.join(dossier, 'src/main.jsx'),
      "\nimport Accueil from './components/landing/Accueil';\nimport { e } from './lib/echapperHtml';\n");

    it('suit imports statiques, imports d\'effet, import() dynamiques (lazy compris), index et réexports', () => {
      const trouves = fichiersConcernes(dossier);
      expect(trouves).toEqual([
        'src/Statique.jsx', 'src/barre/index.jsx', 'src/effet.js', 'src/lib/aide.js', 'src/main.jsx',
        'src/pages/Autre.js', 'src/pages/Page.jsx', 'src/profond/Profond.jsx', 'src/relais/Relais.jsx',
        'src/components/Partage.jsx',
      ].sort());
    });

    it('ignore les imports commentés ou écrits dans une chaîne, les fichiers jamais importés et les tests', () => {
      const trouves = fichiersConcernes(dossier);
      for (const f of ['src/Commente.jsx', 'src/Bloc.jsx', 'src/Chaine.jsx', 'src/Orphelin.jsx', 'src/lib/__tests__/aide.test.js']) {
        expect(trouves, f).not.toContain(f);
      }
    });

    it('retire le site public et les générateurs, mais garde ce que seul le site public importe', () => {
      const trouves = fichiersConcernes(dossier);
      expect(trouves).not.toContain('src/components/landing/Accueil.jsx');
      expect(trouves).not.toContain('src/lib/echapperHtml.js');
      expect(trouves).toContain('src/components/Partage.jsx');
    });
  });
});

describe('compterAncienCode', () => {
  const zero = { ternaires: 0, styleCouleur: 0, teinteCouleur: 0, orange: 0 };

  it('compte 1 ternaire sur deux chaînes simples, simples ou doubles, sur une ou plusieurs lignes', () => {
    expect(compterAncienCode("const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';"))
      .toEqual({ ...zero, ternaires: 1 });
    expect(compterAncienCode('const t = isDark ? "text-white" : "text-slate-900";')).toEqual({ ...zero, ternaires: 1 });
    expect(compterAncienCode("const t = isDark\n    ? 'text-white'\n    : 'text-slate-900';")).toEqual({ ...zero, ternaires: 1 });
    expect(compterAncienCode("const a = isDark ? 'x' : 'y'; const b = isDark ? 'z' : 'w';").ternaires).toBe(2);
  });

  it('ne compte pas un ternaire dont une branche n\'est pas une chaîne simple', () => {
    expect(compterAncienCode('const t = isDark ? `bg-${x}` : `bg-y`;')).toEqual(zero);
    expect(compterAncienCode("const t = isDark ? 'a' : autre;")).toEqual(zero);
    expect(compterAncienCode("const t = isDark ? 'a' : (b ? 'c' : 'd');")).toEqual(zero);
    expect(compterAncienCode("const t = estSombre ? 'a' : 'b';")).toEqual(zero);
  });

  it('compte 1 style de couleur brute de l\'entreprise', () => {
    expect(compterAncienCode('<div style={{ background: couleur }} />')).toEqual({ ...zero, styleCouleur: 1 });
    expect(compterAncienCode('<div style={{ backgroundColor: couleur, padding: 4 }} />').styleCouleur).toBe(1);
    expect(compterAncienCode('<span style={{ color: accent }} />').styleCouleur).toBe(1);
    expect(compterAncienCode('<span style={{ borderColor:couleur }} />').styleCouleur).toBe(1);
    expect(compterAncienCode('<span style={{ borderTopColor : couleur }} />').styleCouleur).toBe(1);
    expect(compterAncienCode('<span style={{ color: couleurTexte }} />').styleCouleur).toBe(0);
    expect(compterAncienCode("<span style={{ color: 'var(--accent)' }} />").styleCouleur).toBe(0);
  });

  it('compte 1 teinte hexadécimale de la couleur de l\'entreprise', () => {
    expect(compterAncienCode('<div style={{ background: `${couleur}15` }} />').teinteCouleur).toBe(1);
    expect(compterAncienCode('const f = `${accent}20`;')).toEqual({ ...zero, teinteCouleur: 1 });
    expect(compterAncienCode('const f = `${couleur}`;').teinteCouleur).toBe(0);
  });

  it('compte 1 orange en dur, par classe ou par valeur hexadécimale, sans tenir compte de la casse', () => {
    expect(compterAncienCode('<button className="bg-orange-500 text-white" />')).toEqual({ ...zero, orange: 1 });
    expect(compterAncienCode('<a className="hover:text-orange-600" />').orange).toBe(1);
    expect(compterAncienCode('<a className="border-orange-200 ring-orange-500 from-orange-50 to-orange-100 via-orange-300" />').orange).toBe(5);
    expect(compterAncienCode("const c = '#f97316';")).toEqual({ ...zero, orange: 1 });
    expect(compterAncienCode("const c = '#EA580C';").orange).toBe(1);
    expect(compterAncienCode('<a className="bg-orange-5" />').orange).toBe(0);
    expect(compterAncienCode('<a className="bg-accent text-accent-texte" />')).toEqual(zero);
  });

  it('ignore une chaîne ou un gabarit qui contient « < » (HTML de document ou d\'e-mail)', () => {
    const extrait = [
      'const html = `<table><th style="background:${couleur}15;color:${couleur}">',
      "  ${isDark ? 'a' : 'b'} Désignation</th>`;",
      "const ligne = '<td style=\"background: #f97316\">' + libelle;",
    ].join('\n');
    expect(compterAncienCode(extrait)).toEqual(zero);
    // le même motif hors HTML est compté
    expect(compterAncienCode('const f = `${couleur}15`; const o = \'bg-orange-500\';'))
      .toEqual({ ...zero, teinteCouleur: 1, orange: 1 });
  });

  it('compte ce qui suit un gabarit HTML, et ce qui est dans une expression d\'un gabarit sans HTML', () => {
    const extrait = [
      'const html = `<div>${titre}</div>`;',
      "const classe = isDark ? 'bg-slate-800' : 'bg-white';",
      "const c = `flex ${isDark ? 'text-white' : 'text-slate-900'} ${a < b ? 'x' : 'y'}`;",
    ].join('\n');
    expect(compterAncienCode(extrait).ternaires).toBe(2);
  });

  it('ignore les commentaires', () => {
    const extrait = [
      "// ancien : isDark ? 'bg-slate-800' : 'bg-white' et bg-orange-500",
      "/* style={{ background: couleur }} `${couleur}15` #f97316 */",
      '{/* <div className="bg-orange-500" /> */}',
    ].join('\n');
    expect(compterAncienCode(extrait)).toEqual(zero);
  });

  it('ne se laisse pas égarer par une apostrophe dans du texte JSX ni par une expression régulière', () => {
    const texte = [
      "<p>L'artisan d'abord</p>",
      "<b className={isDark ? 'text-white' : 'text-slate-900'}>{nom.replace(/'/g, '’')}</b>",
      '<i className="bg-orange-500">l\'équipe</i>',
    ].join('\n');
    expect(compterAncienCode(texte)).toEqual({ ...zero, ternaires: 1, orange: 1 });
    // l'apostrophe de « Aujourd'hui » ne doit pas ouvrir une chaîne qui avalerait le ternaire suivant
    const memeLigne = "<p>Aujourd'hui <b className={isDark ? 'text-white' : 'text-slate-900'}>x</b></p>";
    expect(compterAncienCode(memeLigne)).toEqual({ ...zero, ternaires: 1 });
    // une expression régulière à guillemet ne doit pas décaler l'appariement des chaînes qui suivent
    const regex = "const propre = nom.replace(/'/g, ''); const el = <b className={isDark ? 'a' : 'b'}>x</b>;";
    expect(compterAncienCode(regex)).toEqual({ ...zero, ternaires: 1 });
  });

  it('ne prend pas le « /> » qui suit une expression d\'attribut JSX pour le début d\'une expression régulière', () => {
    // lu comme /><b className={`w-1/ , le « /> » décalait le balayage : le gabarit refermé après w-1/2 devenait
    // l'ouverture d'un gabarit à HTML qui avalait, jusqu'au prochain accent grave, le ternaire de la ligne suivante
    const extrait = [
      'const a = <p><Icon size={14} /><b className={`w-1/2 ${x}`}>x</b></p>;',
      "const c = isDark ? 'bg-slate-800' : 'bg-white';",
      'const d = `fin`;',
    ].join('\n');
    expect(compterAncienCode(extrait)).toEqual({ ...zero, ternaires: 1 });
  });

  it('garde les positions : mêmes longueurs, mêmes numéros de ligne', () => {
    const extrait = [
      "/* commentaire",
      "   sur deux lignes */",
      "const html = `<p>",
      "  ${titre}</p>`; // fin",
      "const ok = isDark ? 'a' : 'b';",
    ].join('\n');
    const neutre = neutraliser(extrait);
    expect(neutre.length).toBe(extrait.length);
    expect(neutre.split('\n').length).toBe(extrait.split('\n').length);
    expect(neutre.split('\n')[4]).toBe("const ok = isDark ? 'a' : 'b';");
    expect(neutre).not.toMatch(/commentaire|titre|fin/);
  });

  it('additionne plusieurs motifs d\'un même extrait', () => {
    const extrait = [
      "const cardBg = isDark ? 'bg-slate-800' : 'bg-white';",
      '<div className="bg-orange-500" style={{ background: couleur, borderColor: `${couleur}30` }} />',
    ].join('\n');
    expect(compterAncienCode(extrait)).toEqual({ ternaires: 1, styleCouleur: 1, teinteCouleur: 1, orange: 1 });
  });
});

describe('cliquet : l\'ancien code ne revient pas', () => {
  const plafond = JSON.parse(fs.readFileSync(new URL('./ancienCode.plafond.json', import.meta.url), 'utf8'));
  const fichiers = fichiersConcernes(RACINE);
  const totaux = Object.fromEntries(MOTIFS.map((m) => [m, 0]));
  for (const f of fichiers) {
    const n = compterAncienCode(fs.readFileSync(path.join(RACINE, f), 'utf8'));
    for (const m of MOTIFS) totaux[m] += n[m];
  }

  it('le plafond nomme les quatre motifs', () => {
    expect(Object.keys(plafond).sort()).toEqual([...MOTIFS].sort());
  });

  it.each(MOTIFS)('%s ne dépasse pas son plafond', (motif) => {
    expect(totaux[motif], `${motif} : ${totaux[motif]} occurrences pour un plafond de ${plafond[motif]}`)
      .toBeLessThanOrEqual(plafond[motif]);
  }, 30000);
}, 30000);
