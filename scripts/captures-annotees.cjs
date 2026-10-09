#!/usr/bin/env node
// Captures annotées (entretiens, présentations) : l'écran réel + une étiquette « Composant · jetons »
// par zone, reliée par un trait. Les zones viennent des marqueurs data-ui des composants de
// src/components/ui/, les jetons des couleurs calculées comparées aux variables du thème : rien n'est
// saisi à la main, la capture ne peut pas mentir sur le code.
//   npm run build && npm run captures          → les trois captures de design/captures/
//   node scripts/captures-annotees.cjs <sortie.png> <page> [--largeur=390] [--sombre] [--avant=js] [--titre="…"] [--dist=…]
const fs = require('fs');
const path = require('path');
const { ouvrir, attendre } = require('./lib/navigateur.cjs');

const RACINE = path.resolve(__dirname, '..');
const OUVRIR_FACTURE = "--avant=(() => { const b = [...document.querySelectorAll('[data-ui=\"LigneListe\"] > button')].find((x) => x.innerText.includes('FAC-2026-00003')); if (b) b.click(); })()";
const CAPTURES = [
  ['design/captures/1-accueil-telephone.png', 'dashboard', [], 'Accueil · téléphone'],
  ['design/captures/2-fiche-facture-telephone.png', 'devis', [OUVRIR_FACTURE], 'Fiche facture · téléphone'],
  ['design/captures/3-devis-bureau.png', 'devis', ['--largeur=1440'], 'Devis & factures · bureau'],
];
if (!process.argv[2] || process.argv[2].startsWith('--')) {
  const { execFileSync } = require('child_process');
  const commun = process.argv.slice(2);
  for (const [sortie, page, options, titre] of CAPTURES) {
    execFileSync(process.execPath, [__filename, path.join(RACINE, sortie), page, ...options, ...commun, `--titre=${titre}`], { stdio: 'inherit' });
  }
  process.exit(0);
}

const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const sortie = args[0];
const pageNom = args[1] || 'dashboard';
const largeur = Number(opt('largeur', 390));
const sombre = args.includes('--sombre');
const avant = opt('avant', '');
const titre = opt('titre', '');
const DIST = path.resolve(opt('dist', path.join(RACINE, 'dist')));
const hauteur = largeur < 600 ? 844 : 900;

