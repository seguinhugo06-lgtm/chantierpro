/* eslint-env node */
/* eslint-disable no-console -- la console est la sortie de ce script */
/**
 * Captures du site public : les vraies vues de l'app (démo riche), avec une identité manifestement fictive (D-27).
 *
 *   node scripts/site-captures.cjs [filtre] [--construire]
 *
 * Produit :
 *   public/site/*.webp              ordinateur 1440 × 900 à densité 2 (2880 × 1800), téléphone 390 × 844 à densité 3 (1170 × 2532)
 *   public/og-image.png             vignette de partage, 1200 × 630
 * Les pages de fonctionnalités (featuresContent.js) lisent ces WebP ; plus rien n'est écrit dans public/screenshots/ (ses
 * anciennes captures montraient une entreprise de démonstration, des adresses gmail et, pour la signature, un compte réel).
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
  // L'équipe (page Équipe) : e-mails sur un vrai nom de domaine et numéros hors de la plage de fiction
  (donnees.equipe || []).forEach((e, i) => {
    originaux.push(e.email, e.telephone);
    e.email = `${sansAccent(e.prenom)}.${sansAccent(e.nom)}@example.com`;
    e.telephone = `06 39 98 01 ${String(i + 1).padStart(2, '0')}`;
  });
  // Les échanges d'un chantier gardent l'adresse du client à qui ils ont été envoyés
  const courriels = Object.fromEntries(DEMO_DATA.clients.map((c, i) => [c.email, donnees.clients[i].email]));
  (donnees.echanges || []).forEach((ech) => {
    if (ech.destinataire && courriels[ech.destinataire]) ech.destinataire = courriels[ech.destinataire];
  });
  semaineDeTravailFictive(donnees);
  jeuDemo = { donnees, originaux: originaux.filter(Boolean) };
  return jeuDemo;
}

/**
 * Une semaine de travail fictive (relecture DA-5) : les pointages de la démo datent de janvier, la page Équipe
 * montrait « 0 h pointées » et le planning « 0 tâches ». Le script ajoute, dans le jeu posé avant le chargement (jamais
 * dans src/lib/demo-data.js), des pointages de la semaine en cours, du lundi à aujourd'hui, et des tâches à faire sur
 * les chantiers de la démo. Données fictives, comme le reste des captures.
 */
function semaineDeTravailFictive(donnees) {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const aujourdhui = new Date();
  const lundi = new Date(aujourdhui);
  lundi.setDate(aujourdhui.getDate() - ((aujourdhui.getDay() + 6) % 7));
  const jours = [];
  for (const d = new Date(lundi); d <= aujourdhui; d.setDate(d.getDate() + 1)) jours.push(iso(d));
  // Qui, où, combien d'heures par jour (employés et chantiers du jeu de démonstration)
  const equipes = [['e1', 'ch1', 8], ['e2', 'ch1', 7.5], ['e3', 'ch8', 7], ['e4', 'ch2', 8]];
  const pointages = jours.flatMap((jour, j) => equipes.map(([employeId, chantierId, heures], k) => ({
    id: `p-semaine-${j}-${k}`, employeId, chantierId, date: jour, heures, approuve: j < jours.length - 1,
  })));
  donnees.pointages = [...(donnees.pointages || []), ...pointages];
  const dans = (n) => { const d = new Date(aujourdhui); d.setDate(d.getDate() + n); return iso(d); };
  const maintenant = aujourdhui.toISOString();
  const taches = [
    ['Commander le coffret 2 rangées et les disjoncteurs', 'haute', 0, 'ch8'],
    ['Passer les gaines de la cuisine avant le placo', 'haute', 1, 'ch1'],
    ['Relever les cotes de la salle de bain', 'moyenne', 1, 'ch2'],
    ['Rappeler M. Dubois pour la date de pose', 'moyenne', 2, 'ch8'],
    ['Préparer l\'attestation de TVA réduite', 'basse', 3, 'ch8'],
    ['Poser les prises et interrupteurs du séjour', 'basse', 4, 'ch1'],
  ].map(([text, priority, jour, chantier], i) => ({
    id: `t-semaine-${i}`, text, notes: null, priority, due_date: dans(jour), due_time: null, category: null,
    chantier_id: chantier, client_id: null, is_done: false, done_at: null, status: 'a_faire', position: i,
    subtasks: [], recurrence: null, sort_order: i, assigned_to: null, created_at: maintenant, updated_at: maintenant,
  }));
  donnees.memos = [...(donnees.memos || []), ...taches];
}

