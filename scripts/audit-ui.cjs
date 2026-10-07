#!/usr/bin/env node
/**
 * audit-ui — mesure les défauts d'affichage de l'app, page par page, à trois largeurs.
 *
 * Pourquoi : « des menus sortent de l'écran, des infos s'entremêlent » ne se corrige pas
 * au jugé. Ce script le mesure, pour corriger par cause commune et vérifier après coup.
 *
 * Détecte, pour chaque page × largeur :
 *   - débordement horizontal de la page (scrollWidth > largeur d'écran) ;
 *   - éléments qui sortent de l'écran (hors conteneurs à défilement ou coupés) ;
 *   - menus déroulants qui, une fois ouverts, sortent de l'écran ;
 *   - blocs de texte qui se chevauchent ;
 *   - erreurs JavaScript.
 *
 * Aucun serveur : le build dist/ (construit SANS .env → mode démo) est servi par
 * interception de requêtes Puppeteer sur http://localhost:4999.
 *
 * Usage (depuis la racine du dépôt) :
 *   npm run build
 *   node scripts/audit-ui.cjs              # toutes les pages, 375 / 768 / 1440 px
 *   node scripts/audit-ui.cjs devis 375    # une page, une largeur
 * Sortie : audit-ui/rapport.md, audit-ui/rapport.json, audit-ui/captures/ (dossier ignoré par git).
 */
const fs = require('fs');
const path = require('path');

const RACINE = process.env.RACINE || path.resolve(__dirname, '..');
const puppeteer = require(require.resolve('puppeteer', { paths: [RACINE] }));
const DIST = path.join(RACINE, 'dist');
const SORTIE = process.env.SORTIE || path.join(RACINE, 'audit-ui');
const ORIGIN = 'http://localhost:4999';
const LARGEURS = { 375: 812, 768: 1024, 1440: 900 };
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

// Pages routées dans App.jsx, hors pages légales/publiques et outils internes.
function pagesRoutees() {
  const app = fs.readFileSync(path.join(RACINE, 'src/App.jsx'), 'utf8');
  const exclues = new Set(['cgv', 'cgu', 'confidentialite', 'mentions-legales', 'accessibilite', 'conformite',
    'design-system', 'client-portal', 'checkout-success']);
  return [...new Set([...app.matchAll(/page === '([a-z0-9-]+)'/g)].map((m) => m[1]))].filter((p) => !exclues.has(p));
}

// Exécuté DANS la page.
function mesurer() {
  const W = window.innerWidth, H = window.innerHeight;
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const dansConteneurCoupe = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true;
    }
    return false;
  };
  const decrire = (el) => {
    const t = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const cls = (typeof el.className === 'string' ? el.className : '').split(' ').filter(Boolean).slice(0, 4).join('.');
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}${t ? ` « ${t} »` : ''}`;
  };
  const res = { debordementPage: document.documentElement.scrollWidth - W, horsEcran: [], chevauchements: [] };

  const fautifs = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const aCheval = (r.right > W + 1 && r.left < W - 1) || (r.left < -1 && r.right > 1);
    if (aCheval && (getComputedStyle(el).position === 'fixed' || !dansConteneurCoupe(el))) fautifs.push(el);
  }
  res.horsEcran = fautifs.filter((el) => !fautifs.some((o) => o !== el && o.contains(el))).slice(0, 12)
    .map((el) => { const r = el.getBoundingClientRect(); return { el: decrire(el), gauche: Math.round(r.left), droite: Math.round(r.right) }; });

  const feuilles = [...document.body.querySelectorAll('p, span, h1, h2, h3, h4, label, a, button, td, li, div')]
    .filter((el) => visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1))
    .slice(0, 600).map((el) => ({ el, r: el.getBoundingClientRect() })).filter(({ r }) => r.bottom > 0 && r.top < H * 3);
  for (let i = 0; i < feuilles.length && res.chevauchements.length < 10; i++) {
    for (let j = i + 1; j < feuilles.length; j++) {
      const a = feuilles[i], b = feuilles[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (x <= 2 || y <= 2) continue;
      if ((x * y) / Math.min(a.r.width * a.r.height, b.r.width * b.r.height) > 0.35) res.chevauchements.push({ a: decrire(a.el), b: decrire(b.el) });
      if (res.chevauchements.length >= 10) break;
    }
  }
  return res;
}

async function auditerMenus(page) {
  const nb = await page.evaluate(() => {
    const cands = [...document.querySelectorAll('button[aria-haspopup], button[aria-expanded="false"], [role="combobox"]')]
      .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight; });
    cands.forEach((b, i) => b.setAttribute('data-audit-menu', String(i)));
    return Math.min(cands.length, 12);
  });
  const problemes = [];
  for (let i = 0; i < nb; i++) {
    const libelle = await page.evaluate((k) => {
      document.querySelectorAll('[data-audit-avant]').forEach((e) => e.removeAttribute('data-audit-avant'));
      for (const el of document.querySelectorAll('[role="menu"], [role="listbox"], .absolute, .fixed, [class*="dropdown"], [class*="popover"]')) {
        const s = getComputedStyle(el); if (s.display !== 'none' && s.visibility !== 'hidden') el.setAttribute('data-audit-avant', '1');
      }
      const b = document.querySelector(`[data-audit-menu="${k}"]`); if (!b) return null;
      b.click(); return (b.innerText || b.getAttribute('aria-label') || b.title || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    }, i);
    if (libelle === null) continue;
    await attendre(350);
    const sortie = await page.evaluate(() => {
      const W = innerWidth, H = innerHeight, out = [];
      for (const el of document.querySelectorAll('[role="menu"], [role="listbox"], .absolute, .fixed, [class*="dropdown"], [class*="popover"]')) {
        const s = getComputedStyle(el), r = el.getBoundingClientRect();
        if (el.hasAttribute('data-audit-avant')) continue;
        if (s.display === 'none' || s.visibility === 'hidden' || r.width < 40 || r.height < 30) continue;
        if (r.right <= 0 || r.left >= W) continue;
        if (s.position !== 'absolute' && s.position !== 'fixed') continue;
        const c = [];
        if (r.right > W + 1) c.push(`droite +${Math.round(r.right - W)} px`);
        if (r.left < -1) c.push(`gauche ${Math.round(r.left)} px`);
        if (r.bottom > H + 1 && s.position === 'fixed') c.push(`bas +${Math.round(r.bottom - H)} px`);
        if (c.length) out.push(c.join(', '));
      }
      return [...new Set(out)];
    });
    if (sortie.length) problemes.push({ declencheur: libelle || `menu #${i}`, sort: sortie });
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.body.click());
    await attendre(150);
  }
  return problemes;
}

