/* eslint-env node */
/* eslint-disable no-console -- la console est la sortie de ce script */
/**
 * Captures du site public : les vraies vues de l'app (démo riche), avec une identité manifestement fictive (D-27).
 *
 *   node scripts/site-captures.cjs [filtre] [--construire]
 *
 * Produit :
 *   public/site/*.webp              ordinateur 1440 × 900 à densité 2 (2880 × 1800), téléphone 390 × 844 à densité 3 (1170 × 2532)
 *   public/screenshots/signature.png  la page de signature du client (même vue que public/site/signature.webp)
 *   public/og-image.png             vignette de partage, 1200 × 630
 *
 * Le filtre ne retient que les captures dont le nom le contient (ex. « tel- », « signature », « og-image »).
 * dist/ est construit s'il manque ; --construire le reconstruit d'abord (à faire après chaque changement de l'app).
 * Aucune dépendance en plus : Puppeteer est celui du projet (scripts/lib/navigateur.cjs).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { pathToFileURL } = require('url');
const { ouvrir, RACINE } = require('./lib/navigateur.cjs');

const SITE = path.join(RACINE, 'public', 'site');
const QUALITE_WEBP = 82;
const POIDS_MAX = 400 * 1024;
const HAUTEURS = { 390: 844, 1440: 900 };
// Densité de pixels : 2 sur ordinateur (2880 × 1800), 3 sur téléphone (1170 × 2532)
const densite = (largeur) => (largeur < 768 ? 3 : 2);

// ─── Identité fictive (D-27) ────────────────────────────────────────────────────────────────────────────
// L'app en démo (?demo=true) lit sa fiche entreprise dans localStorage `mallettico_entreprises` (format base,
// snake_case) : on la remplace avant rechargement. forme_juridique et decennale_assureur restent renseignés,
// sinon le jeu de démonstration (src/lib/demo-data.js) juge la fiche périmée et remet « BTP Rénovation Pro ».
const ENTREPRISE_FICTIVE = {
  id: 'demo-entreprise-1',
  nom: 'Élec Exemple',
  couleur: '#12336F', // le bleu nuit du logo (charte Glacier vif) : l'aperçu des documents n'est pas orange
  forme_juridique: 'SARL',
  capital: '1000',
  adresse: '1 rue de l’Exemple',
  code_postal: '33000',
  ville: 'Bordeaux',
  // SIRET, téléphone et e-mail ne peuvent pas rester vides : l'app afficherait « L'envoi sera bloqué — profil incomplet »
  // (src/lib/profilLegal.js) sur chaque capture. Valeurs manifestement fictives, celles du compte démo (D-27) :
  // SIRET à zéros, numéro de la plage 06 39 98 réservée à la fiction par l'Arcep, adresse en example.com.
  telephone: '06 39 98 00 00',
  email: 'elec-exemple@example.com',
  siret: '00000000000000',
  code_ape: '4321A',
  // RCS et TVA intracommunautaire : une société les doit, sinon l'app signale « Paramètres » d'un point orange
  rcs: 'Bordeaux B 000 000 000',
  tva_intra: 'FR00000000000',
  iban: '',
  bic: '',
  tva_defaut: 10,
  rc_pro_assureur: 'Assureur (exemple)',
  rc_pro_numero: 'EXEMPLE',
  rc_pro_validite: '2027-12-31',
  decennale_assureur: 'Assureur (exemple)',
  decennale_numero: 'EXEMPLE',
  decennale_validite: '2027-12-31',
  is_active: true,
  created_at: new Date().toISOString(),
};

// Ce qui ne doit jamais apparaître sur une capture (texte visible de la page) : l'identité de démonstration d'origine,
// et toute trace de l'artisan réel qui fabrique l'app.
const INTERDITS = [
  /BTP Rénovation/i, /123 456 789/, /01 23 45 67 89/, /btp-renovation/i, /AXA/, /DEC-2024/, /RC-2024/, /FR76/,
  /Hugo/i, /Seguin/i, /Séguin/i, /gmail\.com/i,
];

// Les clients et chantiers de la démo (src/lib/demo-data.js) ont des noms génériques mais des adresses, e-mails et
// téléphones d'allure réelle (« 12 rue des Lilas, 75011 Paris », « j.martin@gmail.com ») : on garde les noms et on
// remplace le reste par des coordonnées manifestement fictives. Le jeu assaini est posé dans le stockage de la démo
// avant rechargement ; les valeurs d'origine rejoignent la liste des textes interdits.
const sansAccent = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
let jeuDemo = null;
async function jeuDemoFictif() {
  if (jeuDemo) return jeuDemo;
  const { DEMO_DATA } = await import(pathToFileURL(path.join(RACINE, 'src', 'lib', 'demo-data.js')).href);
  const donnees = JSON.parse(JSON.stringify(DEMO_DATA));
  const originaux = [];
  const adresses = {};
  donnees.clients.forEach((c, i) => {
    originaux.push(c.adresse, c.email, c.telephone);
    adresses[c.id] = `${11 + i} rue de l’Exemple, 33000 Bordeaux`;
    c.adresse = adresses[c.id];
    c.email = `${sansAccent(c.prenom)}.${sansAccent(c.nom)}@example.com`;
    c.telephone = `06 39 98 00 ${String(i + 1).padStart(2, '0')}`; // plage 06 39 98 : réservée à la fiction (Arcep)
  });
  donnees.chantiers.forEach((ch) => {
    if (adresses[ch.client_id]) { originaux.push(ch.adresse); ch.adresse = adresses[ch.client_id]; }
  });
  jeuDemo = { donnees, originaux: originaux.filter(Boolean) };
  return jeuDemo;
}

// ─── Gestes ──────────────────────────────────────────────────────────────────────────────────────────────
// Clique d'abord un bouton visible au texte exact, sinon le plus petit élément visible qui contient le texte.
const cliquer = (page, texte) => page.evaluate((t) => {
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const bouton = [...document.querySelectorAll('button')].filter(visible).find((b) => b.innerText.trim() === t);
  if (bouton) { bouton.click(); return true; }
  const candidats = [...document.querySelectorAll('button, a, [role="button"], li, article, div, span, p')]
    .filter(visible).filter((el) => (el.innerText || '').includes(t));
  candidats.sort((a, b) => a.innerText.length - b.innerText.length);
  const el = candidats[0];
  if (!el) return false;
  el.click();
  return true;
}, texte);

// Construction du lot « Mise aux normes du tableau électrique » dans l'éditeur de devis
const GESTES_LOT = [
  ['Nouveau devis'],
  ['Parcourir les 17 métiers chiffrés'],
  ['Électricité\n7 lots types'],
  ['Mise aux normes du tableau électrique'],
  ['__echap'],
];

// ─── Les vues de l'app ───────────────────────────────────────────────────────────────────────────────────
// Sur téléphone l'éditeur s'ouvre depuis l'accueil, sur ordinateur depuis la page des devis.
const VUES = [
  { nom: 'ordi-accueil', page: 'dashboard', largeur: 1440 },
  { nom: 'ordi-devis-lots', page: 'devis', largeur: 1440, gestes: GESTES_LOT },
  { nom: 'ordi-devis-signe', page: 'devis', largeur: 1440, gestes: [['DEV-2026-00007']] },
  { nom: 'ordi-facture', page: 'devis', largeur: 1440, gestes: [['FAC-2026-00003']] },
  { nom: 'tel-accueil', page: 'dashboard', largeur: 390 },
  { nom: 'tel-devis-lots', page: 'dashboard', largeur: 390, gestes: GESTES_LOT },
  { nom: 'tel-facture', page: 'devis', largeur: 390, gestes: [['FAC-2026-00003']] },
];

// ─── Écriture des images ─────────────────────────────────────────────────────────────────────────────────
const bilan = [];

/** Enregistre une capture en WebP ; si elle dépasse 400 Ko, la qualité baisse pour ce fichier seul. */
async function ecrireWebp(page, nom) {
  const fichier = path.join(SITE, `${nom}.webp`);
  let qualite = QUALITE_WEBP;
  let octets = await page.screenshot({ type: 'webp', quality: qualite });
  while (octets.length > POIDS_MAX && qualite > 40) {
    qualite -= 6;
    octets = await page.screenshot({ type: 'webp', quality: qualite });
  }
  fs.writeFileSync(fichier, octets);
  bilan.push({ nom: `${nom}.webp`, ko: Math.round(octets.length / 1024), qualite });
  return octets;
}

