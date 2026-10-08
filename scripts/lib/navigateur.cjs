/**
 * Navigateur de test commun (sonde, parcours) : ouvre l'app construite dans dist/ sans serveur,
 * en servant les fichiers par interception de requêtes Puppeteer sur http://localhost:4999.
 *
 * - Mode démo (par défaut) : dist/ construit sans .env, données riches via ?demo=true.
 * - Mode « réel simulé » (reel: true) : dist-reel/ construit avec une fausse URL Supabase ;
 *   les appels à Supabase passent par `supabase(req, url)` fourni par l'appelant (réponse, panne…).
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..', '..');
const puppeteer = require(require.resolve('puppeteer', { paths: [RACINE] }));
const ORIGIN = 'http://localhost:4999';
const HOTE_SUPABASE_FACTICE = 'fauxprojet.supabase.co';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json' };
const HAUTEURS = { 375: 812, 390: 844, 768: 1024, 1024: 768, 1440: 900 };
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/** Construit dist-reel/ (app pointée vers un faux Supabase) si absent ou plus ancien que src/. */
function construireDistReel() {
  const { execSync } = require('child_process');
  const dist = path.join(RACINE, 'audit-ui', 'dist-reel');
  execSync(`npx vite build --outDir ${JSON.stringify(dist)} --emptyOutDir`, {
    cwd: RACINE, stdio: 'ignore',
    env: { ...process.env, VITE_SUPABASE_URL: `https://${HOTE_SUPABASE_FACTICE}`, VITE_SUPABASE_ANON_KEY: 'cle-factice' },
  });
  return dist;
}

/**
 * @param {object} o
 * @param {string} [o.page='dashboard'] - page de l'app (cp_current_page)
 * @param {number} [o.largeur=1440]
 * @param {string} [o.plan='equipe'] - plan démo (cp_demo_plan)
 * @param {boolean} [o.reel=false] - build « réel simulé »
 * @param {Function} [o.supabase] - (req, url) => réponse pour les appels Supabase (mode réel)
 * @param {object} [o.session] - session Supabase à placer dans le stockage (mode réel)
 * @param {Function} [o.avantChargement] - code exécuté dans la page avant le chargement
 */
async function ouvrir(o = {}) {
  const largeur = o.largeur || 1440;
  const dist = o.reel ? (o.distReel || construireDistReel()) : path.join(RACINE, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error(`${dist} absent : lancez npm run build.`);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: largeur, height: HAUTEURS[largeur] || 900, isMobile: largeur < 768, hasTouch: largeur < 768 });
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(String(e.message || e)));
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (u.hostname === HOTE_SUPABASE_FACTICE) {
      if (req.method() === 'OPTIONS') {
        return req.respond({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
      }
      const r = o.supabase ? o.supabase(req, u) : { status: 200, body: '[]' };
      if (r === 'panne') return req.abort('internetdisconnected');
      return req.respond({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, ...r });
    }
    if (u.origin !== ORIGIN) return req.abort();
    if (u.pathname === '/sw.js' || u.pathname === '/registerSW.js') return req.respond({ status: 404, body: '' });
    let f = path.join(dist, decodeURIComponent(u.pathname));
    if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dist, 'index.html');
    req.respond({ status: 200, contentType: MIME[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await page.evaluateOnNewDocument((p) => {
    try {
      if (!sessionStorage.getItem('navigateur-test')) {
        sessionStorage.setItem('navigateur-test', '1');
        localStorage.setItem('cp_current_page', p.page);
      }
      localStorage.setItem('cp_cookie_consent', JSON.stringify({ necessary: true, timestamp: Date.now() }));
      localStorage.setItem('batigesti_onboarding_complete', 'true');
      localStorage.setItem('cp_trial_end_modal_shown', '1');
      localStorage.setItem('cp_catalogue_onboarding_dismissed', 'true');
      localStorage.setItem('cp_demo_plan', p.plan);
      if (p.session) localStorage.setItem('sb-fauxprojet-auth-token', JSON.stringify(p.session));
    } catch { /* stockage indisponible : la page démarre sans préréglages */ }
  }, { page: o.page || 'dashboard', plan: o.plan || 'equipe', session: o.session || null });
  if (o.avantChargement) await page.evaluateOnNewDocument(o.avantChargement);
  await page.goto(ORIGIN + (o.reel ? '/' : '/?demo=true'), { waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {});
  await attendre(1500);
  return { browser, page, erreurs, attendre };
}

/** Session Supabase factice (mode réel simulé) pour un utilisateur donné. */
function sessionFactice(uid = '11111111-1111-4111-8111-111111111111', email = 'test@exemple.fr') {
  const maintenant = Math.floor(Date.now() / 1000);
  return {
    access_token: 'jeton.factice.test', token_type: 'bearer', expires_in: 3600, expires_at: maintenant + 3600, refresh_token: 'r',
    user: { id: uid, aud: 'authenticated', role: 'authenticated', email, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
  };
}

/** Clique le premier bouton visible dont le texte (ou aria-label / title) correspond. */
async function cliquer(page, texte, { dans = 'body' } = {}) {
  const ok = await page.evaluate((t, d) => {
    const racine = document.querySelector(d) || document.body;
    const b = [...racine.querySelectorAll('button, a, [role="button"]')].find((x) => {
      const r = x.getBoundingClientRect();
      const l = (x.innerText || x.getAttribute('aria-label') || x.title || '').trim();
      return r.width > 0 && r.height > 0 && (l === t || x.getAttribute('aria-label') === t || x.title === t);
    });
    if (b) b.click();
    return !!b;
  }, texte, dans);
  if (!ok) throw new Error(`Bouton « ${texte} » introuvable`);
  await attendre(500);
}

/** Saisit une valeur dans un champ (React) désigné par un sélecteur. */
async function saisir(page, selecteur, valeur) {
  const ok = await page.evaluate((s, v) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, selecteur, valeur);
  if (!ok) throw new Error(`Champ ${selecteur} introuvable`);
  await attendre(200);
}

module.exports = { ouvrir, sessionFactice, cliquer, saisir, attendre, RACINE, ORIGIN, construireDistReel };