(async () => {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.error('dist/ absent : lancez npm run build (sans .env, mode démo).'); process.exit(1); }
  const [filtrePage, filtreLargeur] = process.argv.slice(2);
  const pages = pagesRoutees().filter((p) => !filtrePage || p === filtrePage);
  const largeurs = Object.keys(LARGEURS).map(Number).filter((w) => !filtreLargeur || w === Number(filtreLargeur));
  fs.mkdirSync(path.join(SORTIE, 'captures'), { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  const rapport = [];
  for (const W of largeurs) {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: LARGEURS[W], deviceScaleFactor: 1, isMobile: W < 768, hasTouch: W < 768 });
    const erreurs = [];
    page.on('pageerror', (e) => erreurs.push(String(e.message || e)));
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const u = new URL(req.url());
      if (u.origin !== ORIGIN) return req.abort();
      if (u.pathname === '/sw.js' || u.pathname === '/registerSW.js') return req.respond({ status: 404, body: '' });
      let f = path.join(DIST, decodeURIComponent(u.pathname));
      if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
      req.respond({ status: 200, contentType: MIME[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
    });
    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.setItem('cp_cookie_consent', JSON.stringify({ necessary: true, timestamp: Date.now() }));
        localStorage.setItem('batigesti_onboarding_complete', 'true');
        localStorage.setItem('cp_trial_end_modal_shown', '1');
        localStorage.setItem('cp_catalogue_onboarding_dismissed', 'true');
        localStorage.setItem('cp_demo_plan', 'equipe');
      } catch (e) { /* stockage indisponible */ }
    });
    await page.goto(ORIGIN + '/?demo=true', { waitUntil: 'networkidle0', timeout: 60000 });

    for (const p of pages) {
      erreurs.length = 0;
      await page.evaluate((nom) => { localStorage.setItem('cp_current_page', nom); location.reload(); }, p);
      await page.waitForNetworkIdle({ idleTime: 400, timeout: 20000 }).catch(() => {});
      await attendre(1200);
      const atteinte = (await page.evaluate(() => localStorage.getItem('cp_current_page'))) === p;
      const m = await page.evaluate(mesurer);
      const menus = await auditerMenus(page);
      const capture = `captures/${p}-${W}.png`;
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(SORTIE, capture) });
      const n = !atteinte ? 0 : (m.debordementPage > 1 ? 1 : 0) + m.horsEcran.length + m.chevauchements.length + menus.length;
      rapport.push({ page: p, largeur: W, atteinte, defauts: n, debordementPage: m.debordementPage,
        horsEcran: m.horsEcran, menus, chevauchements: m.chevauchements, erreursJS: [...erreurs], capture });
      process.stdout.write(`${p}@${W}: ${n}\n`);
    }
    await page.close();
  }
  await browser.close();

  fs.writeFileSync(path.join(SORTIE, 'rapport.json'), JSON.stringify(rapport, null, 1));
  const L = ['# Audit d’interface', '', `Généré le ${new Date().toLocaleString('fr-FR')} sur dist/ (mode démo).`, '',
    '| Page | Largeur | Défauts | Débordement page | Hors écran | Menus coupés | Chevauchements | Erreurs JS |', '|---|---|---|---|---|---|---|---|'];
  for (const r of [...rapport].sort((a, b) => b.defauts - a.defauts)) {
    L.push(`| ${r.page}${r.atteinte ? '' : ' (non atteinte)'} | ${r.largeur} | ${r.defauts} | ${r.debordementPage > 1 ? '+' + r.debordementPage + ' px' : '—'} | ${r.horsEcran.length} | ${r.menus.length} | ${r.chevauchements.length} | ${r.erreursJS.length} |`);
  }
  L.push('', '## Détail', '');
  for (const r of rapport.filter((x) => x.defauts > 0 || x.erreursJS.length)) {
    L.push(`### ${r.page} — ${r.largeur} px  ([capture](${r.capture}))`);
    r.horsEcran.forEach((h) => L.push(`- Hors écran : ${h.el} (gauche ${h.gauche}, droite ${h.droite})`));
    r.menus.forEach((h) => L.push(`- Menu coupé : « ${h.declencheur} » → ${h.sort.join(' ; ')}`));
    r.chevauchements.forEach((h) => L.push(`- Chevauchement : ${h.a} ✕ ${h.b}`));
    r.erreursJS.forEach((e) => L.push(`- Erreur JS : ${e}`));
    L.push('');
  }
  fs.writeFileSync(path.join(SORTIE, 'rapport.md'), L.join('\n'));
  console.log(`\nTotal : ${rapport.reduce((s, r) => s + r.defauts, 0)} défaut(s), ${rapport.length} combinaisons → ${path.join(SORTIE, 'rapport.md')}`);
})().catch((e) => { console.error('ÉCHEC :', e.message); process.exit(1); });