/** Contrôle le texte visible : l'identité fictive est là, aucune donnée de l'identité d'origine ni de l'artisan réel. */
async function controler(page, nom, { attendu = 'Élec Exemple' } = {}) {
  const texte = await page.evaluate(() => {
    // Le contenu des aperçus de document (iframes sans script) compte aussi
    const iframes = [...document.querySelectorAll('iframe')].map((f) => {
      try { return f.contentDocument?.body?.innerText || ''; } catch { return ''; }
    });
    return [document.body.innerText, ...iframes].join('\n');
  });
  const { originaux } = await jeuDemoFictif();
  const trouves = [...INTERDITS.filter((re) => re.test(texte)).map(String), ...originaux.filter((o) => texte.includes(o))];
  if (!texte.includes(attendu)) trouves.push(`« ${attendu} » absent`);
  if (trouves.length) throw new Error(`Capture ${nom} refusée : ${trouves.join(', ')}`);
}

async function capturerVue(v) {
  const { browser, page, attendre } = await ouvrir({ page: v.page, largeur: v.largeur });
  try {
    await page.setViewport({ width: v.largeur, height: HAUTEURS[v.largeur], deviceScaleFactor: densite(v.largeur),
      isMobile: v.largeur < 768, hasTouch: v.largeur < 768 });
    // Pas d'invitation à installer l'app par-dessus les captures ; identité fictive posée avant le rechargement
    const { donnees } = await jeuDemoFictif();
    await page.evaluate((ligne, jeu) => {
      localStorage.setItem('pwa-install-dismissed', String(Date.now()));
      localStorage.setItem('mallettico_demo_data', JSON.stringify(jeu));
      localStorage.setItem('mallettico_entreprises', JSON.stringify([ligne]));
      localStorage.setItem('mallettico_entreprise_active_id', ligne.id);
      localStorage.setItem('mallettico_entreprise_migrated', 'true');
      localStorage.removeItem('cp_entreprise'); // ancienne fiche (legacy), recréée depuis la fiche active
    }, ENTREPRISE_FICTIVE, donnees);
    await page.reload({ waitUntil: 'networkidle0' }).catch(() => {});
    await attendre(1500);
    for (const [texte] of v.gestes || []) {
      if (texte === '__echap') { await page.keyboard.press('Escape'); await attendre(600); continue; }
      const ok = await cliquer(page, texte);
      if (!ok) throw new Error(`(${v.nom}) geste introuvable : ${texte}`);
      await attendre(1200);
    }
    // Notifications passagères masquées, ainsi que l'adresse du compte de démonstration dans le menu latéral
    await page.evaluate(() => {
      document.querySelectorAll('[role="status"]').forEach((e) => { e.style.display = 'none'; });
      document.querySelectorAll('aside *, nav *, header *').forEach((e) => {
        if (e.children.length === 0 && (e.textContent || '').trim() === 'demo@mallettico.fr') e.style.display = 'none';
      });
    });
    await attendre(400);
    await controler(page, v.nom);
    await ecrireWebp(page, v.nom);
    console.log('ok', v.nom);
  } finally {
    await browser.close();
  }
}