// ─── Trésorerie fictive ──────────────────────────────────────────────────────────────────────────────────
// Le solde négatif des anciennes captures venait d'un défaut de l'app, corrigé le 20 oct. 2026 (src/hooks/useTresorerie.js
// relisait ses réglages trop tard : le solde de départ de la démo, 24 500 €, repartait à 0 € à chaque chargement) ; la
// démo est positive depuis. Les captures posent tout de même leur propre solde de départ fictif, au premier jour du mois
// en cours (avant le chargement, la démo ne remplace pas une valeur déjà là) : la capture des finances ne dépend ni de
// la date ni du jeu de démonstration, et le solde du jour reste celui que l'app calcule avec les encaissements et
// dépenses fictifs du mois. Aucune valeur n'est affirmée ailleurs que sur ces captures, légendées « données fictives ».
const debutDuMois = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const TRESORERIE_FICTIVE = () => ({ seuilAlerte: 5000, soldeInitial: 14200, soldeDate: debutDuMois() });

// ─── Gestes ──────────────────────────────────────────────────────────────────────────────────────────────
// Clique d'abord un bouton visible au texte exact, sinon le plus petit élément visible qui contient le texte.
// Un élément au premier plan passe avant un élément caché par un calque : l'éditeur de devis couvre la page des devis,
// qui contient aussi « Philippe Dubois » ; le clic partait derrière l'éditeur et le client n'était jamais choisi.
const cliquer = (page, texte) => page.evaluate((t) => {
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const auPremierPlan = (el) => {
    const r = el.getBoundingClientRect();
    const dessus = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!dessus && (dessus === el || el.contains(dessus) || dessus.contains(el));
  };
  const bouton = [...document.querySelectorAll('button')].filter(visible).find((b) => b.innerText.trim() === t);
  if (bouton) { bouton.click(); return true; }
  const candidats = [...document.querySelectorAll('button, a, [role="button"], li, article, div, span, p')]
    .filter(visible).filter((el) => (el.innerText || '').includes(t));
  const devant = new Set(candidats.filter(auPremierPlan));
  candidats.sort((a, b) => (devant.has(b) - devant.has(a)) || (a.innerText.length - b.innerText.length));
  const el = candidats[0];
  if (!el) return false;
  el.click();
  return true;
}, texte);

// Construction du lot « Mise aux normes du tableau électrique » dans l'éditeur de devis, pour un client et un chantier
// de la démo (relecture DA-5 : un devis sans client se lisait comme un brouillon inachevé, jusque dans l'image de
// partage)
const GESTES_LOT = [
  ['Nouveau devis'],
  ['Parcourir les 17 métiers chiffrés'],
  ['Électricité\n7 lots types'],
  ['Mise aux normes du tableau électrique'],
  ['__echap'],
  ['Choisir un client'],
  // La liste n'affiche que les premiers clients : la recherche ramène celui-ci à l'écran
  ['__taper', 'Dubois'],
  ['Philippe Dubois'],
  // Le chantier se choisit comme le client (sélecteur de l'éditeur, audit UX du 20 oct. 2026), plus dans une liste native
  ['Aucun — adresse du client'],
  ['Rénovation appartement Dubois'],
];

