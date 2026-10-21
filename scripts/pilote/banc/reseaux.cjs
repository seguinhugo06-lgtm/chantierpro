#!/usr/bin/env node
/**
 * Banc de l'onglet « Réseaux sociaux » du Pilote (page d'essai avec fausse base, port 4777).
 *
 *   npm run pilote:page -- --banc
 *   node scripts/pilote/banc/serveur.cjs &          (si ce n'est pas déjà lancé)
 *   node scripts/pilote/banc/reseaux.cjs
 *
 * Contrôle, à 1440 et à 375 px, en clair et en sombre : l'onglet s'affiche, aucun défilement horizontal
 * (toutes les fiches et sections du guide dépliées), les miniatures se chargent, « Copier » ne lève pas
 * d'erreur (succès simulé, puis refus simulé : le texte est sélectionné), une case cochée est écrite dans
 * la base et reste cochée après rechargement (copie locale, puis base distante), les autres onglets s'ouvrent
 * sans erreur. Captures : audit-ui/pilote/captures-reseaux/.
 */
const fs = require('fs');
const path = require('path');
const RACINE = path.resolve(__dirname, '../../..');
const puppeteer = require(require.resolve('puppeteer', { paths: [RACINE] }));
const URL_BANC = 'http://127.0.0.1:4777/';
const CAPTURES = path.join(RACINE, 'audit-ui/pilote/captures-reseaux');
fs.mkdirSync(CAPTURES, { recursive: true });
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const resultats = [];
const ok = (cond, msg) => { resultats.push([!!cond, msg]); console.log((cond ? '  ✓ ' : '  ✗ ') + msg); };

async function ouvrir(navigateur, largeur, sombre) {
  const page = await navigateur.newPage();
  await page.setViewport({ width: largeur, height: largeur < 500 ? 812 : 900, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: sombre ? 'dark' : 'light' }]);
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|status of 404/.test(m.text())) erreurs.push(m.text()); });
  page.on('requestfailed', (r) => erreurs.push('requête en échec : ' + r.url()));
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) erreurs.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.goto(URL_BANC, { waitUntil: 'networkidle0' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* stockage indisponible */ } });
  await page.goto(URL_BANC, { waitUntil: 'networkidle0' });
  return { page, erreurs };
}