// ─── Page de signature du client ─────────────────────────────────────────────────────────────────────────
// Elle n'a pas de mode démo : on ouvre le build « réel simulé » et on répond à la place de la base.
const JETON_FICTIF = '5f0c1a7e-3b9d-4c2a-8e6f-1d2b3c4a5e6f';
// Les 7 lignes du lot « Mise aux normes du tableau électrique » de la bibliothèque (même total que ordi-devis-lots : 1 892 € HT)
const LOT = [
  ['Dépose de l\'ancien tableau et repérage des circuits', 1, 'forfait', 220],
  ['Fourniture et pose de coffret 2 rangées avec porte', 1, 'u', 340],
  ['Fourniture et pose d\'interrupteur différentiel 40 A type AC ou A', 4, 'u', 92],
  ['Fourniture et pose de disjoncteur divisionnaire', 14, 'u', 26],
  ['Fourniture et pose de parafoudre type 2', 1, 'u', 210],
  ['Raccordement, repérage des circuits et étiquetage', 1, 'forfait', 240],
  ['Contrôle de continuité de terre et essais différentiels', 1, 'forfait', 150],
];
const LIGNES_SIGNATURE = LOT.map(([description, quantite, unite, pu], i) => ({
  id: `l${i + 1}`, description, quantite, unite, prixUnitaire: pu, prix_unitaire: pu, tva: 10, tvaRate: 10,
}));