// ─── Les vues de l'app ───────────────────────────────────────────────────────────────────────────────────
// Sur téléphone l'éditeur s'ouvre depuis l'accueil, sur ordinateur depuis la page des devis.
// Pages de fonctionnalités (/fonctionnalites, /fonctionnalites/:slug, /ressources) : chantier, catalogue, clients,
// planning, équipe, trésorerie et relances, en plus des vues du premier écran et du cycle.
// `vignette` : la vignette recadrée de la zone utile, sans la barre latérale (relecture DA-6 : l'écran entier réduit dans
// une carte de 310 px rendait un texte de 2 px). `x`, `y` : son coin haut gauche en px CSS ; `largeur` : sa largeur en px
// CSS, 720 par défaut, un peu plus quand il le faut pour qu'aucun texte ne soit tranché par un bord (contrôlé avant
// l'écriture). Le fichier fait toujours 1440 × 900 px : 720 × 450 px CSS à densité 2, ou la zone plus large réduite.
const TAILLE_VIGNETTE = { width: 720, height: 450 };
// La largeur est un multiple de 8 : la hauteur (5/8 de la largeur) tombe juste, et la vignette réduite fait exactement
// 1440 × 900 px (Puppeteer arrondit la découpe au pixel : une largeur de 852 donnait 901 px de haut)
const cadreVignette = ({ x, y, largeur = TAILLE_VIGNETTE.width }) => {
  if (largeur % 8) throw new Error(`Largeur de vignette ${largeur} : un multiple de 8 est attendu`);
  return {
    x, y, width: largeur, height: (largeur * TAILLE_VIGNETTE.height) / TAILLE_VIGNETTE.width,
    scale: TAILLE_VIGNETTE.width / largeur,
  };
};

/**
 * Les textes visibles qu'un bord de la découpe tranche (une ligne à moitié dedans). Les cadres de document (iframes) sont
 * lus aussi ; un texte caché sous un calque (la page des devis sous l'éditeur) ne compte pas.
 */
const textesTranches = (page, cadre) => page.evaluate((c) => {
  const tranches = [];
  // La partie visible d'une boîte : un parent qui ne laisse pas déborder (texte tronqué par « … ») la rogne déjà
  const rogner = (el, r) => {
    let { left: g, right: d, top: h, bottom: b } = r;
    for (let a = el; a && a !== a.ownerDocument.body; a = a.parentElement) {
      const s = a.ownerDocument.defaultView.getComputedStyle(a);
      if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const p = a.getBoundingClientRect();
      if (s.overflowX !== 'visible') { g = Math.max(g, p.left); d = Math.min(d, p.right); }
      if (s.overflowY !== 'visible') { h = Math.max(h, p.top); b = Math.min(b, p.bottom); }
    }
    return { left: g, right: d, top: h, bottom: b, width: d - g, height: b - h };
  };
  const lire = (doc, dx, dy) => {
    const marcheur = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const plage = doc.createRange();
    for (let n = marcheur.nextNode(); n; n = marcheur.nextNode()) {
      if (!n.textContent.trim() || !n.parentElement) continue;
      plage.selectNodeContents(n);
      for (const brute of plage.getClientRects()) {
        const r = rogner(n.parentElement, brute);
        const g = r.left + dx; const d = r.right + dx; const h = r.top + dy; const b = r.bottom + dy;
        if (r.width < 1 || r.height < 1 || d <= c.x || g >= c.x + c.width || b <= c.y || h >= c.y + c.height) continue;
        // Au premier plan ? (le point testé est dans la partie visible de la découpe)
        const px = (Math.max(g, c.x) + Math.min(d, c.x + c.width)) / 2 - dx;
        const py = (Math.max(h, c.y) + Math.min(b, c.y + c.height)) / 2 - dy;
        const dessus = doc.elementFromPoint(px, py);
        if (!dessus || !(dessus === n.parentElement || n.parentElement.contains(dessus) || dessus.contains(n.parentElement))) continue;
        // Le texte et sa boîte (x de gauche à droite, y de haut en bas, px CSS), pour corriger le cadre
        const boite = `${Math.round(g)}-${Math.round(d)} × ${Math.round(h)}-${Math.round(b)}`;
        if (g < c.x - 1 || d > c.x + c.width + 1 || h < c.y - 1 || b > c.y + c.height + 1) tranches.push(`${n.textContent.trim().slice(0, 40)} [${boite}]`);
      }
    }
  };
  lire(document, 0, 0);
  for (const f of document.querySelectorAll('iframe')) {
    let doc = null;
    try { doc = f.contentDocument; } catch { doc = null; }
    if (!doc?.body) continue;
    const r = f.getBoundingClientRect();
    lire(doc, r.left + f.clientLeft, r.top + f.clientTop);
  }
  return [...new Set(tranches)];
}, cadre);