(async () => {
  const { page, browser } = await ouvrir({
    dist: DIST, page: pageNom, largeur: largeur < 600 ? 390 : largeur,
    avantChargement: sombre
      ? () => { try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); localStorage.setItem('cp_theme', 'dark'); } catch { /* */ } }
      : () => { try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); localStorage.setItem('cp_theme', 'light'); } catch { /* */ } },
  });
  await page.setViewport({ width: largeur, height: hauteur, isMobile: largeur < 600, hasTouch: largeur < 600, deviceScaleFactor: 2 });
  await attendre(1500);
  if (avant) { await page.evaluate(avant); await attendre(1200); }

  const zones = await page.evaluate(() => {
    const racine = getComputedStyle(document.documentElement);
    const NOMS = ['fond', 'surface', 'surface-2', 'bord', 'bord-fort', 'encre', 'encre-2', 'encre-3', 'accent', 'sur-accent', 'accent-texte',
      'neutre-fond', 'info-fond', 'succes-fond', 'alerte-fond', 'danger-fond', 'neutre-texte', 'info-texte', 'succes-texte', 'alerte-texte', 'danger-texte'];
    const jetons = {};
    for (const n of NOMS) { const v = racine.getPropertyValue(`--${n}`).trim(); if (v) jetons[`rgb(${v.split(/\s+/).join(', ')})`] = n; }
    const jeton = (c) => jetons[c] || null;
    const vus = new Set();
    const liste = [];
    for (const el of document.querySelectorAll('[data-ui]')) {
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 16 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      const nom = el.dataset.ui;
      // un seul exemplaire par composant et par zone de l'écran (la 1re occurrence visible)
      if (vus.has(nom)) continue;
      if (el.parentElement?.closest('[data-ui]')?.dataset.ui === nom) continue;
      vus.add(nom);
      const cs = getComputedStyle(el);
      const t = [];
      const fond = jeton(cs.backgroundColor); if (fond) t.push(`bg-${fond}`);
      if (parseFloat(cs.borderTopWidth) > 0) { const b = jeton(cs.borderTopColor); if (b) t.push(`border-${b}`); }
      const texte = el.querySelector('h1,h2,p,span') || el;
      const ct = jeton(getComputedStyle(texte).color); if (ct) t.push(`text-${ct}`);
      const rad = parseFloat(cs.borderTopLeftRadius); if (rad >= 9999 || rad > 40) t.push('rounded-full'); else if (rad === 16) t.push('rounded-2xl'); else if (rad === 12) t.push('rounded-xl');
      if (cs.boxShadow && cs.boxShadow !== 'none') t.push('shadow-e1');
      const fs = getComputedStyle(texte).fontSize; t.push(fs.replace('px', ' px'));
      liste.push({ nom, jetons: t.slice(0, 4), x: r.left, y: Math.max(0, r.top), w: r.width, h: Math.min(r.bottom, innerHeight) - Math.max(0, r.top) });
    }
    return liste.slice(0, 12);
  });
  const png = await page.screenshot({ encoding: 'base64' });
  await browser.close();

  // Composition : l'écran au centre, les étiquettes à gauche et à droite, triées par hauteur.
  const ecranL = largeur < 600 ? largeur : Math.min(largeur, 1100);
  const echelle = ecranL / largeur;
  const ecranH = hauteur * echelle;
  const marge = largeur < 600 ? 360 : 300;
  const W = ecranL + marge * 2;
  const H = Math.max(ecranH + 140, 900);
  const ox = marge;
  const oy = 100;
  const gauche = [];
  const droite = [];
  zones.forEach((z) => ((z.x + z.w / 2) < largeur / 2 ? gauche : droite).push(z));
  const placer = (col) => {
    col.sort((a, b) => a.y - b.y);
    let y = oy + 20;
    return col.map((z) => {
      const cible = oy + (z.y + Math.min(z.h, 60) / 2) * echelle;
      const ly = Math.max(y, cible - 30);
      y = ly + 104;
      return { ...z, ly };
    });
  };
  const COULEURS = ['#f97316', '#2563eb', '#16a34a', '#9333ea', '#dc2626', '#0891b2', '#ca8a04', '#db2777', '#4f46e5', '#059669', '#ea580c', '#7c3aed'];
  const couleurDe = (nom) => COULEURS[[...nom].reduce((s, c) => s + c.charCodeAt(0), 0) % COULEURS.length];
  const etiquette = (z, cote) => {
    const c = couleurDe(z.nom);
    const lx = cote === 'g' ? 24 : ox + ecranL + 40;
    const lw = marge - 64;
    const bx = ox + z.x * echelle;
    const by = oy + z.y * echelle;
    const ancreX = cote === 'g' ? bx : bx + z.w * echelle;
    const ancreY = by + Math.min(z.h * echelle, 40) / 2;
    const finX = cote === 'g' ? lx + lw : lx;
    return `
      <rect x="${bx}" y="${by}" width="${z.w * echelle}" height="${z.h * echelle}" rx="10" fill="none" stroke="${c}" stroke-width="2.5" stroke-dasharray="6 4"/>
      <path d="M${finX},${z.ly + 26} C${(finX + ancreX) / 2},${z.ly + 26} ${(finX + ancreX) / 2},${ancreY} ${ancreX},${ancreY}" fill="none" stroke="${c}" stroke-width="2"/>
      <circle cx="${ancreX}" cy="${ancreY}" r="5" fill="${c}"/>
      <foreignObject x="${lx}" y="${z.ly}" width="${lw}" height="100">
        <div xmlns="http://www.w3.org/1999/xhtml" class="lab" style="border-color:${c}">
          <b style="color:${c}">${z.nom}</b>
          <span>${z.jetons.join(' · ')}</span>
        </div>
      </foreignObject>`;
  };
  const svg = [...placer(gauche).map((z) => etiquette(z, 'g')), ...placer(droite).map((z) => etiquette(z, 'd'))].join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Inter; src: url('${path.join(RACINE, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')}') format('woff2-variations'); font-weight: 100 900; }
    body { margin: 0; background: #f1f5f9; font-family: Inter, system-ui, sans-serif; }
    .lab { box-sizing: border-box; min-height: 64px; padding: 10px 14px; background: #fff; border: 2px solid; border-radius: 14px; box-shadow: 0 6px 16px -6px rgb(15 23 42 / .25); display: flex; flex-direction: column; gap: 4px; }
    .lab b { font-size: 16px; font-weight: 700; }
    .lab span { font: 500 12.5px/1.25 ui-monospace, Menlo, monospace; color: #334155; }
    h1 { position: absolute; left: 24px; top: 26px; margin: 0; font-size: 26px; color: #0f172a; letter-spacing: -0.02em; }
    h1 small { display: block; font-size: 14px; font-weight: 500; color: #64748b; margin-top: 4px; letter-spacing: 0; }
    .ecran { position: absolute; left: ${ox}px; top: ${oy}px; width: ${ecranL}px; border-radius: ${largeur < 600 ? 36 : 14}px; box-shadow: 0 30px 60px -20px rgb(15 23 42 / .45), 0 0 0 10px #0f172a; overflow: hidden; }
    .ecran img { display: block; width: 100%; }
  </style></head><body style="width:${W}px;height:${H}px;position:relative">
    <h1>${titre || 'Mallettico'}<small>Composants de src/components/ui/ · jetons de src/styles/theme.css · capture du vrai code (build démo)</small></h1>
    <div class="ecran"><img src="data:image/png;base64,${png}"></div>
    <svg width="${W}" height="${H}" style="position:absolute;inset:0">${svg}</svg>
  </body></html>`;
  fs.mkdirSync(path.join(RACINE, 'audit-ui'), { recursive: true });
  const fichierHtml = path.join(RACINE, 'audit-ui', 'annotation-tmp.html');
  fs.writeFileSync(fichierHtml, html);
  const puppeteer = require('puppeteer');
  const b2 = await puppeteer.launch({ headless: 'new', args: ['--allow-file-access-from-files'] });
  const p2 = await b2.newPage();
  await p2.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
  await p2.goto(`file://${fichierHtml}`, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 600));
  await p2.screenshot({ path: sortie });
  await b2.close();
  console.log(JSON.stringify({ sortie, zones: zones.map((z) => `${z.nom}: ${z.jetons.join(' ')}`) }));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
