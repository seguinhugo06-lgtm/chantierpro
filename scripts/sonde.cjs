#!/usr/bin/env node
/**
 * sonde — ouvre une page de l'app (build dist/, mode démo) et l'inspecte ou y exécute un scénario.
 * Sert à VÉRIFIER un changement visible sans serveur, comme le ferait un humain dans le navigateur.
 *
 *   npm run build
 *   node scripts/sonde.cjs devis 375                         # résumé de la page (titres, alertes, erreurs JS, débordement)
 *   node scripts/sonde.cjs plan 1440 --plan=gratuit --capture=audit-ui/plan.png
 *   node scripts/sonde.cjs settings 1440 --script=audit-ui/mon-scenario.js
 *   node scripts/sonde.cjs devis 1440 --eval="return document.title"
 *
 * Un script (--script / --eval) est le CORPS d'une fonction async exécutée dans la page :
 * il peut utiliser `await` et doit `return` ce qu'il faut afficher (sérialisable en JSON).
 * Les captures et scripts jetables vont dans audit-ui/ (ignoré par git).
 */
const fs = require('fs');
const { ouvrir } = require('./lib/navigateur.cjs');

const args = process.argv.slice(2);
const opt = (nom) => { const a = args.find((x) => x.startsWith(`--${nom}=`)); return a ? a.slice(nom.length + 3) : null; };
const [pageNom = 'dashboard', largeur = '1440'] = args.filter((a) => !a.startsWith('--'));

const RESUME = `
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  return {
    page: localStorage.getItem('cp_current_page'),
    titres: [...document.querySelectorAll('h1, h2, h3')].filter(visible).map((e) => e.innerText.trim()).filter(Boolean).slice(0, 12),
    alertes: [...document.querySelectorAll('[role="alert"], [role="status"]')].filter(visible).map((e) => e.innerText.trim()).filter(Boolean),
    dialogues: [...document.querySelectorAll('[role="dialog"]')].map((e) => (e.innerText || '').trim().slice(0, 80)),
    boutons: [...document.querySelectorAll('button')].filter(visible).map((b) => (b.innerText || b.getAttribute('aria-label') || b.title || '').trim()).filter(Boolean).slice(0, 40),
    debordementHorizontal: document.documentElement.scrollWidth - innerWidth,
  };`;

(async () => {
  const code = opt('script') ? fs.readFileSync(opt('script'), 'utf8') : opt('eval') || RESUME;
  const { browser, page, erreurs, attendre } = await ouvrir({ page: pageNom, largeur: Number(largeur), plan: opt('plan') || 'equipe' });
  try {
    const resultat = await page.evaluate((c) => (new Function(`return (async () => {${c}})()`))(), code);
    console.log(JSON.stringify(resultat, null, 1));
    if (opt('capture')) { await attendre(300); await page.screenshot({ path: opt('capture') }); console.log(`capture : ${opt('capture')}`); }
    if (erreurs.length) { console.log('ERREURS JS :'); erreurs.forEach((e) => console.log('  ' + e)); process.exitCode = 2; }
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error('ÉCHEC :', e.message); process.exit(1); });