/**
 * Écrit la vignette si aucun texte n'est tranché par un bord ; sinon la refuse (le programme échoue à la fin, avec la
 * liste de toutes les vignettes refusées et de leurs textes tranchés).
 */
const vignettesRefusees = [];
async function ecrireVignette(page, nom, vignette) {
  const cadre = cadreVignette(vignette);
  const tranches = await textesTranches(page, cadre);
  if (tranches.length) { vignettesRefusees.push(`${nom} : ${tranches.join(' | ')}`); return; }
  await ecrireWebp(page, nom, cadre);
}
const VUES = [
  { nom: 'ordi-accueil', page: 'dashboard', largeur: 1440, vignette: { x: 340, y: 64 } },
  { nom: 'ordi-devis-lots', page: 'devis', largeur: 1440, gestes: GESTES_LOT, vignette: { x: 360, y: 60 } },
  { nom: 'ordi-facture', page: 'devis', largeur: 1440, gestes: [['FAC-2026-00003']], vignette: { x: 268, y: 72, largeur: 816 } },
  { nom: 'ordi-chantier', page: 'chantiers', largeur: 1440, gestes: [['Rénovation cuisine Dupont']], vignette: { x: 268, y: 72, largeur: 904 } },
  { nom: 'ordi-catalogue', page: 'catalogue', largeur: 1440, vignette: { x: 268, y: 72, largeur: 744 } },
  { nom: 'ordi-clients', page: 'clients', largeur: 1440, vignette: { x: 268, y: 64, largeur: 856 } },
  { nom: 'ordi-planning', page: 'planning', largeur: 1440, vignette: { x: 268, y: 234, largeur: 832 } },
  { nom: 'ordi-equipe', page: 'equipe', largeur: 1440, vignette: { x: 268, y: 80, largeur: 792 } },
  // La page Finances s'ouvre défilée vers le bas : `enHaut` la ramène en haut avant la capture
  { nom: 'ordi-tresorerie', page: 'finances', largeur: 1440, enHaut: true, vignette: { x: 268, y: 64 } },
  // Relances : réglages › Documents › Relances, l'interrupteur général allumé (il est éteint dans la démo)
  { nom: 'ordi-relances', page: 'settings', largeur: 1440, gestes: [['Documents'], ['Relances'], ['__selecteur', '[role="switch"][aria-checked="false"]']], enHaut: true, vignette: { x: 268, y: 330, largeur: 784 } },
  { nom: 'tel-accueil', page: 'dashboard', largeur: 390 },
  { nom: 'tel-devis-lots', page: 'dashboard', largeur: 390, gestes: GESTES_LOT },
  { nom: 'tel-facture', page: 'devis', largeur: 390, gestes: [['FAC-2026-00003']] },
  // Les mêmes vues au téléphone, pour les pages de fonctionnalités lues sur un téléphone : une capture d'ordinateur
  // réduite à la largeur d'un téléphone ne se lit plus (texte de 3 px)
  { nom: 'tel-chantier', page: 'chantiers', largeur: 390, gestes: [['Rénovation cuisine Dupont']] },
  { nom: 'tel-catalogue', page: 'catalogue', largeur: 390 },
  { nom: 'tel-clients', page: 'clients', largeur: 390 },
  { nom: 'tel-planning', page: 'planning', largeur: 390 },
  { nom: 'tel-equipe', page: 'equipe', largeur: 390 },
  { nom: 'tel-tresorerie', page: 'finances', largeur: 390, enHaut: true },
  // Au téléphone, le réglage des relances est sous le menu des paramètres : la page est descendue jusqu'à son titre
  { nom: 'tel-relances', page: 'settings', largeur: 390, gestes: [['Documents'], ['Relances'], ['__selecteur', '[role="switch"][aria-checked="false"]'], ['__defiler', 'Relances automatiques']] },
];