(async () => {
  try { await fetch(URL_BANC); } catch (e) { console.error('✗ Banc injoignable sur ' + URL_BANC + ' : lancer node scripts/pilote/banc/serveur.cjs'); process.exit(1); }
  const navigateur = await puppeteer.launch({ headless: 'new' });
  for (const [largeur, sombre] of [[1440, false], [1440, true], [375, false], [375, true]]) {
    const nom = `${largeur}-${sombre ? 'sombre' : 'clair'}`;
    console.log(`\n── ${largeur} px, ${sombre ? 'sombre' : 'clair'}`);
    const { page, erreurs } = await ouvrir(navigateur, largeur, sombre);
    await page.click('nav.onglets button[data-v="reseaux"]');
    await attendre(300);
    ok(await page.$eval('#vue', (v) => v.innerText.includes('Le kit des 10 jours')), 'l’onglet s’affiche');
    ok(await page.$eval('nav.onglets button[data-v="reseaux"]', (b) => b.getAttribute('aria-current') === 'page'), 'l’onglet est marqué actif');
    await page.screenshot({ path: path.join(CAPTURES, `${nom}-1-tete.png`) });

    // Tout déplier : le pire cas pour le défilement horizontal.
    await page.evaluate(() => {
      RESEAUX.publications.forEach((p) => { ui.ouv['p:' + p.id] = true; });
      RESEAUX.guide.sections.forEach((s) => { ui.ouv[s.id] = true; s.sous.forEach((x) => { ui.ouv[x.id] = true; }); });
      rendre();
    });
    await attendre(1500);
    const mesure = await page.evaluate(() => {
      const larges = [...document.querySelectorAll('#vue *')].filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && getComputedStyle(e).position !== 'fixed').map((e) => e.className || e.tagName).slice(0, 5);
      return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, larges };
    });
    ok(mesure.sw <= mesure.cw, `aucun défilement horizontal (${mesure.sw} ≤ ${mesure.cw})${mesure.larges.length ? ' — dépassent : ' + mesure.larges.join(', ') : ''}`);
    // Les miniatures hors écran sont chargées à la demande (loading="lazy") : on force le chargement pour les contrôler toutes.
    await page.evaluate(() => { document.querySelectorAll('#vue img').forEach((i) => { i.loading = 'eager'; }); });
    await attendre(1500);
    const imgs = await page.evaluate(() => [...document.querySelectorAll('#vue img')].map((i) => i.complete && i.naturalWidth > 0));
    ok(imgs.length >= 30 && imgs.every(Boolean), `les miniatures se chargent (${imgs.filter(Boolean).length} sur ${imgs.length})`);
    const nBoutons = await page.$$eval('[data-act="rz-copier"]', (b) => b.length);
    ok(nBoutons >= 40, `${nBoutons} boutons « Copier »`);

    // Copier : succès simulé, puis refus simulé.
    await page.evaluate(() => { navigator.clipboard.writeText = async (t) => { window.__copie = t; }; });
    await page.$eval('#rz-p-J02 [data-act="rz-copier"][data-src="ig:J02"]', (b) => b.click());
    await attendre(300);
    const succes = await page.evaluate(() => ({ toast: document.getElementById('toast').textContent, copie: window.__copie || '' }));
    ok(succes.toast === 'Copié.' && succes.copie.includes('Lien en bio'), 'Copier : texte envoyé au presse-papiers, message « Copié. »');
    await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('refusé'); }; });
    await page.$eval('#rz-p-J02 [data-act="rz-copier"][data-src="mo:J02"]', (b) => b.click());
    await attendre(300);
    const refus = await page.evaluate(() => ({ toast: document.getElementById('toast').textContent, sel: String(getSelection()).length }));
    ok(refus.toast === 'Sélectionné : faites Cmd+C' && refus.sel > 200, 'Copier refusé : texte sélectionné, message « Sélectionné : faites Cmd+C »');
    await page.evaluate(() => { document.getElementById('rz-p-J02').scrollIntoView(); window.scrollBy(0, -80); });
    await attendre(200);
    await page.screenshot({ path: path.join(CAPTURES, `${nom}-2-reel-montage.png`) });

    // Cases : écriture en base, puis persistance au rechargement.
    await page.$eval('#rz-p-E1 [data-act="rz-prog"]', (b) => b.click());
    await page.$eval('[data-act="rz-valide"]', (b) => b.click());
    await attendre(1500);
    const base = await page.evaluate(() => { const d = window.__fauxDocs.get('data/users/u_test/pilote'); return d && d.reseaux; });
    ok(base && base.prog && base.prog.E1 && Object.keys(base.valide || {}).length === 1, 'les deux cases sont écrites dans le document du Pilote (reseaux.prog, reseaux.valide)');
    await page.reload({ waitUntil: 'networkidle0' });
    await page.click('nav.onglets button[data-v="reseaux"]');
    await page.evaluate(() => { ui.ouv['p:E1'] = true; rendre(); });
    await attendre(300);
    const apres = await page.evaluate(() => ({ prog: document.querySelector('#rz-p-E1 [data-act="rz-prog"]').checked, valide: document.querySelector('[data-act="rz-valide"]').checked, jauge: document.querySelector('.rz-avance').innerText }));
    ok(apres.prog && apres.valide, 'après rechargement, les cases cochées le restent (copie locale)');
    ok(/^1 publication programmée sur 11/.test(apres.jauge), 'l’avancement affiche « 1 publication programmée sur 11 »');
    // Chemin distant : une autre session a coché, la page le reçoit.
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload({ waitUntil: 'networkidle0' });
    await page.click('nav.onglets button[data-v="reseaux"]');
    await page.evaluate(() => { window.__semer('data/users/u_test/pilote', { v: 2, etapes: {}, focus: [], perso: [], vuLe: '', reseaux: { valide: {}, prog: { E1: 1, E2: 2, E3: 3 } } }); });
    await attendre(500);
    ok(/^3 publications programmées sur 11/.test(await page.$eval('.rz-avance', (e) => e.innerText)), 'un état venu de la base distante est repris (3 programmées)');
    ok(/Un devis par lots/.test(await page.$eval('.rz-prochaine', (e) => e.innerText)), 'la prochaine publication à programmer passe à J01');

    // Guide, plan, autres onglets.
    await page.evaluate(() => { ui.ouv.g2 = true; ui.ouv['g2-1'] = true; ui.ouv.g4 = true; ui.ouv['g4-4'] = true; rendre(); document.getElementById('rz-s-guide').scrollIntoView(); window.scrollBy(0, -80); });
    await attendre(300);
    await page.screenshot({ path: path.join(CAPTURES, `${nom}-3-guide.png`) });
    await page.evaluate(() => { document.getElementById('rz-s-plan').scrollIntoView(); window.scrollBy(0, -80); });
    await attendre(200);
    await page.screenshot({ path: path.join(CAPTURES, `${nom}-4-plan.png`) });
    for (const onglet of ['aujourdhui', 'etapes', 'claude', 'reperes']) {
      await page.click(`nav.onglets button[data-v="${onglet}"]`);
      await attendre(200);
      const n = await page.$eval('#vue', (v) => v.innerText.length);
      ok(n > 200, `l’onglet « ${onglet} » s’affiche (${n} caractères)`);
    }
    await page.screenshot({ path: path.join(CAPTURES, `${nom}-5-autre-onglet.png`) });
    ok(erreurs.length === 0, 'aucune erreur de page, de console ni de requête' + (erreurs.length ? ' : ' + erreurs.slice(0, 3).join(' | ') : ''));
    await page.close();
  }
  await navigateur.close();
  const rates = resultats.filter((r) => !r[0]).length;
  console.log(`\n${rates ? '✗' : '✓'} ${resultats.length - rates} contrôles réussis, ${rates} en échec. Captures : ${path.relative(RACINE, CAPTURES)}/`);
  process.exit(rates ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