function devisPourSignature() {
  const totalHt = LIGNES_SIGNATURE.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const totalTva = Math.round(totalHt * 0.1 * 100) / 100;
  const aujourdhui = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const validite = new Date(aujourdhui.getTime() + 30 * 86400000);
  return {
    devis: {
      id: '00000000-0000-4000-8000-0000000000d1', numero: 'DEV-2026-00012', type: 'devis', statut: 'envoye',
      date: iso(aujourdhui), date_validite: iso(validite), validite: 30,
      objet: 'Mise aux normes du tableau électrique',
      lignes: LIGNES_SIGNATURE, sections: [], conditions: '', remise_globale: 0, tva_rate: 10,
      total_ht: totalHt, total_tva: totalTva, total_ttc: Math.round((totalHt + totalTva) * 100) / 100,
      acompte_pct: 30, acompte_percent: 30, acompte_montant: null, travaux_urgents: false, already_signed: false,
    },
    // M. Martin : ni e-mail ni téléphone, rien qui mène à une vraie personne
    client: { nom: 'Martin', prenom: 'M.', email: '', telephone: '', adresse: '2 rue de l’Exemple, 33000 Bordeaux', entreprise: '', categorie: 'particulier' },
    chantier: null,
    entreprise: {
      nom: ENTREPRISE_FICTIVE.nom, forme_juridique: ENTREPRISE_FICTIVE.forme_juridique, capital: ENTREPRISE_FICTIVE.capital,
      siret: ENTREPRISE_FICTIVE.siret, code_ape: ENTREPRISE_FICTIVE.code_ape, rcs: ENTREPRISE_FICTIVE.rcs, tva_intra: ENTREPRISE_FICTIVE.tva_intra,
      adresse: ENTREPRISE_FICTIVE.adresse, ville: ENTREPRISE_FICTIVE.ville, code_postal: ENTREPRISE_FICTIVE.code_postal,
      telephone: ENTREPRISE_FICTIVE.telephone, email: ENTREPRISE_FICTIVE.email, site_web: '', logo: '', couleur: '#12336F',
      iban: '', bic: '', delai_paiement: 30, validite_devis: 30,
      decennale_assureur: ENTREPRISE_FICTIVE.decennale_assureur, decennale_numero: ENTREPRISE_FICTIVE.decennale_numero,
      decennale_validite: ENTREPRISE_FICTIVE.decennale_validite,
      rc_pro_assureur: ENTREPRISE_FICTIVE.rc_pro_assureur, rc_pro_numero: ENTREPRISE_FICTIVE.rc_pro_numero,
      rc_pro_validite: ENTREPRISE_FICTIVE.rc_pro_validite,
    },
  };
}

async function capturerSignature() {
  const reponse = (corps) => ({ status: 200, body: JSON.stringify(corps) });
  const { browser, page, attendre } = await ouvrir({
    reel: true, largeur: 1440, chemin: `/devis/signer/${JETON_FICTIF}`,
    // La seule réponse utile est celle du devis ; tout le reste (autres appels) reçoit une réponse vide et neutre
    supabase: (req, u) => (u.pathname === '/rest/v1/rpc/get_devis_for_signature' ? reponse(devisPourSignature()) : reponse([])),
  });
  try {
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await attendre(1500);
    await page.evaluate(() => document.querySelectorAll('[role="status"]').forEach((e) => { e.style.display = 'none'; }));
    await controler(page, 'signature');
    await ecrireWebp(page, 'signature');
    // Même vue en PNG, au nom lu par les pages de fonctionnalités
    const png = await page.screenshot({ type: 'png' });
    fs.writeFileSync(path.join(RACINE, 'public', 'screenshots', 'signature.png'), png);
    bilan.push({ nom: 'screenshots/signature.png', ko: Math.round(png.length / 1024), qualite: 'png' });
    console.log('ok signature');
  } finally {
    await browser.close();
  }
}