// ─── Écriture des images ─────────────────────────────────────────────────────────────────────────────────
const bilan = [];

/** Enregistre une capture en WebP ; si elle dépasse 400 Ko, la qualité baisse pour ce fichier seul. */
async function ecrireWebp(page, nom, clip) {
  const fichier = path.join(SITE, `${nom}.webp`);
  let qualite = QUALITE_WEBP;
  let octets = await page.screenshot({ type: 'webp', quality: qualite, ...(clip ? { clip } : {}) });
  while (octets.length > POIDS_MAX && qualite > 40) {
    qualite -= 6;
    octets = await page.screenshot({ type: 'webp', quality: qualite, ...(clip ? { clip } : {}) });
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
    await page.evaluate((ligne, jeu, tresorerie) => {
      localStorage.setItem('pwa-install-dismissed', String(Date.now()));
      localStorage.setItem('mallettico_demo_data', JSON.stringify(jeu));
      localStorage.setItem('cp_tresorerie_settings', JSON.stringify(tresorerie));
      localStorage.setItem('mallettico_entreprises', JSON.stringify([ligne]));
      localStorage.setItem('mallettico_entreprise_active_id', ligne.id);
      localStorage.setItem('mallettico_entreprise_migrated', 'true');
      localStorage.removeItem('cp_entreprise'); // ancienne fiche (legacy), recréée depuis la fiche active
    }, ENTREPRISE_FICTIVE, donnees, TRESORERIE_FICTIVE());
    await page.reload({ waitUntil: 'networkidle0' }).catch(() => {});
    await attendre(1500);
    for (const [texte, selecteur] of v.gestes || []) {
      if (texte === '__echap') { await page.keyboard.press('Escape'); await attendre(600); continue; }
      // Saisie au clavier dans le champ qui a le focus (la recherche du sélecteur de client s'ouvre focalisée)
      if (texte === '__taper') { await page.keyboard.type(selecteur, { delay: 30 }); await attendre(600); continue; }
      if (texte === '__choisir') {
        // La liste déroulante qui propose cette option : l'option est choisie comme au doigt (événement « change »)
        const ok = await page.evaluate((t) => {
          const liste = [...document.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.textContent.trim() === t));
          if (!liste) return false;
          const option = [...liste.options].find((o) => o.textContent.trim() === t);
          Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(liste, option.value);
          liste.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }, selecteur);
        if (!ok) throw new Error(`(${v.nom}) option introuvable : ${selecteur}`);
        await attendre(800);
        continue;
      }
      if (texte === '__defiler') {
        // Le plus petit élément visible au texte exact passe en haut de l'écran, sous la barre de l'app
        const ok = await page.evaluate((t) => {
          const el = [...document.querySelectorAll('h1, h2, h3, h4, p, span')].find((x) => x.innerText?.trim() === t && x.getClientRects().length > 0);
          if (!el) return false;
          // Juste sous la barre de l'app (sa hauteur réelle) : avec un décalage fixe de 88 px, le bas de la carte
          // précédente (« Équipe ») apparaissait coupé à moitié en haut de la capture (relecture DA-23)
          const barre = document.querySelector('header')?.getBoundingClientRect().bottom || 64;
          const haut = el.getBoundingClientRect().top + window.scrollY - barre - 16;
          window.scrollTo({ top: haut, behavior: 'instant' });
          return true;
        }, selecteur);
        if (!ok) throw new Error(`(${v.nom}) texte introuvable pour le défilement : ${selecteur}`);
        await attendre(800);
        continue;
      }
      if (texte === '__selecteur') {
        const ok = await page.evaluate((s) => { const el = document.querySelector(s); el?.click(); return !!el; }, selecteur);
        if (!ok) throw new Error(`(${v.nom}) élément introuvable : ${selecteur}`);
        await attendre(1200);
        continue;
      }
      const ok = await cliquer(page, texte);
      if (!ok) throw new Error(`(${v.nom}) geste introuvable : ${texte}`);
      await attendre(1200);
    }
    if (v.enHaut) {
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        document.querySelectorAll('*').forEach((el) => { if (el.scrollTop > 0) el.scrollTop = 0; });
      });
      await attendre(600);
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
    // La vignette recadrée de l'écran d'ordinateur (relecture DA-6) : la zone utile, sans la barre latérale
    if (v.vignette) await ecrireVignette(page, `vignette-${v.nom.replace(/^ordi-/, '')}`, v.vignette);
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

/** La page de signature, sur ordinateur (`signature`) ou sur téléphone (`tel-signature`). */
// Vignette : la barre « Signer ce devis » et le haut du document, sur toute sa largeur
const VIGNETTE_SIGNATURE = { x: 300, y: 0, largeur: 840 };
async function capturerSignature({ nom = 'signature', largeur = 1440 } = {}) {
  const reponse = (corps) => ({ status: 200, body: JSON.stringify(corps) });
  const { browser, page, attendre } = await ouvrir({
    reel: true, largeur, chemin: `/devis/signer/${JETON_FICTIF}`,
    // La seule réponse utile est celle du devis ; tout le reste (autres appels) reçoit une réponse vide et neutre
    supabase: (req, u) => (u.pathname === '/rest/v1/rpc/get_devis_for_signature' ? reponse(devisPourSignature()) : reponse([])),
  });
  try {
    await page.setViewport({ width: largeur, height: HAUTEURS[largeur], deviceScaleFactor: densite(largeur), isMobile: largeur < 768, hasTouch: largeur < 768 });
    await attendre(1500);
    await page.evaluate(() => document.querySelectorAll('[role="status"]').forEach((e) => { e.style.display = 'none'; }));
    if (largeur < 768) {
      // Au téléphone, le tableau du devis dépasse de 11 px le cadre du document, qui défile en largeur (constaté le
      // 20 oct. 2026, la page de signature n'est pas modifiée ici) : la capture montre le document défilé jusqu'au
      // bout, la colonne « Total HT » entière, comme le verrait le client qui fait glisser le document.
      const cadre = await (await page.$('iframe'))?.contentFrame();
      await cadre?.evaluate(() => window.scrollTo({ left: document.documentElement.scrollWidth }));
      await attendre(300);
    }
    await controler(page, nom);
    await ecrireWebp(page, nom);
    if (largeur >= 768) await ecrireVignette(page, 'vignette-signature', VIGNETTE_SIGNATURE);
    console.log('ok', nom);
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
  if (voulu('tel-signature')) await capturerSignature({ nom: 'tel-signature', largeur: 390 });
  if (voulu('og-image')) await capturerOg();

  console.table(bilan);
  const trop = bilan.filter((b) => b.nom.endsWith('.webp') && b.ko * 1024 > POIDS_MAX);
  if (trop.length) throw new Error(`WebP au-dessus de 400 Ko : ${trop.map((b) => b.nom).join(', ')}`);
  if (vignettesRefusees.length) throw new Error(`Vignettes refusées, un bord tranche du texte :\n  ${vignettesRefusees.join('\n  ')}`);
})().catch((e) => { console.error(e); process.exit(1); });