// ─── Vignette de partage (1200 × 630) ────────────────────────────────────────────────────────────────────
async function capturerOg() {
  const source = path.join(SITE, 'ordi-devis-lots.webp');
  if (!fs.existsSync(source)) throw new Error('og-image : public/site/ordi-devis-lots.webp manque, capturez-le d’abord');
  const logo = fs.readFileSync(path.join(RACINE, 'public', 'icon.svg')).toString('base64');
  const capture = fs.readFileSync(source).toString('base64');
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; margin: 0; }
    body { width: 1200px; height: 630px; background: #0D2E6C; color: #fff; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; position: relative; overflow: hidden; }
    .lueur { position: absolute; right: -120px; top: -160px; width: 640px; height: 640px; border-radius: 50%; background: radial-gradient(circle, rgba(191,242,255,.28), rgba(191,242,255,0) 68%); }
    .texte { position: absolute; left: 64px; top: 0; bottom: 0; width: 440px; display: flex; flex-direction: column; justify-content: center; }
    .marque { display: flex; align-items: center; gap: 18px; margin-bottom: 30px; }
    .marque img { width: 72px; height: 72px; }
    .marque span { font-size: 52px; font-weight: 800; letter-spacing: -1px; }
    .accroche { font-size: 30px; line-height: 1.28; font-weight: 600; color: #DCEFFB; }
    .cadre { position: absolute; left: 520px; top: 115px; width: 640px; border-radius: 22px; overflow: hidden; background: #fff;
      box-shadow: 0 30px 70px rgba(2, 10, 30, .55); border: 1px solid rgba(255,255,255,.25); }
    .cadre img { display: block; width: 100%; }
  </style></head><body>
    <div class="lueur"></div>
    <div class="texte">
      <div class="marque"><img alt="" src="data:image/svg+xml;base64,${logo}"><span>Mallettico</span></div>
      <p class="accroche">Devis, factures et relances pour les artisans du bâtiment.</p>
    </div>
    <div class="cadre"><img alt="" src="data:image/webp;base64,${capture}"></div>
  </body></html>`;
  const { browser, page, attendre } = await ouvrir({ page: 'dashboard', largeur: 1440 });
  try {
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' }).catch(() => {});
    await attendre(500);
    await page.screenshot({ path: path.join(RACINE, 'public', 'og-image.png'), type: 'png' });
    bilan.push({ nom: 'og-image.png', ko: Math.round(fs.statSync(path.join(RACINE, 'public', 'og-image.png')).size / 1024), qualite: 'png' });
    console.log('ok og-image');
  } finally {
    await browser.close();
  }
}

// ─── Programme ───────────────────────────────────────────────────────────────────────────────────────────
(async () => {
  const args = process.argv.slice(2);
  const construire = args.includes('--construire');
  const filtre = args.find((a) => !a.startsWith('--'));
  const voulu = (nom) => !filtre || nom.includes(filtre);

  if (construire || !fs.existsSync(path.join(RACINE, 'dist', 'index.html'))) {
    console.log('Construction de dist/ (npm run build)…');
    execSync('npm run build', { cwd: RACINE, stdio: 'ignore' });
  }
  fs.mkdirSync(SITE, { recursive: true });

  for (const v of VUES.filter((x) => voulu(x.nom))) await capturerVue(v);
  if (voulu('signature')) await capturerSignature();
  if (voulu('og-image')) await capturerOg();

  console.table(bilan);
  const trop = bilan.filter((b) => b.nom.endsWith('.webp') && b.ko * 1024 > POIDS_MAX);
  if (trop.length) throw new Error(`WebP au-dessus de 400 Ko : ${trop.map((b) => b.nom).join(', ')}`);
})().catch((e) => { console.error(e); process.exit(1); });
