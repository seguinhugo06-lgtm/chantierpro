// Site public (refonte d'octobre 2026, spec docs/superpowers/specs/2026-10-19-site-refonte-design.md).
// Le site n'apparaît qu'hors démo : mode « réel simulé », Supabase répond vide (visiteur non connecté).
// Chaque tâche de la refonte ajoute ici les parcours des sections qu'elle refait.
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { plansDuSite, charger } = require('../lib/plans.cjs');

const json = (corps, status = 200) => ({ status, body: JSON.stringify(corps) });

const TITRE = "L’administratif du chantier, rangé dans une mallette.";
// Typographie fine du site (src/components/landing/site/typographie.js) : espace fine insécable avant « : »
const TEXTE_HORS_ECRAN = 'Exemple\u202f: un devis de 7 lignes pour une mise aux normes de tableau électrique, signé en ligne, facturé puis payé.';
const TEXTE_RELANCE = 'Relance du devis à J+7, au rythme que vous choisissez';

// Textes exacts de la spec (sections 5 et 6)
const ETAPES_DU_CYCLE = [
  "Le chantier du jour, d’un coup d’œil",
  'Le devis se monte par lots',
  'Signé, facturé, encaissé',
];
const LIENS_DU_CYCLE = ['/fonctionnalites/devis-factures', '/fonctionnalites/devis-factures', '/fonctionnalites/signature-electronique'];
const GARANTIES = [
  'Des numéros qui se suivent, sans trou',
  'Une facture envoyée ne se supprime pas : on la corrige par un avoir',
  'Une facture n’est « payée » que si les paiements la soldent',
  // Titre court du prototype validé (relecture DA-7), la liste des mentions en texte caché devant
  'Assurance décennale, TVA réduite, pénalités de retard : Les mentions du bâtiment s’ajoutent toutes seules',
];
const LEGENDE_CAPTURES = "Captures de l’application, données fictives.";

// Textes exacts de la spec, section « Les fonctionnalités en action »
const TITRE_FONCTIONNALITES = "Essayez, c’est l’application.";
const INTRO_FONCTIONNALITES = "Des exemples à manipuler, sur des données fictives. Le document, le métré et les relances sortent du code même de l’application.";
const ECHEC_MONTANTS_SIGNATURE = "Les montants n’ont pas pu être chargés. Rechargez la page pour les voir.";
const ONGLETS = ['Le document que reçoit votre client', 'Signature en ligne', 'Métré express', 'Relances', 'Encaissements'];
const LEGENDES = {
  'Le document que reçoit votre client': 'Exemple fictif généré par Mallettico.',
  'Signature en ligne': 'Démonstration : votre signature ne quitte pas cette page.',
  Relances: "Vous réglez les délais et les messages ; l’envoi automatique est une option.",
  // La règle « payée au solde » est le titre d'une carte de la fiabilité : la légende dit autre chose (relecture DA-7)
  Encaissements: 'Démonstration : rien n’est encaissé pour de vrai ; le reste dû se recalcule à chaque paiement.',
};
const SIGNE_LE = /^Signé le \d{2}\/\d{2}\/\d{4} à \d{2}:\d{2}$/;
const euros = (n) => NORMALISER(new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n));
const PANNEAU = '#fonctionnalites [role="tabpanel"]:not([hidden])';

// Textes exacts de la spec, sections « Tarifs » et « Construit en public »
const GARANTIE_FONDATEUR = "garanti tant que l’abonnement reste actif";
const TEXTE_CONSTRUIT_EN_PUBLIC = 'Pas de faux avis ici. Les avis viendront des artisans qui utilisent Mallettico, avec leur accord.';
const BOUTON_COMPARER = 'Comparer les plans en détail';
// Franchise de TVA des abonnements (D-19) : la mention remplace « HT » partout ; texte de la décision, pas lu dans le code.
const MENTION_TVA = 'TVA non applicable, art. 293 B du CGI';
const CARTES_PUBLIC = [
  'Une ligne directe avec le créateur',
  'Vous voyez ce que devient votre idée',
  'Un tarif fondateur garanti',
  'Essayer sans carte bancaire',
];
// Libellés des lignes de limites du tableau de comparaison ; les valeurs viennent de `limits` de PLANS.
const LIMITES_DU_TABLEAU = [['devis', 'Devis'], ['clients', 'Clients'], ['chantiers', 'Chantiers'], ['photos', 'Photos de chantier'], ['equipe', 'Collaborateurs']];
const valeurDeLimite = (cle, n) => (n < 0 ? 'Illimité' : cle === 'equipe' ? `Vous + ${n}` : cle === 'devis' ? `${n} par mois` : String(n));

/**
 * Capture d'une section entière (élément), rangée dans audit-ui/ (ignoré par git). Plus haute que l'écran, la fenêtre
 * est agrandie le temps de la capture : au-delà de l'écran, le cadre du document (iframe) n'est pas peint et la
 * capture le montrerait blanc.
 */
async function capturerSection(page, RACINE, selecteur, nom) {
  const fichier = path.join(RACINE, 'audit-ui', `site-${nom}.png`);
  fs.mkdirSync(path.dirname(fichier), { recursive: true });
  const ecran = page.viewport();
  const hauteur = await page.evaluate((s) => Math.ceil(document.querySelector(s).getBoundingClientRect().height), selecteur);
  const agrandir = hauteur + 80 > ecran.height;
  if (agrandir) {
    await page.setViewport({ ...ecran, height: hauteur + 80 });
    await new Promise((r) => setTimeout(r, 500));
  }
  // La barre fixe du haut se poserait au milieu de la capture : masquée le temps de la prendre
  await page.evaluate(() => { const h = document.querySelector('header'); if (h) h.style.visibility = 'hidden'; });
  const element = await page.$(selecteur);
  await element.screenshot({ path: fichier });
  await page.evaluate(() => { const h = document.querySelector('header'); if (h) h.style.visibility = ''; });
  if (agrandir) {
    await page.setViewport(ecran);
    await new Promise((r) => setTimeout(r, 300));
  }
}

/** État des onglets de « Les fonctionnalités en action ». */
const lireOnglets = (page) => page.evaluate(() => {
  const liste = document.querySelector('#fonctionnalites [role="tablist"]');
  const onglets = [...(liste?.querySelectorAll('[role="tab"]') || [])];
  const visibles = [...document.querySelectorAll('#fonctionnalites [role="tabpanel"]')].filter((p) => !p.hidden && p.getClientRects().length > 0);
  const choisi = onglets.find((o) => o.getAttribute('aria-selected') === 'true');
  return {
    titres: onglets.map((o) => o.querySelector('[data-titre]')?.textContent.trim() || ''),
    choisi: choisi?.querySelector('[data-titre]')?.textContent.trim() || '',
    nbChoisis: onglets.filter((o) => o.getAttribute('aria-selected') === 'true').length,
    tabulables: onglets.filter((o) => o.tabIndex === 0).length,
    focus: document.activeElement?.closest('[role="tab"]')?.querySelector('[data-titre]')?.textContent.trim() || '',
    panneaux: visibles.length,
    panneauLie: visibles.length === 1 && !!choisi && visibles[0].getAttribute('aria-labelledby') === choisi.id
      && choisi.getAttribute('aria-controls') === visibles[0].id,
  };
});

/** Choisit un onglet de « Les fonctionnalités en action » d'un clic. */
async function choisirOnglet(page, titre, attendre) {
  const ok = await page.evaluate((t) => {
    const onglet = [...document.querySelectorAll('#fonctionnalites [role="tab"]')]
      .find((o) => o.querySelector('[data-titre]')?.textContent.trim() === t);
    onglet?.click();
    return !!onglet;
  }, titre);
  if (!ok) throw new Error(`Onglet « ${titre} » introuvable`);
  await attendre(500);
}

/** Texte visible du panneau ouvert, espaces normalisés. */
const textePanneau = (page) => page.evaluate((s) => document.querySelector(s)?.innerText || '', PANNEAU).then(NORMALISER);

/** Trace un trait en zigzag sur la zone de signature, à la souris ou au doigt. */
async function tracer(page, { doigt = false } = {}) {
  // Défilement sans animation, puis mesure une fois la page posée (une capture d'élément peut l'avoir déplacée)
  await page.evaluate((s) => document.querySelector(`${s} canvas`).scrollIntoView({ block: 'center', behavior: 'instant' }), PANNEAU);
  await new Promise((r) => setTimeout(r, 400));
  const r = await page.evaluate((s) => {
    const c = document.querySelector(`${s} canvas`);
    const b = c.getBoundingClientRect();
    const dessous = document.elementFromPoint(b.left + b.width * 0.15, b.top + b.height * 0.65);
    return { x: b.left, y: b.top, l: b.width, h: b.height, surLaZone: dessous === c };
  }, PANNEAU);
  if (!r.surLaZone) throw new Error(`zone de signature masquée ou hors de l'écran (${JSON.stringify(r)})`);
  const points = Array.from({ length: 14 }, (_, i) => ({ x: r.x + r.l * (0.15 + i * 0.05), y: r.y + r.h * (i % 2 ? 0.35 : 0.65) }));
  if (doigt) {
    const contact = await page.touchscreen.touchStart(points[0].x, points[0].y);
    for (const p of points.slice(1)) await contact.move(p.x, p.y);
    await contact.end();
  } else {
    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 2 });
    await page.mouse.up();
  }
}

/** Les montants affichés par l'exemple d'encaissements (attributs posés par ExempleEncaissements.jsx). */
const lireFacture = (page) => page.evaluate((s) => {
  const p = document.querySelector(s);
  const bouton = [...(p?.querySelectorAll('button') || [])].find((b) => /^Encaisser/.test(b.innerText.trim()));
  return {
    statut: p?.querySelector('[data-statut-facture]')?.textContent.trim() || '',
    total: p?.querySelector('[data-total-facture]')?.textContent || '',
    reste: Number(p?.querySelector('[data-reste]')?.getAttribute('data-reste')),
    encaisse: Number(p?.querySelector('[data-encaisse]')?.getAttribute('data-encaisse')),
    resteTexte: p?.querySelector('[data-reste]')?.textContent || '',
    bouton: bouton?.innerText.trim() || '',
    recommencer: [...(p?.querySelectorAll('button') || [])].some((b) => b.innerText.trim() === "Recommencer l’exemple"),
    barre: p?.querySelector('[data-barre-encaisse]')?.getBoundingClientRect().width ?? -1,
  };
}, PANNEAU);

/** Texte lisible d'un élément : espaces (y compris insécables et fines) ramenés à une espace ordinaire. */
const NORMALISER = (t) => (t || '').replace(/[\s  ]+/g, ' ').trim();

/** La bibliothèque des métiers, lue dans le module (pas recopiée dans le parcours). */
async function bibliotheque(RACINE) {
  const module = await import(pathToFileURL(path.join(RACINE, 'src', 'lib', 'templates', 'trade-library.js')).href);
  return module.TRADE_LIBRARY;
}

/** Capture rangée dans audit-ui/ (ignoré par git), pour la regarder après le parcours. */
async function capturer(page, RACINE, nom) {
  const fichier = path.join(RACINE, 'audit-ui', `site-${nom}.png`);
  fs.mkdirSync(path.dirname(fichier), { recursive: true });
  await page.screenshot({ path: fichier });
}

/** État lisible du devis vivant (attributs posés par DevisVivant.jsx). */
const lireCarte = (page) => page.evaluate(() => {
  const carte = document.querySelector('[data-devis-vivant]');
  if (!carte) return null;
  const total = carte.querySelector('[data-total]')?.textContent.trim() || '';
  return {
    etape: carte.getAttribute('data-etape'),
    etat: carte.getAttribute('data-etat'),
    lignes: carte.querySelectorAll('[data-ligne]').length,
    vues: carte.querySelectorAll('[data-ligne="vue"]').length,
    pastille: carte.querySelector('[data-pastille]')?.textContent.trim() || '',
    numero: carte.querySelector('[data-numero]')?.textContent.trim() || '',
    relance: carte.closest('figure').querySelector('[data-relance]')?.getAttribute('data-relance') || '',
    relanceTexte: carte.closest('figure').querySelector('[data-relance]')?.textContent.replace(/\s+/g, ' ').trim() || '',
    encaisse: carte.querySelector('[data-encaisse]')?.getAttribute('data-encaisse') || '',
    total,
    montant: Number(total.replace(/[^\d,]/g, '').replace(',', '.')),
  };
});

/** Contraste WCAG entre la couleur du texte d'un élément et le fond réellement peint derrière lui. */
const contrasteDe = (page, selecteur) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return 0;
  const lire = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  // Couches de fond de l'élément vers la racine, jusqu'à la première opaque, puis mélangées sur du blanc.
  const couches = [];
  for (let n = el; n; n = n.parentElement) {
    const c = lire(getComputedStyle(n).backgroundColor);
    if (c && c.a > 0) { couches.push(c); if (c.a >= 1) break; }
  }
  const melanger = (dessus, dessous) => ({
    r: dessus.r * dessus.a + dessous.r * (1 - dessus.a),
    g: dessus.g * dessus.a + dessous.g * (1 - dessus.a),
    b: dessus.b * dessus.a + dessous.b * (1 - dessus.a),
    a: 1,
  });
  const fond = couches.reverse().reduce((dessous, c) => melanger(c, dessous), { r: 255, g: 255, b: 255, a: 1 });
  const texte = melanger(lire(getComputedStyle(el).color), fond);
  const lum = ({ r, g, b }) => {
    const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const [clair, sombre] = [lum(texte), lum(fond)].sort((x, y) => y - x);
  return (clair + 0.05) / (sombre + 0.05);
}, selecteur);

module.exports = [
  {
    nom: 'site : premier écran',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier, RACINE }) {
      for (const largeur of [375, 1440]) {
        const { page, browser } = await ouvrir({ reel: true, largeur, supabase: () => json([]) });
        const a = `à ${largeur} px`;

        // Titre, actions, démo
        const titres = await page.evaluate(() => [...document.querySelectorAll('h1')].map((h) => h.textContent.replace(/\s+/g, ' ').trim()));
        verifier(titres.length === 1, `un seul h1 ${a} (${titres.length})`);
        verifier(titres[0] === TITRE, `h1 au texte exact ${a} (« ${titres[0]} »)`);
        const dansLEcran = await page.evaluate(() => {
          const voir = (texte) => [...document.querySelectorAll('button, a')].some((x) => {
            const r = x.getBoundingClientRect();
            return x.innerText.trim() === texte && r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight;
          });
          return { connexion: voir('Connexion'), compte: voir('Créer mon compte gratuit') };
        });
        verifier(dansLEcran.connexion, `« Connexion » visible dans le premier écran ${a}`);
        verifier(dansLEcran.compte, `« Créer mon compte gratuit » visible dans le premier écran ${a}`);
        const demo = await page.evaluate(() => [...document.querySelectorAll('a')].find((x) => x.innerText.trim() === 'Voir la démo')?.getAttribute('href'));
        verifier(demo === '/?demo=true', `« Voir la démo » mène à /?demo=true ${a} (${demo})`);

        // Aucun défilement horizontal, et aucun élément (hors décor) de la barre, du premier écran et de la bande de
        // faits qui sorte de l'écran : la racine coupe le débordement (overflow-x: clip), scrollWidth seul ne
        // verrait pas un bouton coupé. (Les anciennes sections, qui entrent par glissement latéral, sont refaites
        // par les tâches suivantes, qui étendront ce contrôle.)
        const debord = await page.evaluate(() => {
          const sortants = [...document.querySelectorAll('header *, main > :nth-child(-n+2) *')].filter((el) => {
            if (el.closest('[data-decor]')) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && (r.left < -1 || r.right > innerWidth + 1);
          });
          return {
            page: document.documentElement.scrollWidth - innerWidth,
            elements: sortants.slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`),
          };
        });
        verifier(debord.page <= 0, `aucun défilement horizontal ${a} (${debord.page} px)`);
        verifier(debord.elements.length === 0, `aucun élément hors de l'écran ${a} (${debord.elements.join(' | ')})`);

        // Contrastes
        const cH1 = await contrasteDe(page, 'h1');
        verifier(cH1 >= 4.5, `contraste du h1 ≥ 4,5 ${a} (${cH1.toFixed(2)})`);
        await page.evaluate(() => {
          const b = [...document.querySelectorAll('main button, main a')].find((x) => x.innerText.trim() === 'Créer mon compte gratuit');
          if (b) b.setAttribute('data-parcours-plein', '');
        });
        const cBouton = await contrasteDe(page, '[data-parcours-plein]');
        verifier(cBouton >= 4.5, `contraste du bouton plein ≥ 4,5 ${a} (${cBouton.toFixed(2)})`);

        // Le devis vivant : texte pour les lecteurs d'écran, animation masquée
        const accessible = await page.evaluate((texte) => {
          const el = [...document.querySelectorAll('p, span, div')].find((x) => x.textContent.trim() === texte);
          return {
            present: !!el,
            lu: !!el && !el.closest('[aria-hidden="true"]'),
            carteMasquee: document.querySelector('[data-devis-vivant]')?.closest('[aria-hidden="true"]') !== null,
            boucleAnnoncee: !!document.querySelector('[data-devis-vivant] [aria-live], [data-devis-vivant][aria-live]'),
          };
        }, TEXTE_HORS_ECRAN);
        verifier(accessible.present && accessible.lu, `texte hors écran du devis vivant présent et lisible ${a}`);
        verifier(accessible.carteMasquee, `animation du devis vivant masquée aux lecteurs d'écran ${a}`);
        verifier(!accessible.boucleAnnoncee, `aucune région aria-live dans la boucle ${a}`);

        // Une fois la carte à l'écran, la boucle joue : au moins 3 lignes et un total non nul après 4 s
        await page.evaluate(() => document.querySelector('[data-devis-vivant]').scrollIntoView({ block: 'center' }));
        await attendre(4000);
        const apres = await lireCarte(page);
        verifier(apres && apres.vues >= 3, `au moins 3 lignes du devis vivant après 4 s ${a} (${apres?.vues})`);
        verifier(apres && /€$/.test(apres.total) && apres.montant > 0, `total « … € » non nul ${a} (« ${apres?.total} »)`);
        verifier(apres.relance === 'visible' && apres.relanceTexte === TEXTE_RELANCE, `bulle « ${TEXTE_RELANCE} » montrée pendant le devis ${a} (${apres.relance}, « ${apres.relanceTexte} »)`);
        await capturer(page, RACINE, `premier-ecran-${largeur}-anime`);

        // Hors de l'écran, la boucle s'arrête ; elle reprend au retour
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await attendre(400);
        const figee = await lireCarte(page);
        await attendre(2500);
        const toujours = await lireCarte(page);
        verifier(figee.etape === toujours.etape, `boucle arrêtée quand la carte est hors de l'écran ${a} (${figee.etape} → ${toujours.etape})`);
        await page.evaluate(() => document.querySelector('[data-devis-vivant]').scrollIntoView({ block: 'center' }));
        let reprise = false;
        for (let i = 0; i < 25 && !reprise; i++) { await attendre(250); reprise = (await lireCarte(page)).etape !== toujours.etape; }
        verifier(reprise, `boucle reprise au retour de la carte à l'écran ${a}`);

        // Étapes de la facture : plus de bulle de relance du devis ; légende d'encaissement seulement une fois
        // quelque chose encaissé
        const jusqua = async (etat) => {
          for (let i = 0; i < 100; i++) {
            const c = await lireCarte(page);
            if (c.etat === etat) return c;
            await attendre(200);
          }
          return lireCarte(page);
        };
        const facture = await jusqua('facture');
        verifier(facture.etat === 'facture', `étape « Facture envoyée » atteinte ${a} (${facture.etat})`);
        verifier(facture.relance === 'cachee', `bulle de relance du devis cachée sur la facture ${a} (${facture.relance})`);
        verifier(facture.encaisse === 'cache', `pas de « Encaissé : 0,00 € » sur la facture envoyée ${a} (${facture.encaisse})`);
        const partiel = await jusqua('partiel');
        verifier(partiel.etat === 'partiel' && partiel.encaisse === 'visible', `légende d'encaissement une fois payée en partie ${a} (${partiel.etat}, ${partiel.encaisse})`);

        // Onglet caché : la boucle s'arrête aussi
        await page.evaluate(() => {
          Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
          document.dispatchEvent(new Event('visibilitychange'));
        });
        const cachee = await lireCarte(page);
        await attendre(2500);
        verifier((await lireCarte(page)).etape === cachee.etape, `boucle arrêtée quand l'onglet est caché ${a}`);

        // Mouvement réduit : complet et « Payée » dès l'arrivée, sans boucle (pas de défilement jusqu'à la carte)
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        await page.reload({ waitUntil: 'networkidle0' });
        await attendre(500);
        const reduite = await lireCarte(page);
        verifier(reduite && reduite.lignes >= 3 && reduite.vues === reduite.lignes, `mouvement réduit : toutes les lignes ${a} (${reduite?.vues}/${reduite?.lignes})`);
        verifier(reduite.pastille === 'Payée' && reduite.etat === 'payee', `mouvement réduit : « Payée » dès l'arrivée ${a} (« ${reduite.pastille} »)`);
        verifier(reduite.numero.includes('FAC-2026-00042') && reduite.montant > 0, `mouvement réduit : facture et total ${a} (${reduite.numero}, ${reduite.total})`);
        // La bulle n'est pas rendue du tout (relecture DA-19 : invisible, elle gardait 40 px de vide sous la carte)
        verifier(reduite.relance === '' && reduite.encaisse === 'visible', `mouvement réduit : pas de bulle de relance du devis, encaissement affiché ${a}`);
        await attendre(2000);
        verifier((await lireCarte(page)).etape === reduite.etape, `mouvement réduit : pas de boucle ${a}`);
        await capturer(page, RACINE, `premier-ecran-${largeur}-reduit`);

        // Menu du téléphone au clavier : aria-controls désigne un élément qui existe ; ouvert, la page derrière est
        // inerte et Tab entre dans le menu ; Échap le ferme et rend le focus au bouton
        await page.evaluate(() => window.scrollTo(0, 0));
        if (largeur < 1024) {
          const menuFerme = await page.evaluate(() => {
            const bouton = document.querySelector('[aria-controls="menu-site"]');
            const menu = document.getElementById('menu-site');
            return { cible: !!menu, cache: !!menu?.hidden, etendu: bouton?.getAttribute('aria-expanded') };
          });
          verifier(menuFerme.cible && menuFerme.cache && menuFerme.etendu === 'false', `menu fermé : aria-controls désigne le menu caché ${a}`);
          await page.focus('[aria-controls="menu-site"]');
          await page.keyboard.press('Enter');
          await attendre(300);
          await page.keyboard.press('Tab');
          const ouvert = await page.evaluate(() => ({
            etendu: document.querySelector('[aria-controls="menu-site"]').getAttribute('aria-expanded'),
            inerte: !!document.querySelector('main')?.hasAttribute('inert'),
            focusDansMenu: !!document.activeElement?.closest('#menu-site'),
          }));
          verifier(ouvert.etendu === 'true' && ouvert.inerte, `menu ouvert : page derrière inerte ${a}`);
          verifier(ouvert.focusDansMenu, `menu ouvert : Tab entre dans le menu ${a}`);
          await page.keyboard.press('Escape');
          await attendre(300);
          const referme = await page.evaluate(() => ({
            cache: document.getElementById('menu-site').hidden,
            inerte: !!document.querySelector('main')?.hasAttribute('inert'),
            focusBouton: document.activeElement === document.querySelector('[aria-controls="menu-site"]'),
          }));
          verifier(referme.cache && !referme.inerte && referme.focusBouton, `Échap ferme le menu, la page revient, focus sur le bouton ${a}`);
        }

        // La barre mène aux sections : « Tarifs » au bureau ; au téléphone, le menu puis « FAQ » (menu refermé,
        // page de nouveau défilable)
        const ancre = largeur >= 1024 ? '#pricing' : '#faq';
        if (largeur >= 1024) {
          await cliquer(page, 'Tarifs');
        } else {
          await cliquer(page, 'Ouvrir le menu');
          await cliquer(page, 'FAQ');
        }
        await attendre(1500);
        const arrivee = await page.evaluate((s) => ({
          haut: document.querySelector(s)?.getBoundingClientRect().top,
          menu: !document.getElementById('menu-site').hidden,
          bloquee: document.body.style.overflow === 'hidden',
          inerte: !!document.querySelector('main')?.hasAttribute('inert'),
        }), ancre);
        verifier(arrivee.haut > -10 && arrivee.haut < 200, `la barre mène à ${ancre} ${a} (haut : ${arrivee.haut})`);
        verifier(!arrivee.menu && !arrivee.bloquee && !arrivee.inerte, `menu refermé, page défilable et active ${a}`);

        // « Créer mon compte gratuit » ouvre l'inscription
        await page.evaluate(() => window.scrollTo(0, 0));
        await cliquer(page, 'Créer mon compte gratuit');
        await attendre(800);
        const email = await page.evaluate(() => {
          const champ = document.querySelector('input[type="email"]');
          const r = champ?.getBoundingClientRect();
          return !!r && r.width > 0 && r.height > 0;
        });
        verifier(email, `« Créer mon compte gratuit » ouvre un champ e-mail ${a}`);
        await browser.close();
      }
    },
  },
  {
    // La bibliothèque des métiers (149 Ko) est chargée à la demande : lente, la carte ne doit pas changer de
    // hauteur à son arrivée ; introuvable (déploiement remplacé, réseau coupé), pas d'emplacements vides ni de
    // « 0,00 € » pour toujours.
    nom: 'site : devis vivant, bibliothèque lente ou introuvable',
    reel: true,
    async executer({ ouvrir, attendre, verifier }) {
      const BIBLIOTHEQUE = /\/trade-library-[^/]*\.js$/;
      // Dans la page : hauteur de la carte tant qu'elle n'a que ses emplacements (dernière mesure avant les lignes)
      const mesurerAvant = () => {
        const minuterie = setInterval(() => {
          const carte = document.querySelector('[data-devis-vivant]');
          if (!carte) return;
          if (carte.querySelector('[data-emplacement]')) window.__hauteurAvant = carte.getBoundingClientRect().height;
          else if (carte.querySelector('[data-ligne]')) clearInterval(minuterie);
        }, 50);
      };
      for (const largeur of [375, 768, 1440]) {
        const { page, browser } = await ouvrir({
          reel: true, largeur, supabase: () => json([]), avantChargement: mesurerAvant,
          fichiers: (u) => (BIBLIOTHEQUE.test(u.pathname) ? 2000 : undefined),
        });
        const h = await page.evaluate(() => ({
          avant: window.__hauteurAvant,
          apres: document.querySelector('[data-devis-vivant]').getBoundingClientRect().height,
          lignes: document.querySelectorAll('[data-devis-vivant] [data-ligne]').length,
        }));
        verifier(h.avant > 0 && h.lignes > 0, `emplacements mesurés puis lignes chargées à ${largeur} px (${h.avant}, ${h.lignes} lignes)`);
        verifier(Math.abs(h.apres - h.avant) <= 1, `la carte garde sa hauteur quand la bibliothèque arrive à ${largeur} px (${h.avant} → ${h.apres})`);
        await browser.close();
      }

      for (const largeur of [375, 1440]) {
        const { page, browser } = await ouvrir({
          reel: true, largeur, supabase: () => json([]),
          fichiers: (u) => (BIBLIOTHEQUE.test(u.pathname) ? 'bloquer' : undefined),
        });
        await attendre(500);
        const e = await page.evaluate(() => {
          const carte = document.querySelector('[data-devis-vivant]');
          const figure = carte.closest('figure');
          return {
            echec: carte.hasAttribute('data-echec'),
            lignes: carte.querySelectorAll('[data-emplacement], [data-ligne]').length,
            total: !!carte.querySelector('[data-total]'),
            relance: !!figure.querySelector('[data-relance]'),
            numero: carte.querySelector('[data-numero]')?.textContent.trim(),
            titre: carte.textContent.includes('Mise aux normes du tableau électrique'),
            legende: figure.querySelector('figcaption')?.textContent || '',
          };
        });
        verifier(e.echec && e.lignes === 0 && !e.total && !e.relance, `bibliothèque introuvable : ni emplacements, ni total, ni bulle à ${largeur} px (${JSON.stringify(e)})`);
        verifier(e.numero === 'DEV-2026-00012 · M. Martin' && e.titre && e.legende.startsWith('Démonstration'), `bibliothèque introuvable : en-tête et légende gardés à ${largeur} px`);

        // L'explorateur des métiers partage le même chargement : pas de squelette pour toujours, un message
        const m = await page.evaluate(() => {
          const section = document.querySelector('#metiers');
          return {
            titre: !!section?.querySelector('h2'),
            puces: section?.querySelectorAll('button[aria-pressed]').length,
            attente: !!section?.querySelector('[data-metiers-attente]'),
            message: section?.querySelector('[data-metiers-echec]')?.textContent.trim() || '',
          };
        });
        verifier(m.titre && m.puces === 0 && !m.attente && m.message.length > 0, `bibliothèque introuvable : l'explorateur des métiers le dit à ${largeur} px (${JSON.stringify(m)})`);

        // « Les fonctionnalités en action » : le document, la signature et le métré le disent aussi, sans cases vides
        await page.evaluate(() => document.querySelector('#fonctionnalites').scrollIntoView());
        let onglets = false;
        for (let i = 0; i < 40 && !onglets; i++) {
          await attendre(200);
          onglets = await page.evaluate(() => !!document.querySelector('#panneau-document [data-document-echec]'));
        }
        const docEchec = await page.evaluate(() => {
          const p = document.querySelector('#panneau-document');
          return {
            message: p?.querySelector('[data-document-echec]')?.textContent.trim() || '',
            cadre: !!p?.querySelector('iframe'),
            legende: !!p?.querySelector('[data-legende]'),
            bouton: [...(p?.querySelectorAll('button') || [])].some((b) => b.innerText.includes('en grand')),
          };
        });
        verifier(docEchec.message.length > 0 && !docEchec.cadre && !docEchec.legende && !docEchec.bouton, `bibliothèque introuvable : le document le dit, sans cadre, légende ni bouton à ${largeur} px (${JSON.stringify(docEchec)})`);
        await page.evaluate(() => document.querySelector('#onglet-signature').click());
        await attendre(600);
        const sigEchec = await page.evaluate(() => {
          const p = document.querySelector('#panneau-signature');
          return {
            message: p?.querySelector('[data-signature-echec]')?.textContent.replace(/\s+/g, ' ').trim() || '',
            totaux: !!p?.querySelector('dl'),
            titre: p?.querySelector('[data-montant-devis]')?.textContent.replace(/\s+/g, ' ').trim() || '',
          };
        });
        verifier(sigEchec.message === ECHEC_MONTANTS_SIGNATURE && !sigEchec.totaux && sigEchec.titre === 'Devis DEV-2026-00012', `bibliothèque introuvable : la signature dit que les montants manquent à ${largeur} px (${JSON.stringify(sigEchec)})`);
        await page.evaluate(() => document.querySelector('#onglet-metre').click());
        await attendre(600);
        const metreEchec = await page.evaluate(() => {
          const p = document.querySelector('#panneau-metre');
          return {
            message: p?.querySelector('[data-metre-echec]')?.textContent.trim() || '',
            quantite: p?.querySelector('[data-quantite]')?.textContent.replace(/\s+/g, ' ').trim() || '',
            montant: !!p?.querySelector('[data-montant]'),
          };
        });
        verifier(metreEchec.message.length > 0 && /m²$/.test(metreEchec.quantite) && !metreEchec.montant, `bibliothèque introuvable : le métré calcule, et dit que la ligne manque à ${largeur} px (${JSON.stringify(metreEchec)})`);
        await browser.close();
      }
    },
  },
  {
    nom: 'site : sections',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier, RACINE }) {
      const TRADE_LIBRARY = await bibliotheque(RACINE);
      const metiers = Object.values(TRADE_LIBRARY).map((m) => m.nom);
      const lotsPlomberie = TRADE_LIBRARY.plomberie.lots.slice(0, 3).map((l) => l.nom);

      for (const largeur of [375, 1440]) {
        const { page, browser } = await ouvrir({ reel: true, largeur, supabase: () => json([]) });
        const a = `à ${largeur} px`;
        const auBureau = largeur >= 1024;

        // ── Métiers : 17 pastilles, Électricité d'abord
        await page.evaluate(() => document.querySelector('#metiers')?.scrollIntoView());
        await attendre(800);
        const puces = await page.evaluate(() => [...document.querySelectorAll('#metiers button[aria-pressed]')].map((b) => ({
          nom: b.textContent.trim(),
          presse: b.getAttribute('aria-pressed'),
          hauteur: b.getBoundingClientRect().height,
        })));
        verifier(puces.length === 17, `#metiers : 17 boutons de métiers ${a} (${puces.length})`);
        verifier(JSON.stringify(puces.map((p) => p.nom)) === JSON.stringify(metiers), `#metiers : les métiers de la bibliothèque, dans son ordre ${a}`);
        verifier(puces.filter((p) => p.presse === 'true').map((p) => p.nom).join() === 'Électricité', `#metiers : Électricité pressé d'abord ${a}`);
        verifier(Math.min(...puces.map((p) => p.hauteur)) >= 44, `#metiers : pastilles d'au moins 44 px ${a} (${Math.min(...puces.map((p) => p.hauteur))})`);

        const lireCartes = () => page.evaluate(() => [...document.querySelectorAll('#metiers [data-lot]')].map((c) => ({
          nom: c.querySelector('h3')?.textContent.trim(),
          total: c.querySelector('[data-total-ht]')?.textContent.trim() || '',
          compte: c.querySelector('[data-nb-lignes]')?.textContent.trim() || '',
          lignes: c.querySelectorAll('li').length,
        })));
        const electricite = await lireCartes();
        const lotsElectricite = TRADE_LIBRARY.electricite.lots.slice(0, 3).map((l) => l.nom);
        verifier(JSON.stringify(electricite.map((c) => c.nom)) === JSON.stringify(lotsElectricite), `#metiers : les trois premiers lots d'Électricité ${a}`);

        // Cliquer « Plomberie » : ses trois premiers lots, chacun avec un total HT en euros et trois lignes
        await cliquer(page, 'Plomberie', { dans: '#metiers' });
        await attendre(700);
        const cartes = await lireCartes();
        verifier(JSON.stringify(cartes.map((c) => c.nom)) === JSON.stringify(lotsPlomberie), `Plomberie : trois cartes aux noms des trois premiers lots ${a} (${cartes.map((c) => c.nom).join(' | ')})`);
        verifier(cartes.every((c) => /^\d[\d\s  ]*€$/.test(c.total)), `Plomberie : total HT arrondi à l'euro, en « € » ${a} (${cartes.map((c) => c.total).join(' | ')})`);
        const nbLignes = TRADE_LIBRARY.plomberie.lots.slice(0, 3).map((l) => `${l.lignes.length} lignes · HT`);
        verifier(JSON.stringify(cartes.map((c) => NORMALISER(c.compte))) === JSON.stringify(nbLignes), `Plomberie : « N lignes · HT » ${a} (${cartes.map((c) => c.compte).join(' | ')})`);
        verifier(cartes.every((c) => c.lignes === 3), `Plomberie : trois premières lignes par carte ${a}`);
        const presse = () => page.evaluate(() => document.querySelector('#metiers button[aria-pressed="true"]')?.textContent.trim());
        verifier((await presse()) === 'Plomberie', `Plomberie pressé après le clic ${a}`);

        // Flèche droite : le métier suivant, pressé et focalisé ; flèche gauche : retour
        await page.focus('#metiers button[aria-pressed="true"]');
        await page.keyboard.press('ArrowRight');
        await attendre(500);
        const suivant = metiers[metiers.indexOf('Plomberie') + 1];
        const apresFleche = await page.evaluate(() => ({
          presse: document.querySelector('#metiers button[aria-pressed="true"]')?.textContent.trim(),
          focus: document.activeElement?.textContent.trim(),
          tabulables: [...document.querySelectorAll('#metiers button[aria-pressed]')].filter((b) => b.tabIndex === 0).length,
        }));
        verifier(apresFleche.presse === suivant && apresFleche.focus === suivant, `flèche droite : de Plomberie à ${suivant} ${a} (${JSON.stringify(apresFleche)})`);
        verifier(apresFleche.tabulables === 1, `une seule pastille dans l'ordre de tabulation ${a} (${apresFleche.tabulables})`);
        const apresSuivant = await lireCartes();
        const idSuivant = Object.keys(TRADE_LIBRARY)[Object.keys(TRADE_LIBRARY).indexOf('plomberie') + 1];
        verifier(apresSuivant[0]?.nom === TRADE_LIBRARY[idSuivant].lots[0].nom, `flèche droite : les lots de ${suivant} ${a}`);
        await page.keyboard.press('ArrowLeft');
        await attendre(300);
        verifier((await presse()) === 'Plomberie', `flèche gauche : retour à Plomberie ${a}`);
        // Barre d'outils nommée ; Alt+→ (avancer dans l'historique du navigateur) ne change pas de métier
        const barre = await page.evaluate(() => {
          const t = document.querySelector('#metiers [role="toolbar"]');
          return { label: t?.getAttribute('aria-label') || '', puces: t?.querySelectorAll('button[aria-pressed]').length || 0 };
        });
        verifier(barre.label.length > 0 && barre.puces === 17, `pastilles dans une barre d'outils nommée ${a} (${JSON.stringify(barre)})`);
        await page.focus('#metiers button[aria-pressed="true"]');
        await page.keyboard.down('Alt');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.up('Alt');
        await attendre(400);
        verifier((await presse()) === 'Plomberie', `Alt+flèche droite ne change pas de métier ${a} (${await presse()})`);
        await capturer(page, RACINE, `metiers-${largeur}`);

        // ── Le cycle : trois étapes aux titres exacts, leurs liens, la légende des captures
        const cycle = await page.evaluate(() => {
          const section = document.querySelector('#parcours');
          const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
          return {
            titres: [...(section?.querySelectorAll('[data-etape] h3') || [])].map((h) => h.textContent.trim()),
            liens: [...(section?.querySelectorAll('[data-etape] a') || [])].map((x) => ({ href: x.getAttribute('href'), texte: x.innerText.trim() })),
            legende: [...(section?.querySelectorAll('p') || [])].filter(visible).map((p) => p.textContent.trim()),
            telephone: visible(section?.querySelector('[data-telephone]')),
            capturesDesEtapes: [...(section?.querySelectorAll('[data-etape] img') || [])].filter(visible).length,
          };
        });
        verifier(JSON.stringify(cycle.titres) === JSON.stringify(ETAPES_DU_CYCLE), `#parcours : trois étapes aux titres exacts ${a} (${cycle.titres.join(' | ')})`);
        verifier(JSON.stringify(cycle.liens.map((l) => l.href)) === JSON.stringify(LIENS_DU_CYCLE) && cycle.liens.every((l) => l.texte.startsWith('En savoir plus')), `#parcours : « En savoir plus » vers les pages de la spec ${a}`);
        verifier(cycle.legende.includes(LEGENDE_CAPTURES), `#parcours : légende « ${LEGENDE_CAPTURES} » visible ${a}`);
        // Le cycle a un titre visible (pas seulement pour les lecteurs d'écran)
        const titreCycle = await page.evaluate(() => {
          const h = document.querySelector('#parcours h2');
          const r = h?.getBoundingClientRect();
          return { texte: h?.textContent.trim() || '', visible: !!r && r.width > 100 && r.height > 20 };
        });
        verifier(titreCycle.visible, `#parcours : titre visible ${a} (« ${titreCycle.texte} »)`);
        if (auBureau) {
          verifier(cycle.telephone && cycle.capturesDesEtapes === 0, `#parcours : téléphone collant au bureau, pas de capture par étape ${a}`);
          // Mise en page : la première étape suit le titre de près, le téléphone suit la colonne de texte (avant : 250 px
          // de vide sous le haut de la section et 220 px entre le texte et le téléphone)
          const ecarts = await page.evaluate(() => {
            const titre = document.querySelector('#parcours h2').getBoundingClientRect();
            const etape = document.querySelector('#parcours [data-etape="0"] h3').getBoundingClientRect();
            const textes = [...document.querySelectorAll('#parcours [data-etape] p')].map((p) => p.getBoundingClientRect().right);
            const tel = document.querySelector('[data-telephone]').getBoundingClientRect();
            return { titreEtape: Math.round(etape.top - titre.bottom), texteTelephone: Math.round(tel.left - Math.max(...textes)) };
          });
          verifier(ecarts.titreEtape <= 140 && ecarts.texteTelephone <= 160, `#parcours : étapes près du titre, téléphone près du texte ${a} (${JSON.stringify(ecarts)})`);
          // Le téléphone change d'écran avec l'étape lue
          const ecranVisible = () => page.evaluate(() => [...document.querySelectorAll('[data-telephone] img')]
            .filter((i) => parseFloat(getComputedStyle(i).opacity) > 0.5).map((i) => i.getAttribute('src')));
          const attendus = ['tel-accueil.webp', 'tel-devis-lots.webp', 'tel-facture.webp'];
          for (const i of [0, 1, 2]) {
            await page.evaluate((n) => document.querySelector(`#parcours [data-etape="${n}"]`).scrollIntoView({ block: 'center' }), i);
            await attendre(1000);
            const ecran = await ecranVisible();
            verifier(ecran.length === 1 && ecran[0].endsWith(attendus[i]), `étape ${i + 1} : le téléphone montre ${attendus[i]} ${a} (${ecran.join(', ')})`);
            const active = await page.evaluate(() => [...document.querySelectorAll('#parcours [data-etape]')].map((e) => e.getAttribute('data-active')));
            verifier(active[i] === 'true' && active.filter((x) => x === 'true').length === 1, `étape ${i + 1} marquée comme lue ${a} (${active.join(',')})`);
            if (i === 2) await capturer(page, RACINE, `cycle-${largeur}-etape-3`);
          }
          const telephoneMasque = await page.evaluate(() => document.querySelector('[data-telephone]')?.closest('[aria-hidden="true"]') !== null);
          verifier(telephoneMasque, `le téléphone collant est décoratif (aria-hidden) ${a}`);
        } else {
          verifier(!cycle.telephone && cycle.capturesDesEtapes === 3, `#parcours : au téléphone, chaque étape a sa capture ${a} (${cycle.capturesDesEtapes})`);
          const alts = await page.evaluate(() => [...document.querySelectorAll('#parcours [data-etape] img')].map((i) => i.getAttribute('alt') || ''));
          verifier(alts.every((t) => t.length > 20), `#parcours : chaque capture a un texte de remplacement ${a}`);
          await page.evaluate(() => document.querySelector('#parcours [data-etape="2"]').scrollIntoView({ block: 'center' }));
          await attendre(800);
          await capturer(page, RACINE, `cycle-${largeur}-etape-3`);
        }

        // ── Fiabilité : les quatre garanties exactes ; le compteur avance d'une unité à l'écran, s'arrête hors écran
        const garanties = await page.evaluate(() => [...document.querySelectorAll('#fiabilite h3')].map((h) => h.textContent));
        verifier(JSON.stringify(garanties.map(NORMALISER)) === JSON.stringify(GARANTIES), `#fiabilite : les quatre garanties exactes ${a} (${garanties.map(NORMALISER).join(' | ')})`);
        const lireFiabilite = () => page.evaluate(() => ({
          numeros: [...document.querySelectorAll('[data-compteur] [data-numero-facture]')].map((x) => x.textContent.trim()),
          dernier: Number(document.querySelector('[data-compteur]')?.getAttribute('data-compteur')),
          part: document.querySelector('[data-encaissement]')?.getAttribute('data-encaissement'),
          masque: document.querySelector('[data-compteur]')?.closest('[aria-hidden="true"]') !== null,
        }));
        await page.evaluate(() => document.querySelector('[data-compteur]').scrollIntoView({ block: 'center' }));
        await attendre(300);
        const f1 = await lireFiabilite();
        await attendre(3600);
        const f2 = await lireFiabilite();
        verifier(f1.masque, `animations de la fiabilité masquées aux lecteurs d'écran ${a}`);
        verifier(f2.dernier > f1.dernier, `le compteur avance à l'écran ${a} (${f1.dernier} → ${f2.dernier})`);
        const suite = f2.numeros.map((t) => Number(t.slice(-5)));
        verifier(f2.numeros.every((t) => /^FAC-2026-\d{5}$/.test(t)) && suite.every((n, i) => i === 0 || n === suite[i - 1] + 1), `le compteur montre des numéros qui se suivent ${a} (${f2.numeros.join(', ')})`);
        verifier(f1.part !== f2.part, `la barre d'encaissement avance à l'écran ${a} (${f1.part} → ${f2.part})`);
        // La barre n'avance jamais à reculons : sur plus d'un cycle, sa largeur peinte ne baisse que lorsqu'une nouvelle
        // facture commence (rang suivant, premier palier), et une facture « Payée » ne redevient pas « Payée en partie »
        const releves = [];
        for (let i = 0; i < 45; i++) {
          releves.push(await page.evaluate(() => {
            const bloc = document.querySelector('[data-encaissement]');
            const barre = bloc?.querySelector('[data-barre]');
            return {
              facture: Number(bloc?.getAttribute('data-facture')),
              part: Number(bloc?.getAttribute('data-encaissement')),
              largeur: barre ? barre.getBoundingClientRect().width : -1,
              statut: bloc?.querySelector('[data-statut]')?.textContent.trim(),
            };
          }));
          await attendre(150);
        }
        const reculs = releves.filter((r, i) => i > 0 && r.facture === releves[i - 1].facture
          && (r.largeur < releves[i - 1].largeur - 0.5 || (releves[i - 1].statut === 'Payée' && r.statut !== 'Payée')));
        const nouvelles = releves.map((r, i) => ({ r, avant: releves[i - 1] })).filter(({ r, avant }) => avant && r.facture !== avant.facture);
        verifier(reculs.length === 0, `la barre d'encaissement ne recule jamais pour une même facture ${a} (${JSON.stringify(reculs[0] || {})})`);
        verifier(nouvelles.length >= 1 && nouvelles.every(({ r, avant }) => r.facture === avant.facture + 1 && r.part === 0.3),
          `au bout du cycle, une nouvelle facture repart du premier palier ${a} (${nouvelles.map(({ r }) => `${r.facture}:${r.part}`).join(', ')})`);
        await capturer(page, RACINE, `fiabilite-${largeur}`);
        await page.evaluate(() => window.scrollTo(0, 0));
        await attendre(400);
        const f3 = await lireFiabilite();
        await attendre(3600);
        const f4 = await lireFiabilite();
        verifier(f3.dernier === f4.dernier && f3.part === f4.part, `compteur et barre arrêtés hors de l'écran ${a} (${f3.dernier}/${f3.part} → ${f4.dernier}/${f4.part})`);

        // ── Chaque titre de section (h2) est visible une fois amené à l'écran (aucune apparition restée transparente) :
        // opacité du titre et de tous ses parents. Sections refaites seulement : les anciennes (FAQ…) ont des
        // apparitions plus longues que 800 ms ; leurs tâches les ajouteront à TITRES_CONTROLES.
        const TITRES_CONTROLES = '#metiers h2, #fonctionnalites h2, #parcours h2, #fiabilite h2, #pricing h2, #early-adopters h2';
        const nbTitres = await page.evaluate((s) => document.querySelectorAll(s).length, TITRES_CONTROLES);
        verifier(nbTitres === 6, `un titre h2 par section refaite ${a} (${nbTitres})`);
        for (let i = 0; i < nbTitres; i++) {
          await page.evaluate((s, n) => document.querySelectorAll(s)[n].scrollIntoView(), TITRES_CONTROLES, i);
          await attendre(800);
          const o = await page.evaluate((s, n) => {
            const h = document.querySelectorAll(s)[n];
            let opacite = 1;
            for (let el = h; el; el = el.parentElement) opacite *= parseFloat(getComputedStyle(el).opacity);
            return { opacite, propre: getComputedStyle(h).opacity, texte: h.textContent.trim().slice(0, 40) };
          }, TITRES_CONTROLES, i);
          verifier(o.opacite === 1 && o.propre === '1', `titre « ${o.texte} » entièrement visible ${a} (${o.opacite})`);
        }

        // ── Images des sections chargées (après le défilement complet, les images paresseuses sont arrivées)
        const images = await page.evaluate(() => [...document.querySelectorAll('#metiers img, #parcours img, #fiabilite img')]
          .filter((i) => i.getClientRects().length > 0)
          .map((i) => ({ src: i.getAttribute('src'), largeur: i.naturalWidth, l: i.getAttribute('width'), h: i.getAttribute('height'), chargement: i.getAttribute('loading') })));
        verifier(images.length > 0 && images.every((i) => i.largeur > 0), `images des sections chargées ${a} (${images.filter((i) => !i.largeur).map((i) => i.src).join(', ')})`);
        verifier(images.every((i) => i.l && i.h && i.chargement === 'lazy'), `images des sections : dimensions et chargement paresseux ${a}`);

        // ── Aucun débordement ni élément hors de l'écran dans ces sections
        const debord = await page.evaluate(() => {
          const sortants = [...document.querySelectorAll('#metiers *, #parcours *, #fiabilite *')].filter((el) => {
            if (el.closest('[data-decor]')) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && (r.left < -1 || r.right > innerWidth + 1);
          });
          return { page: document.documentElement.scrollWidth - innerWidth, elements: sortants.slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`) };
        });
        verifier(debord.page <= 0 && debord.elements.length === 0, `sections sans débordement ${a} (${debord.page} px ; ${debord.elements.join(' | ')})`);

        // ── Contrastes des textes clés (fond réellement peint derrière)
        for (const selecteur of [
          '#metiers h2', '#metiers [data-intro]', '#metiers button[aria-pressed="false"]', '#metiers button[aria-pressed="true"]',
          '#metiers [data-lot] h3', '#metiers [data-lot] [data-nb-lignes]', '#metiers [data-lot] li', '#metiers [data-note]',
          '#parcours [data-etape] h3', '#parcours [data-etape] p', '#parcours [data-etape] a',
          '#fiabilite h2', '#fiabilite [data-intro]', '#fiabilite h3', '[data-compteur] [data-numero-facture]', '[data-encaissement] [data-statut]',
          '[data-mentions] li',
        ]) {
          const c = await contrasteDe(page, selecteur);
          verifier(c >= 4.5, `contraste de ${selecteur} ≥ 4,5 ${a} (${c.toFixed(2)})`);
        }

        // ── La barre mène aux sections Métiers, Fonctionnalités (« Les fonctionnalités en action ») et Fiabilité
        for (const [libelle, attendu] of [['Métiers', '#metiers'], ['Fonctionnalités', '#fonctionnalites'], ['Fiabilité', '#fiabilite']]) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await attendre(300);
          const href = await page.evaluate((t) => [...document.querySelectorAll('header a')].find((x) => x.textContent.trim() === t)?.getAttribute('href'), libelle);
          const ancre = (href || '').replace(/^\//, '');
          verifier(ancre === attendu, `« ${libelle} » vise ${attendu} ${a} (${href})`);
          if (auBureau) {
            await cliquer(page, libelle, { dans: 'header' });
          } else {
            await cliquer(page, 'Ouvrir le menu');
            await cliquer(page, libelle, { dans: '#menu-site' });
          }
          await attendre(1500);
          const haut = await page.evaluate((s) => (/^#[a-z][\w-]*$/.test(s) ? document.querySelector(s)?.getBoundingClientRect().top : undefined), ancre);
          verifier(typeof haut === 'number' && haut > -10 && haut < 200, `« ${libelle} » mène à sa section ${ancre} ${a} (haut : ${haut})`);
        }

        // ── Mouvement réduit : compteur et barre fixes, le téléphone change sans fondu, l'explorateur reste utilisable
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        await page.reload({ waitUntil: 'networkidle0' });
        await attendre(500);
        await page.evaluate(() => document.querySelector('[data-compteur]').scrollIntoView({ block: 'center' }));
        await attendre(300);
        const r1 = await lireFiabilite();
        await attendre(3600);
        const r2 = await lireFiabilite();
        verifier(r1.dernier === r2.dernier && r1.part === r2.part, `mouvement réduit : compteur et barre fixes ${a} (${r1.dernier}/${r1.part} → ${r2.dernier}/${r2.part})`);
        verifier(r2.numeros.length > 0 && garanties.length === 4, `mouvement réduit : la fiabilité reste lisible ${a}`);
        if (auBureau) {
          const fondu = await page.evaluate(() => [...document.querySelectorAll('[data-telephone] img')].map((i) => getComputedStyle(i).transitionDuration));
          // 0 s, ou 0,01 ms imposé par la feuille globale de l'app en mouvement réduit (« 1e-05s »)
          verifier(fondu.every((d) => parseFloat(d) <= 0.001), `mouvement réduit : le téléphone change sans fondu ${a} (${fondu.join(', ')})`);
        }
        await cliquer(page, 'Plomberie', { dans: '#metiers' });
        await attendre(300);
        const reduitCartes = await lireCartes();
        verifier(JSON.stringify(reduitCartes.map((c) => c.nom)) === JSON.stringify(lotsPlomberie), `mouvement réduit : l'explorateur change de métier ${a}`);
        await capturer(page, RACINE, `fiabilite-${largeur}-reduit`);
        await browser.close();
      }
    },
  },
  {
    // « Les fonctionnalités en action » (#fonctionnalites) : cinq onglets, chaque exemple utilisable, le vrai générateur
    // de devis chargé à la demande, rien qui quitte la page pendant la signature.
    nom: 'site : fonctionnalités en action',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier, RACINE }) {
      const TRADE_LIBRARY = await bibliotheque(RACINE);
      const lignesCarrelage = Object.values(TRADE_LIBRARY.carrelage.lots).flatMap((l) => l.lignes);

      for (const largeur of [375, 1440]) {
        const a = `à ${largeur} px`;
        const auBureau = largeur >= 1024;
        const fichiersDemandes = [];
        const appelsBase = [];
        const { page, browser } = await ouvrir({
          reel: true, largeur,
          supabase: (req, u) => { appelsBase.push(u.pathname); return json([]); },
          fichiers: (u) => { fichiersDemandes.push(u.pathname); return undefined; },
        });
        const generateur = () => fichiersDemandes.some((p) => /\/devisHtmlBuilder-[^/]*\.js$/.test(p));

        // ── Le générateur de devis n'est pas chargé par le premier écran : seulement quand la section approche
        verifier(!generateur(), `générateur de devis non chargé à l'arrivée ${a}`);
        await page.evaluate(() => document.querySelector('#fonctionnalites')?.scrollIntoView());
        let cadre = false;
        for (let i = 0; i < 40 && !cadre; i++) {
          await attendre(200);
          cadre = await page.evaluate((s) => !!document.querySelector(`${s} iframe`), PANNEAU);
        }
        verifier(cadre && generateur(), `section à l'écran : générateur chargé et document affiché ${a}`);

        // ── Titre, texte, onglets
        const entete = await page.evaluate(() => ({
          titre: document.querySelector('#fonctionnalites h2')?.textContent.trim(),
          intro: document.querySelector('#fonctionnalites [data-intro]')?.textContent.replace(/\s+/g, ' ').trim(),
        }));
        verifier(entete.titre === TITRE_FONCTIONNALITES, `titre « ${TITRE_FONCTIONNALITES} » ${a} (« ${entete.titre} »)`);
        verifier(entete.intro === INTRO_FONCTIONNALITES, `texte d'introduction exact ${a} (« ${entete.intro} »)`);
        const depart = await lireOnglets(page);
        verifier(JSON.stringify(depart.titres) === JSON.stringify(ONGLETS), `cinq onglets aux titres de la spec ${a} (${depart.titres.join(' | ')})`);
        verifier(depart.choisi === ONGLETS[0] && depart.nbChoisis === 1 && depart.tabulables === 1, `premier onglet choisi, seul dans l'ordre de tabulation ${a} (${JSON.stringify(depart)})`);
        verifier(depart.panneauLie, `un seul panneau visible, lié à l'onglet choisi ${a}`);
        const hauteurs = await page.evaluate(() => [...document.querySelectorAll('#fonctionnalites [role="tab"]')].map((o) => o.getBoundingClientRect().height));
        verifier(Math.min(...hauteurs) >= 44, `onglets d'au moins 44 px ${a} (${Math.min(...hauteurs)})`);

        // ── Le document : le vrai générateur, dans un cadre sans script ; les mentions lues dans le HTML produit
        const doc = await page.evaluate((s) => {
          const f = document.querySelector(`${s} iframe`);
          const srcdoc = f?.getAttribute('srcdoc') || '';
          const texte = new DOMParser().parseFromString(srcdoc, 'text/html').body.textContent.replace(/\s+/g, ' ');
          const r = f?.getBoundingClientRect();
          return {
            sandbox: f?.getAttribute('sandbox'),
            titre: f?.getAttribute('title') || '',
            texte,
            visible: !!r && r.width > 100 && r.height > 100,
            mentions: [...document.querySelectorAll(`${s} [data-mention]`)].map((m) => m.textContent.trim()),
            legende: document.querySelector(`${s} [data-legende]`)?.textContent.replace(/\s+/g, ' ').trim(),
          };
        }, PANNEAU);
        verifier(doc.sandbox === '' && doc.visible && doc.titre.length > 10, `document dans un cadre sans script (sandbox vide), visible et nommé ${a}`);
        verifier(doc.texte.includes('DEVIS') && doc.texte.includes('Élec Exemple') && doc.texte.includes('M. Martin'), `le cadre contient « DEVIS », « Élec Exemple » et « M. Martin » ${a}`);
        verifier(doc.mentions.includes('Assurance décennale') && doc.mentions.some((m) => m.includes('TVA')) && doc.mentions.some((m) => m.includes('rétractation')),
          `mentions affichées : assurance décennale, TVA, rétractation ${a} (${doc.mentions.join(' | ')})`);
        const absentes = doc.mentions.filter((m) => !doc.texte.toLowerCase().includes(m.toLowerCase()));
        verifier(absentes.length === 0, `chaque mention affichée est dans le document ${a} (absentes : ${absentes.join(', ')})`);
        verifier(doc.legende === LEGENDES[ONGLETS[0]], `légende « ${LEGENDES[ONGLETS[0]]} » ${a} (« ${doc.legende} »)`);
        await attendre(300);
        await capturerSection(page, RACINE, '#fonctionnalites', `fonctionnalites-${largeur}-1-document`);

        // ── « Voir le document en grand » : visible à toutes les largeurs ; au téléphone, le document s'y lit (police du
        // corps ≥ 10 px CSS), la fenêtre garde le focus, la page derrière ne défile plus, Échap ferme et rend le focus
        const grand = await page.evaluate((s) => {
          const b = [...document.querySelectorAll(`${s} button`)].find((x) => x.innerText.trim() === 'Voir le document en grand');
          const r = b?.getBoundingClientRect();
          return { present: !!b, hauteur: r?.height || 0, actif: !!b && !b.disabled };
        }, PANNEAU);
        verifier(grand.present && grand.actif && grand.hauteur >= 44, `bouton « Voir le document en grand » visible, actif, 44 px ${a} (${JSON.stringify(grand)})`);
        const cGrand = await page.evaluate((s) => {
          const b = [...document.querySelectorAll(`${s} button`)].find((x) => x.innerText.trim() === 'Voir le document en grand');
          b.setAttribute('data-parcours-grand', '');
          return true;
        }, PANNEAU) && await contrasteDe(page, '[data-parcours-grand]');
        verifier(cGrand >= 4.5, `contraste du bouton « Voir le document en grand » ≥ 4,5 ${a} (${cGrand.toFixed(2)})`);
        if (!auBureau) {
          await page.focus('[data-parcours-grand]');
          await page.keyboard.press('Enter');
          await attendre(600);
          const fenetre = await page.evaluate(() => {
            const d = document.querySelector('[role="dialog"][aria-modal="true"]');
            const f = d?.querySelector('iframe');
            const r = f?.getBoundingClientRect();
            const defile = d?.querySelector('[data-defilement-document]');
            const titre = d && document.getElementById(d.getAttribute('aria-labelledby'));
            return {
              ouverte: !!d,
              titre: titre?.textContent.trim() || '',
              focusDedans: !!d && d.contains(document.activeElement),
              focus: document.activeElement?.innerText?.trim() || document.activeElement?.tagName,
              pageBloquee: document.body.style.overflow === 'hidden',
              pageInerte: !!document.querySelector('#root')?.hasAttribute('inert'),
              sandbox: f?.getAttribute('sandbox'),
              echelle: f ? r.width / f.offsetWidth : 0,
              largeurPage: f?.offsetWidth || 0,
              defileEnLargeur: !!defile && defile.scrollWidth > defile.clientWidth,
              memeHtml: f?.getAttribute('srcdoc') === document.querySelector('#panneau-document iframe')?.getAttribute('srcdoc'),
            };
          });
          verifier(fenetre.ouverte && fenetre.titre.length > 0, `la fenêtre s'ouvre, nommée par son titre ${a} (${JSON.stringify(fenetre)})`);
          verifier(fenetre.focusDedans && fenetre.focus === 'Fermer', `le focus va à « Fermer » dans la fenêtre ${a} (${fenetre.focus})`);
          verifier(fenetre.pageBloquee && fenetre.pageInerte, `la page derrière ne défile plus et devient inerte ${a}`);
          verifier(fenetre.sandbox === '' && fenetre.memeHtml && Math.abs(fenetre.echelle - 1) < 0.001 && fenetre.largeurPage === 794 && fenetre.defileEnLargeur,
            `le même document, sans script, à l'échelle 1 et à la largeur d'une page (794 px), qui défile en largeur ${a} (${JSON.stringify(fenetre)})`);
          // Taille de police calculée du corps du document, lue dans le cadre
          const cadreGrand = await (await page.$('[role="dialog"] iframe')).contentFrame();
          const police = await cadreGrand.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize)).catch((e) => `illisible : ${e.message}`);
          verifier(typeof police === 'number' && police * fenetre.echelle >= 10, `police du corps du document ≥ 10 px CSS dans la fenêtre ${a} (${police} px × ${fenetre.echelle})`);
          await capturer(page, RACINE, `fonctionnalites-${largeur}-1-document-en-grand`);
          // Tab ne sort pas de la fenêtre
          for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
          const resteDedans = await page.evaluate(() => {
            const d = document.querySelector('[role="dialog"]');
            return !!d && (d.contains(document.activeElement) || document.activeElement?.tagName === 'IFRAME');
          });
          verifier(resteDedans, `Tab reste dans la fenêtre ${a}`);
          await page.focus('[role="dialog"] button');
          await page.keyboard.press('Escape');
          await attendre(400);
          const fermee = await page.evaluate(() => ({
            ouverte: !!document.querySelector('[role="dialog"][aria-modal="true"]'),
            focusBouton: document.activeElement?.hasAttribute('data-parcours-grand') || false,
            pageBloquee: document.body.style.overflow === 'hidden',
            pageInerte: !!document.querySelector('#root')?.hasAttribute('inert'),
          }));
          verifier(!fermee.ouverte && fermee.focusBouton && !fermee.pageBloquee && !fermee.pageInerte, `Échap ferme la fenêtre, le focus revient au bouton, la page revit ${a} (${JSON.stringify(fermee)})`);
        } else {
          // Au bureau, la fenêtre laisse voir le voile : un clic dessus la ferme et rend le focus au bouton d'ouverture
          // (fermeture au « click », après le focus que le navigateur pose au « mousedown »). Les sentinelles qui
          // gardent le focus dans la fenêtre sont focalisables, donc jamais cachées aux lecteurs d'écran.
          await page.focus('[data-parcours-grand]');
          await page.keyboard.press('Enter');
          await attendre(600);
          const sentinelles = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] [data-sentinelle]')]
            .map((s) => ({ tab: s.tabIndex, cache: s.closest('[aria-hidden="true"]') !== null })));
          verifier(sentinelles.length === 2 && sentinelles.every((s) => s.tab === 0 && !s.cache), `sentinelles focalisables et non cachées ${a} (${JSON.stringify(sentinelles)})`);
          await page.mouse.click(8, 8);
          await attendre(500);
          const parLeVoile = await page.evaluate(() => ({
            ouverte: !!document.querySelector('[role="dialog"][aria-modal="true"]'),
            focusBouton: document.activeElement?.hasAttribute('data-parcours-grand') || false,
            pageInerte: !!document.querySelector('#root')?.hasAttribute('inert'),
          }));
          verifier(!parLeVoile.ouverte && parLeVoile.focusBouton && !parLeVoile.pageInerte, `un clic sur le voile ferme la fenêtre et rend le focus au bouton ${a} (${JSON.stringify(parLeVoile)})`);
        }

        // ── Au clavier : flèche droite passe à l'onglet suivant (choisi, focalisé, son panneau affiché)
        await page.focus('#fonctionnalites [role="tab"][aria-selected="true"]');
        for (let i = 1; i < ONGLETS.length; i++) {
          await page.keyboard.press('ArrowRight');
          await attendre(250);
          const o = await lireOnglets(page);
          verifier(o.choisi === ONGLETS[i] && o.focus === ONGLETS[i] && o.panneauLie && o.tabulables === 1, `flèche droite : « ${ONGLETS[i]} » ${a} (${JSON.stringify({ choisi: o.choisi, focus: o.focus })})`);
        }
        await page.keyboard.press('ArrowRight');
        await attendre(250);
        verifier((await lireOnglets(page)).choisi === ONGLETS[0], `flèche droite après le dernier : retour au premier ${a}`);
        await page.keyboard.press('End');
        await attendre(250);
        verifier((await lireOnglets(page)).choisi === ONGLETS[4], `Fin : dernier onglet ${a}`);
        await page.keyboard.press('ArrowUp');
        await attendre(250);
        verifier((await lireOnglets(page)).choisi === ONGLETS[3], `flèche haut : onglet précédent ${a}`);
        await page.keyboard.press('ArrowDown');
        await attendre(250);
        verifier((await lireOnglets(page)).choisi === ONGLETS[4], `flèche bas : onglet suivant ${a}`);
        await page.keyboard.press('Home');
        await attendre(250);
        verifier((await lireOnglets(page)).choisi === ONGLETS[0], `Début : premier onglet ${a}`);
        await page.keyboard.down('Alt');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.up('Alt');
        await attendre(250);
        verifier((await lireOnglets(page)).choisi === ONGLETS[0], `Alt+flèche droite ne change pas d'onglet ${a}`);
        if (!auBureau) {
          // Au téléphone : seule la rangée de pastilles défile ; la pastille choisie au clavier y est visible
          await page.keyboard.press('End');
          await attendre(500);
          const rangee = await page.evaluate(() => {
            const l = document.querySelector('#fonctionnalites [role="tablist"]');
            const choisi = l.querySelector('[aria-selected="true"]').getBoundingClientRect();
            const r = l.getBoundingClientRect();
            return { defile: l.scrollWidth > l.clientWidth, debordement: getComputedStyle(l).overflowX, gauche: r.left, droite: r.right, choisiGauche: choisi.left, choisiDroite: choisi.right };
          });
          verifier(rangee.defile && ['auto', 'scroll'].includes(rangee.debordement), `pastilles en rangée défilante ${a} (${JSON.stringify(rangee)})`);
          verifier(rangee.gauche >= -1 && rangee.droite <= largeur + 1 && rangee.choisiGauche >= -1 && rangee.choisiDroite <= largeur + 1, `la rangée tient dans l'écran et montre la pastille choisie ${a} (${JSON.stringify(rangee)})`);
          await page.keyboard.press('Home');
          await attendre(300);
        }

        // ── Signature : un trait à la souris, « Valider la signature », le tampon ; rien ne quitte la page
        await choisirOnglet(page, 'Signature en ligne', attendre);
        const carte = await textePanneau(page);
        verifier(carte.includes('Devis DEV-2026-00012 · 2 081,20 € TTC'), `carte « Devis DEV-2026-00012 · 2 081,20 € TTC » ${a}`);
        const validerActif = () => page.evaluate((s) => {
          const b = [...document.querySelectorAll(`${s} button`)].find((x) => x.innerText.trim() === 'Valider la signature');
          return b ? !b.disabled : null;
        }, PANNEAU);
        verifier((await validerActif()) === false, `« Valider la signature » inactif tant que rien n'est tracé ${a}`);
        await capturerSection(page, RACINE, '#fonctionnalites', `fonctionnalites-${largeur}-2-signature`);
        const avant = { fichiers: fichiersDemandes.length, base: appelsBase.length };
        // Un simple toucher (clic sans déplacement) n'est pas une signature
        const centre = await page.evaluate((s) => {
          const c = document.querySelector(`${s} canvas`);
          c.scrollIntoView({ block: 'center', behavior: 'instant' });
          const b = c.getBoundingClientRect();
          return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
        }, PANNEAU);
        await attendre(300);
        await page.mouse.click(centre.x, centre.y);
        await attendre(200);
        verifier((await validerActif()) === false, `un simple toucher n'active pas « Valider la signature » ${a}`);
        await tracer(page);
        await attendre(200);
        verifier((await validerActif()) === true, `un trait à la souris active « Valider la signature » ${a}`);
        await cliquer(page, 'Valider la signature', { dans: '#fonctionnalites' });
        const lireTampon = () => page.evaluate((s) => document.querySelector(`${s} [data-tampon]`)?.textContent.replace(/\s+/g, ' ').trim() || '', PANNEAU);
        const tampon = await lireTampon();
        const aujourdhui = await page.evaluate(() => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; });
        verifier(SIGNE_LE.test(tampon) && tampon.includes(aujourdhui), `tampon « Signé le ${aujourdhui} à HH:MM » ${a} (« ${tampon} »)`);
        const legendeSignature = await page.evaluate((s) => document.querySelector(`${s} [data-legende]`)?.textContent.replace(/\s+/g, ' ').trim(), PANNEAU);
        verifier(legendeSignature === LEGENDES['Signature en ligne'], `légende « ${LEGENDES['Signature en ligne']} » ${a}`);
        verifier(fichiersDemandes.length === avant.fichiers && appelsBase.length === avant.base, `signer n'envoie rien ${a} (${fichiersDemandes.length - avant.fichiers} fichier(s), ${appelsBase.length - avant.base} appel(s) à la base)`);
        await capturerSection(page, RACINE, '#fonctionnalites', `fonctionnalites-${largeur}-2-signature-signee`);
        // Au clavier : « Recommencer », puis « Signer avec mon nom » et « Valider la signature » avec Entrée
        await cliquer(page, 'Recommencer', { dans: '#fonctionnalites' });
        verifier((await lireTampon()) === '' && (await validerActif()) === false, `« Recommencer » efface la signature ${a}`);
        const focaliser = (texte) => page.evaluate((s, t) => {
          const b = [...document.querySelectorAll(`${s} button`)].find((x) => x.innerText.trim() === t);
          b?.focus();
          return document.activeElement === b;
        }, PANNEAU, texte);
        verifier(await focaliser('Signer avec mon nom'), `« Signer avec mon nom » atteignable au clavier ${a}`);
        await page.keyboard.press('Enter');
        await attendre(300);
        verifier(await focaliser('Valider la signature'), `« Valider la signature » actif après « Signer avec mon nom » ${a}`);
        await page.keyboard.press('Enter');
        await attendre(400);
        verifier(SIGNE_LE.test(await lireTampon()), `signé au clavier ${a}`);
        if (!auBureau) {
          // Au doigt
          await cliquer(page, 'Recommencer', { dans: '#fonctionnalites' });
          await tracer(page, { doigt: true });
          await attendre(200);
          verifier((await validerActif()) === true, `un trait au doigt active « Valider la signature » ${a}`);
        }

        // ── Métré : 4 × 3 m, 10 % de chutes → 13,2 m² et le montant de la ligne de carrelage
        await choisirOnglet(page, 'Métré express', attendre);
        const etatInitial = await page.evaluate((s) => document.querySelector(`${s} [data-quantite]`)?.textContent.replace(/\s+/g, ' ').trim(), PANNEAU);
        verifier(/^\d[\d,]* m²$/.test(NORMALISER(etatInitial)) && !NORMALISER(etatInitial).startsWith('0 '), `métré déjà chiffré à l'arrivée ${a} (« ${etatInitial} »)`);
        await capturerSection(page, RACINE, '#fonctionnalites', `fonctionnalites-${largeur}-3-metre`);
        for (const [libelle, valeur] of [['Longueur (m)', '4'], ['Largeur (m)', '3'], ['Nombre', '1'], ['Chutes (%)', '10']]) {
          const id = await page.evaluate((s, l) => [...document.querySelectorAll(`${s} label`)].find((x) => x.textContent.trim() === l)?.htmlFor, PANNEAU, libelle);
          verifier(!!id, `champ « ${libelle} » étiqueté ${a}`);
          await page.click(`#${id}`, { clickCount: 3 });
          await page.keyboard.press('Backspace');
          await page.type(`#${id}`, valeur, { delay: 10 });
        }
        await attendre(400);
        const metre = await page.evaluate((s) => {
          const p = document.querySelector(s);
          return {
            quantite: p.querySelector('[data-quantite]')?.textContent || '',
            montant: p.querySelector('[data-montant]')?.textContent || '',
            designation: p.querySelector('[data-designation]')?.textContent.trim() || '',
            prix: Number(p.querySelector('[data-prix-unitaire]')?.getAttribute('data-prix-unitaire')),
          };
        }, PANNEAU);
        const ligne = lignesCarrelage.find((l) => l.designation === metre.designation);
        verifier(NORMALISER(metre.quantite) === '13,2 m²', `4 × 3 m et 10 % de chutes : 13,2 m² ${a} (« ${NORMALISER(metre.quantite)} »)`);
        verifier(!!ligne && ligne.unite === 'm²' && ligne.prixUnitaire === metre.prix, `une vraie ligne de carrelage de la bibliothèque, au m² ${a} (« ${metre.designation} », ${metre.prix})`);
        const attendu = euros(Math.round(13.2 * (ligne?.prixUnitaire || 0) * 100) / 100);
        verifier(NORMALISER(metre.montant).startsWith(attendu), `montant de la ligne : ${attendu} ${a} (« ${NORMALISER(metre.montant)} »)`);
        await capturerSection(page, RACINE, '#fonctionnalites', `fonctionnalites-${largeur}-3-metre-saisi`);

        // ── Relances : la frise du scénario de devis, chaque étape avec son délai et l'objet du message
        await choisirOnglet(page, 'Relances', attendre);
        // La frise se dessine une fois à l'écran : on l'y amène, puis on laisse l'animation finir
        await page.evaluate((s) => document.querySelector(`${s} ol`).scrollIntoView({ block: 'center', behavior: 'instant' }), PANNEAU);
        await attendre(2500);
        const frise = await page.evaluate((s) => [...document.querySelectorAll(`${s} [data-etape-relance]`)].map((e) => ({
          delai: e.querySelector('[data-delai]')?.textContent.trim() || '',
          nom: e.querySelector('[data-nom]')?.textContent.trim() || '',
          phrase: e.querySelector('[data-phrase]')?.textContent.replace(/\s+/g, ' ').trim() || '',
          opacite: parseFloat(getComputedStyle(e).opacity),
        })), PANNEAU);
        const objets = await page.evaluate((s) => [...document.querySelectorAll(`${s} [data-objet]`)].map((o) => o.textContent.replace(/\s+/g, ' ').trim()), PANNEAU);
        const jours = frise.map((e) => Number((/J\+(\d+)/.exec(e.delai) || [])[1]));
        verifier(frise.length >= 3 && jours.every((j, i) => j > 0 && (i === 0 || j > jours[i - 1])), `frise : au moins trois relances aux délais croissants ${a} (${frise.map((e) => e.delai).join(' | ')})`);
        // L'objet, le même pour les trois relances, est dit une fois en tête ; chaque étape montre la première phrase de
        // son message (modèle de l'app rempli avec le devis fictif), toutes différentes (relecture DA-12)
        verifier(objets.length === 1 && objets[0].includes('Relance : Devis DEV-2026-00012'), `l'objet des messages dit une fois ${a} (${objets.join(' | ')})`);
        verifier(frise.every((e) => e.nom && e.phrase.includes('DEV-2026-00012') && e.phrase.includes('2 081,20 €')) && new Set(frise.map((e) => e.phrase)).size === frise.length,
          `chaque relance a un nom et la première phrase de son message ${a} (${frise.map((e) => e.phrase).join(' | ')})`);
        verifier(frise.every((e) => e.opacite === 1), `toutes les étapes de la frise visibles après l'animation ${a}`);
        const traits = await page.evaluate((s) => {
          const etapes = [...document.querySelectorAll(`${s} ol > li`)];
          const derniere = etapes[etapes.length - 1].getBoundingClientRect();
          const bas = Math.max(...[...document.querySelectorAll(`${s} [data-trait]`)].map((t) => t.getBoundingClientRect().bottom));
          return { traits: document.querySelectorAll(`${s} [data-trait]`).length, etapes: etapes.length, depasse: bas - derniere.top };
        }, PANNEAU);
        verifier(traits.traits === traits.etapes - 1 && traits.depasse <= 1, `le trait de la frise s'arrête à la dernière étape ${a} (${JSON.stringify(traits)})`);
        await choisirOnglet(page, 'Encaissements', attendre);
        await page.evaluate(() => document.querySelector('#onglet-relances').click());
        await attendre(350);
        const retour = await page.evaluate((s) => [...document.querySelectorAll(`${s} [data-etape-relance]`)].map((e) => parseFloat(getComputedStyle(e).opacity)), PANNEAU);
        verifier(retour.every((o) => o === 1), `au retour sur l'onglet, la frise ne se rejoue pas ${a} (${retour.join(', ')})`);
        const legendeRelances = await page.evaluate((s) => document.querySelector(`${s} [data-legende]`)?.textContent.replace(/\s+/g, ' ').trim(), PANNEAU);
        verifier(legendeRelances === LEGENDES.Relances, `légende « ${LEGENDES.Relances} » ${a}`);
        await capturerSection(page, RACINE, '#fonctionnalites', `fonctionnalites-${largeur}-4-relances`);

        // ── Encaissements : « Encaisser » jusqu'au solde, « Payée » seulement au solde exact, jamais plus que le dû
        await choisirOnglet(page, 'Encaissements', attendre);
        const f0 = await lireFacture(page);
        verifier(f0.statut === 'Payée en partie' && NORMALISER(f0.total).includes('4 136,00 €'), `facture de 4 136,00 € payée en partie à l'arrivée ${a} (${f0.statut}, ${NORMALISER(f0.total)})`);
        verifier(NORMALISER(f0.bouton) === 'Encaisser 500 €',`bouton « Encaisser 500 € » ${a} (« ${f0.bouton} »)`);
        await capturerSection(page, RACINE, '#fonctionnalites', `fonctionnalites-${largeur}-5-encaissements`);
        let f = f0;
        let clics = 0;
        while (f.reste > 0 && clics < 12) {
          const prevu = Math.min(500, f.reste);
          const bouton = f.bouton;
          verifier(NORMALISER(bouton) === `Encaisser ${euros(prevu).replace(',00 €', ' €')}`, `le bouton annonce ${euros(prevu)} ${a} (« ${bouton} »)`);
          await cliquer(page, bouton, { dans: '#fonctionnalites' });
          clics++;
          const g = await lireFacture(page);
          verifier(Math.abs(g.reste - (f.reste - prevu)) < 0.001 && g.encaisse <= 4136 + 0.001, `clic ${clics} : ${euros(prevu)} encaissés, reste ${euros(g.reste)} ${a} (${g.reste})`);
          verifier((g.statut === 'Payée') === (g.reste === 0), `« Payée » seulement au solde ${a} (${g.statut}, reste ${g.reste})`);
          f = g;
        }
        verifier(f.reste === 0 && f.statut === 'Payée' && NORMALISER(f.resteTexte).includes('0,00 €') && f.recommencer && !f.bouton, `soldée : « Payée », reste 0,00 €, « Recommencer l'exemple » ${a} (${JSON.stringify(f)})`);
        const hauteurCadreSoldee = await page.evaluate((s) => Math.round(document.querySelector(s).parentElement.getBoundingClientRect().height), PANNEAU);
        const legendeEncaissements = await page.evaluate((s) => document.querySelector(`${s} [data-legende]`)?.textContent.replace(/\s+/g, ' ').trim(), PANNEAU);
        verifier(legendeEncaissements === LEGENDES.Encaissements, `légende « ${LEGENDES.Encaissements} » ${a}`);
        await capturerSection(page, RACINE, '#fonctionnalites', `fonctionnalites-${largeur}-5-encaissements-payee`);
        // « Recommencer l'exemple » : retour à l'état de départ, sans que la barre reparte en arrière
        await page.evaluate((s) => [...document.querySelectorAll(`${s} button`)].find((b) => b.innerText.trim() === "Recommencer l’exemple")?.click(), PANNEAU);
        await attendre(60);
        const r1 = await lireFacture(page);
        await attendre(1000);
        const r2 = await lireFacture(page);
        verifier(r2.statut === 'Payée en partie' && Math.abs(r2.reste - f0.reste) < 0.001, `« Recommencer l'exemple » rend la facture de départ ${a}`);
        verifier(Math.abs(r1.barre - r2.barre) <= 1 && Math.abs(r2.barre - f0.barre) <= 1, `la barre revient d'un coup, sans animation arrière ${a} (${r1.barre} → ${r2.barre}, départ ${f0.barre})`);

        // ── La barre du cadre n'est coupée sur aucun onglet ; au bureau, le cadre a la même hauteur pour les cinq (facture
        // soldée comprise, elle est la plus haute)
        const cadres = [];
        for (const onglet of ONGLETS) {
          await choisirOnglet(page, onglet, attendre);
          cadres.push(await page.evaluate(() => {
            const t = document.querySelector('#fonctionnalites [data-cadre-titre]');
            return {
              titre: t.innerText.trim(),
              coupe: t.scrollWidth > t.clientWidth + 1,
              hauteur: Math.round(document.querySelector('#fonctionnalites [role="tabpanel"]:not([hidden])').parentElement.getBoundingClientRect().height),
            };
          }));
        }
        verifier(cadres.every((c) => !c.coupe), `barre du cadre jamais coupée ${a} (${cadres.map((c) => `${c.titre}${c.coupe ? ' [coupée]' : ''}`).join(' | ')})`);
        if (auBureau) {
          const hauteursCadre = [...cadres.map((c) => c.hauteur), hauteurCadreSoldee];
          verifier(hauteursCadre.every((x) => Math.abs(x - hauteursCadre[0]) <= 1), `même hauteur de cadre pour les cinq onglets ${a} (${hauteursCadre.join(', ')})`);
        }

        // ── Aucun défilement horizontal ; rien ne sort de l'écran hors de la rangée de pastilles (qui défile)
        const debord = await page.evaluate(() => {
          const sortants = [...document.querySelectorAll('#fonctionnalites *')].filter((el) => {
            if (el.closest('[data-decor]') || el.closest('[role="tablist"] [role="tab"]')) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && (r.left < -1 || r.right > innerWidth + 1);
          });
          return { page: document.documentElement.scrollWidth - innerWidth, elements: sortants.slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`) };
        });
        verifier(debord.page <= 0 && debord.elements.length === 0, `aucun défilement horizontal ni élément hors de l'écran ${a} (${debord.page} px ; ${debord.elements.join(' | ')})`);

        // ── Contrastes des textes clés (fond réellement peint derrière)
        await choisirOnglet(page, ONGLETS[0], attendre);
        // Le titre affiché de l'onglet : celui de la spec au bureau, le titre court en dessous (relecture DA-8)
        const titreOnglet = auBureau ? '[data-titre]' : '[data-titre-court]';
        const selecteurs = [
          '#fonctionnalites h2', '#fonctionnalites [data-intro]',
          `#fonctionnalites [role="tab"][aria-selected="true"] ${titreOnglet}`, `#fonctionnalites [role="tab"][aria-selected="false"] ${titreOnglet}`,
          `${PANNEAU} [data-legende]`, `${PANNEAU} [data-mention]`, '#fonctionnalites [data-cadre-titre]',
        ];
        if (auBureau) selecteurs.push('#fonctionnalites [role="tab"][aria-selected="false"] [data-phrase]', '#fonctionnalites [role="tab"][aria-selected="true"] [data-phrase]');
        for (const s of selecteurs) {
          const c = await contrasteDe(page, s);
          verifier(c >= 4.5, `contraste de ${s} ≥ 4,5 ${a} (${c.toFixed(2)})`);
        }
        for (const [onglet, s] of [['Signature en ligne', '[data-montant-devis]'], ['Métré express', '[data-montant]'], ['Métré express', 'label'], ['Relances', '[data-objet]'], ['Relances', '[data-phrase]'], ['Relances', '[data-delai]'], ['Encaissements', '[data-statut-facture]'], ['Encaissements', '[data-reste]']]) {
          await choisirOnglet(page, onglet, attendre);
          const c = await contrasteDe(page, `${PANNEAU} ${s}`);
          verifier(c >= 4.5, `contraste de ${s} (${onglet}) ≥ 4,5 ${a} (${c.toFixed(2)})`);
        }
        await choisirOnglet(page, ONGLETS[0], attendre);

        // ── Mouvement réduit : tout est là d'emblée ; la barre d'encaissement change sans animation
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        await page.reload({ waitUntil: 'networkidle0' });
        await attendre(500);
        await page.evaluate(() => document.querySelector('#fonctionnalites').scrollIntoView());
        for (let i = 0, pret = false; i < 40 && !pret; i++) {
          await attendre(200);
          pret = await page.evaluate((s) => !!document.querySelector(`${s} iframe`), PANNEAU);
        }
        await capturerSection(page, RACINE, '#fonctionnalites', `fonctionnalites-${largeur}-1-document-reduit`);
        await choisirOnglet(page, 'Signature en ligne', attendre);
        await capturerSection(page, RACINE, '#fonctionnalites', `fonctionnalites-${largeur}-2-signature-reduit`);
        await choisirOnglet(page, 'Métré express', attendre);
        await capturerSection(page, RACINE, '#fonctionnalites', `fonctionnalites-${largeur}-3-metre-reduit`);
        await choisirOnglet(page, 'Relances', attendre);
        const opacites = await page.evaluate((s) => [...document.querySelectorAll(`${s} [data-etape-relance]`)].map((e) => parseFloat(getComputedStyle(e).opacity)), PANNEAU);
        verifier(opacites.length >= 3 && opacites.every((o) => o === 1), `mouvement réduit : la frise est entière d'emblée ${a} (${opacites.join(', ')})`);
        await capturerSection(page, RACINE, '#fonctionnalites', `fonctionnalites-${largeur}-4-relances-reduit`);
        await choisirOnglet(page, 'Encaissements', attendre);
        const m0 = await lireFacture(page);
        await page.evaluate((s) => [...document.querySelectorAll(`${s} button`)].find((b) => /^Encaisser/.test(b.innerText.trim()))?.click(), PANNEAU);
        await attendre(40);
        const m1 = await lireFacture(page);
        await attendre(800);
        const m2 = await lireFacture(page);
        verifier(m1.barre > m0.barre && Math.abs(m1.barre - m2.barre) <= 1, `mouvement réduit : la barre d'encaissement change sans animation ${a} (${m0.barre} → ${m1.barre} → ${m2.barre})`);
        await capturerSection(page, RACINE, '#fonctionnalites', `fonctionnalites-${largeur}-5-encaissements-reduit`);
        await browser.close();
      }
    },
  },
  {
    // Tarifs (#pricing) et « construit en public » (#early-adopters) : cartes, tableau de comparaison et textes lus
    // dans PLANS (aucune liste en dur), tableau replié par défaut, arrivées sur /tarifs et /faq, mouvement réduit.
    nom: 'site : tarifs et construit en public',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier, RACINE }) {
      const { PLANS, PLAN_ORDER, MENTION_TVA_ABONNEMENT } = plansDuSite(RACINE);
      // La règle qui sépare une limite d'une fonction (celle du tableau et des cartes), lue dans le module du site
      const { ditUneLimite, LIMITES_AFFICHEES } = charger(RACINE, 'src', 'components', 'landing', 'comparaisonPlans.js');
      // Un prix de PLANS au format français, sans centimes inutiles : « 0 € », « 9,90 € », « 99 € »
      const prix = (n) => (Number.isInteger(n) ? `${n} €` : euros(n));
      const prixDuPlan = (id) => prix(PLANS[id].priceMonthly);
      const plansALAnnee = PLAN_ORDER.filter((id) => PLANS[id].priceYearly > 0);
      const texteAnnuel = `Aussi à l’année : ${plansALAnnee.map((id) => `${prix(PLANS[id].priceYearly)} pour ${PLANS[id].name}`).join(', ')}. ${MENTION_TVA}.`;
      verifier(
        JSON.stringify(PLAN_ORDER.map(prixDuPlan)) === JSON.stringify(['0 €', '9,90 €', '19,90 €']),
        `les prix de PLANS au format de la spec (${PLAN_ORDER.map(prixDuPlan).join(' | ')})`,
      );
      verifier(MENTION_TVA_ABONNEMENT === MENTION_TVA, `la mention de l'outil de prix est celle de D-19 (« ${MENTION_TVA_ABONNEMENT} »)`);
      verifier(
        texteAnnuel === `Aussi à l’année : 99 € pour Artisan, 199 € pour Équipe. ${MENTION_TVA}.`,
        `la ligne de l'offre annuelle lue dans PLANS (« ${texteAnnuel} »)`,
      );
      const tousLesLibelles = [...new Set(PLAN_ORDER.flatMap((id) => PLANS[id].featureLabels.map((f) => f.name)))];

      /** Les cartes de #pricing, telles qu'on les lit. */
      const lireCartes = (page) => page.evaluate(() => [...document.querySelectorAll('#pricing [data-plan]')].map((c) => {
        const bouton = c.querySelector('button, a');
        return {
          id: c.getAttribute('data-plan'),
          nom: c.querySelector('h3')?.textContent.trim() || '',
          prix: c.querySelector('[data-prix]')?.textContent.replace(/\s+/g, ' ').trim() || '',
          unite: c.querySelector('[data-unite]')?.textContent.replace(/\s+/g, ' ').trim() || '',
          libelles: [...c.querySelectorAll('li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()),
          // Le bloc des limites (relecture DA-1) : libellé et valeur de chaque ligne
          limites: [...c.querySelectorAll('[data-limites] [data-limite]')].map((l) => ({
            cle: l.getAttribute('data-limite'),
            libelle: l.querySelector('dt')?.textContent.trim() || '',
            valeur: l.querySelector('dd')?.textContent.replace(/\s+/g, ' ').trim() || '',
          })),
          fondateur: c.querySelector('[data-fondateur]')?.textContent.replace(/\s+/g, ' ').trim() || '',
          sansLimite: c.querySelector('[data-sans-limite]')?.textContent.replace(/\s+/g, ' ').trim() || '',
          badge: c.querySelector('[data-badge]')?.textContent.replace(/\s+/g, ' ').trim() || '',
          bouton: bouton?.innerText.replace(/\s+/g, ' ').trim() || '',
          hauteurBouton: bouton?.getBoundingClientRect().height ?? 0,
          bordure: getComputedStyle(c).borderTopColor,
        };
      }));

      /**
       * La comparaison, telle qu'on la lit : un tableau dès 640 px, une liste sur téléphone (deux présentations des
       * mêmes lignes, une seule rendue). Les lignes et les cases portent les mêmes attributs dans les deux.
       */
      const lireComparaison = (page) => page.evaluate(() => {
        const norm = (x) => (x || '').replace(/\s+/g, ' ').trim();
        const rendu = (el) => el.getClientRects().length > 0;
        const presentation = [...document.querySelectorAll('#pricing [data-rendu]')].find(rendu);
        const lignes = [...document.querySelectorAll('#pricing [data-ligne]')].filter(rendu);
        return {
          visible: lignes.length > 0,
          rendu: presentation?.getAttribute('data-rendu') || null,
          entetes: presentation ? [...presentation.querySelectorAll('[data-entete]')].slice(0, 3).map((e) => norm(e.textContent)) : [],
          groupes: [...document.querySelectorAll('#pricing [data-groupe-titre]')].filter(rendu).map((e) => norm(e.textContent)),
          lignes: lignes.map((el) => ({
            groupe: el.getAttribute('data-groupe'),
            libelle: norm(el.querySelector('[data-libelle]')?.textContent),
            cellules: [...el.querySelectorAll('[data-case]')].map((c) => ({ plan: c.getAttribute('data-plan-nom'), texte: norm(c.textContent), inclus: c.getAttribute('data-inclus') })),
          })),
          note: norm(document.querySelector('#pricing [data-note-tableau]')?.textContent),
          communes: norm(document.querySelector('#pricing [data-communes]')?.textContent),
        };
      });

      for (const largeur of [375, 1440]) {
        const a = `à ${largeur} px`;
        const { page, browser } = await ouvrir({ reel: true, largeur, supabase: () => json([]) });

        // ── Cartes : les trois plans de PLAN_ORDER, lus dans PLANS
        await page.evaluate(() => document.querySelector('#pricing').scrollIntoView());
        await attendre(1200);
        const entete = await page.evaluate(() => ({
          h2: document.querySelectorAll('#pricing h2').length,
          titre: document.querySelector('#pricing h2')?.textContent.trim(),
        }));
        verifier(entete.h2 === 1 && entete.titre.length > 0, `#pricing : un seul titre h2 ${a} (${entete.h2})`);
        const cartes = await lireCartes(page);
        verifier(JSON.stringify(cartes.map((c) => c.id)) === JSON.stringify(PLAN_ORDER), `#pricing : les trois plans de PLAN_ORDER, dans l'ordre ${a} (${cartes.map((c) => c.id).join(', ')})`);
        if (largeur >= 1024) {
          // Au bureau, les trois cartes côte à côte ont la même hauteur : bords du bas alignés, pas d'escalier
          const bords = await page.evaluate(() => [...document.querySelectorAll('#pricing [data-plan]')].map((c) => {
            const r = c.getBoundingClientRect();
            return { haut: Math.round(r.top), bas: Math.round(r.bottom) };
          }));
          verifier(bords.every((b) => Math.abs(b.bas - bords[0].bas) <= 1 && Math.abs(b.haut - bords[0].haut) <= 1),
            `#pricing : cartes de même hauteur, alignées en haut et en bas ${a} (${bords.map((b) => `${b.haut}-${b.bas}`).join(' | ')})`);
        }
        for (const carte of cartes) {
          const plan = PLANS[carte.id];
          verifier(carte.nom === plan.name, `plan ${plan.name} : son nom ${a} (« ${carte.nom} »)`);
          verifier(carte.prix === prixDuPlan(carte.id), `plan ${plan.name} : prix mensuel « ${prixDuPlan(carte.id)} » ${a} (« ${carte.prix} »)`);
          verifier(carte.unite === 'par mois', `plan ${plan.name} : « par mois », jamais « HT » ${a} (« ${carte.unite} »)`);
          // Le même bloc des cinq limites dans chaque carte, aux valeurs de `limits` (relecture DA-1)
          const attenduesLimites = LIMITES_DU_TABLEAU.map(([cle, nom]) => ({ cle, libelle: nom, valeur: valeurDeLimite(cle, plan.limits[cle] ?? -1) }));
          verifier(JSON.stringify(carte.limites) === JSON.stringify(attenduesLimites),
            `plan ${plan.name} : le bloc des cinq limites, valeurs de limits ${a} (${carte.limites.map((l) => `${l.libelle} ${l.valeur}`).join(' | ')})`);
          // Puis exactement les libellés de featureLabels qui ne disent pas une limite, dans l'ordre, sans rien ajouter
          const fonctionsAttendues = plan.featureLabels.filter((f) => f.included && !ditUneLimite(f.name)).map((f) => NORMALISER(f.name));
          verifier(JSON.stringify(carte.libelles.map(NORMALISER)) === JSON.stringify(fonctionsAttendues),
            `plan ${plan.name} : les fonctions de featureLabels, sans doublon des limites ni rien d'ajouté ${a} (${carte.libelles.join(' | ')})`);
          // Chaque libellé de PLANS est dit quelque part dans la carte : tel quel, ou par sa ligne de limite (son chiffre, ou
          // « Illimité » partout pour un libellé « illimités »)
          const nonDits = plan.featureLabels.filter((f) => f.included).map((f) => f.name).filter((nom) => {
            if (!ditUneLimite(nom)) return !carte.libelles.map(NORMALISER).includes(NORMALISER(nom));
            const lignes = LIMITES_AFFICHEES.filter((l) => l.mot.test(nom)).map((l) => carte.limites.find((x) => x.cle === l.cle));
            if (!lignes.length || lignes.some((l) => !l)) return true;
            if (/illimit/i.test(nom)) return !lignes.every((l) => l.valeur === 'Illimité');
            const chiffres = nom.match(/\d+/g) || [];
            return !lignes.some((l) => chiffres.every((c) => (l.valeur.match(/\d+/g) || []).includes(c)));
          });
          verifier(nonDits.length === 0, `plan ${plan.name} : chaque libellé de PLANS est dit dans la carte ou son bloc de limites ${a} (${nonDits.join(' | ')})`);
          if (plan.offreLancement) {
            verifier(carte.fondateur.includes(plan.offreLancement) && carte.fondateur.includes(GARANTIE_FONDATEUR), `plan ${plan.name} : « ${plan.offreLancement} … ${GARANTIE_FONDATEUR} » ${a} (« ${carte.fondateur} »)`);
          } else {
            verifier(carte.fondateur === '', `plan ${plan.name} : pas de tarif fondateur ${a} (« ${carte.fondateur} »)`);
            verifier(carte.sansLimite === 'Sans limite de durée, sans carte bancaire', `plan ${plan.name} : « Sans limite de durée, sans carte bancaire » ${a} (« ${carte.sansLimite} »)`);
          }
          verifier(carte.hauteurBouton >= 44, `plan ${plan.name} : bouton d'au moins 44 px ${a} (${carte.hauteurBouton})`);
        }
        const equipeCarte = cartes.find((c) => c.id === 'equipe');
        verifier(
          JSON.stringify(equipeCarte.libelles) === JSON.stringify(['Tout le plan Artisan'])
            && equipeCarte.limites.find((l) => l.cle === 'equipe')?.valeur === `Vous + ${PLANS.equipe.limits.equipe}`,
          `plan Équipe : ni rôles ni pointage réservés, les collaborateurs dits par la ligne de limite ${a} (${equipeCarte.libelles.join(' | ')})`,
        );
        verifier(cartes.find((c) => c.id === 'artisan').badge === PLANS.artisan.badge, `plan Artisan : pastille « ${PLANS.artisan.badge} » lue dans PLANS ${a} (« ${cartes.find((c) => c.id === 'artisan').badge} »)`);
        verifier(cartes.filter((c) => c.badge).length === 1, `une seule carte mise en avant ${a}`);
        const bordures = cartes.map((c) => c.bordure);
        verifier(bordures[1] === 'rgb(18, 51, 111)' && bordures[0] !== bordures[1] && bordures[2] !== bordures[1], `Artisan : bordure nuit-2, les autres plus discrètes ${a} (${bordures.join(' | ')})`);

        // Rien de l'ancienne grille en dur, aucune affirmation sans source
        const texte = NORMALISER(await page.evaluate(() => document.querySelector('#pricing').textContent));
        const absents = ['Factur-X', "Piste d'audit", "Journal d'audit", 'Support prioritaire', 'Planning basique', '30 articles', 'Trésorerie avancée', 'Sous-traitants', 'Gestion des congés', 'populaire', 'recommandé', 'meilleur choix', 'économisez', '−17', '-17', 'mois offerts', 'remise', 'Pointage', 'Rôles et accès', 'hors taxes'];
        // Apostrophes ramenées à la droite : un texte retiré revenu avec l'apostrophe typographique est trouvé aussi
        const presents = absents.filter((t) => texte.toLowerCase().replace(/’/g, "'").includes(t.toLowerCase()));
        verifier(presents.length === 0, `#pricing : aucun texte de l'ancienne grille ni affirmation sans source ${a} (${presents.join(', ')})`);
        verifier(!/\bHT\b/.test(texte), `#pricing : aucun « HT » (abonnements en franchise de TVA, D-19) ${a}`);
        const textes = await page.evaluate(() => ({
          intro: document.querySelector('#pricing [data-intro]')?.textContent.replace(/\s+/g, ' ').trim(),
          annuel: document.querySelector('#pricing [data-annuel]')?.textContent.replace(/\s+/g, ' ').trim(),
          note: document.querySelector('#pricing [data-note-inscription]')?.textContent.replace(/\s+/g, ' ').trim(),
          bascule: !!document.querySelector('#pricing [role="switch"], #pricing [aria-label*="annuel" i]'),
        }));
        verifier(NORMALISER(textes.intro).includes(`Prix par mois — ${MENTION_TVA}.`), `#pricing : l'introduction dit la franchise de TVA ${a} (« ${textes.intro} »)`);
        verifier(NORMALISER(textes.annuel) === texteAnnuel, `#pricing : ligne de l'offre annuelle, lue dans PLANS, suivie de la mention ${a} (« ${textes.annuel} »)`);
        verifier(!textes.bascule, `#pricing : pas de bascule mensuel / annuel ${a}`);
        verifier(textes.note.includes('depuis « Mon plan »'), `#pricing : le plan payant se prend depuis « Mon plan » ${a} (« ${textes.note} »)`);
        await capturerSection(page, RACINE, '#pricing', `tarifs-${largeur}-replie`);

        // ── Le tableau : replié par défaut, s'ouvre au clic
        const bouton = await page.evaluate((libelle) => {
          const b = [...document.querySelectorAll('#pricing button')].find((x) => x.innerText.trim() === libelle);
          const cible = b ? document.getElementById(b.getAttribute('aria-controls') || '') : null;
          const r = b?.getBoundingClientRect();
          return { present: !!b, etendu: b?.getAttribute('aria-expanded'), cible: !!cible, cache: !!cible?.hidden, hauteur: r?.height ?? 0 };
        }, BOUTON_COMPARER);
        verifier(bouton.present, `« ${BOUTON_COMPARER} » présent ${a}`);
        verifier(bouton.etendu === 'false' && bouton.cible && bouton.cache, `tableau replié par défaut : aria-expanded=false, aria-controls désigne un panneau caché ${a} (${JSON.stringify(bouton)})`);
        verifier(bouton.hauteur >= 44, `« ${BOUTON_COMPARER} » d'au moins 44 px ${a} (${bouton.hauteur})`);
        const ferme = await lireComparaison(page);
        verifier(!ferme.visible, `aucune ligne de comparaison visible tant que le bouton n'est pas cliqué ${a}`);

        // Un vrai clic de souris (le focus suit), pas un clic programmatique
        await page.click('#pricing button[aria-controls]');
        await attendre(900);
        const ouvert = await page.evaluate(() => {
          const b = [...document.querySelectorAll('#pricing button')].find((x) => x.innerText.trim() === 'Comparer les plans en détail');
          return { etendu: b?.getAttribute('aria-expanded'), cache: !!document.getElementById(b?.getAttribute('aria-controls') || '')?.hidden, focus: document.activeElement === b };
        });
        verifier(ouvert.etendu === 'true' && !ouvert.cache, `un clic ouvre le tableau : aria-expanded=true, panneau visible ${a}`);
        verifier(ouvert.focus, `le focus reste sur le bouton ${a}`);
        const tableau = await lireComparaison(page);
        verifier(tableau.visible, `la comparaison des plans est visible ${a}`);
        verifier(tableau.rendu === (largeur >= 640 ? 'tableau' : 'liste'), `comparaison : un tableau dès 640 px, une liste sur téléphone ${a} (${tableau.rendu})`);
        verifier(JSON.stringify(tableau.entetes) === JSON.stringify(PLAN_ORDER.map((id) => PLANS[id].name)), `comparaison : une colonne ou une case par plan, dans l'ordre ${a} (${tableau.entetes.join(' | ')})`);
        // Avec les plans d'aujourd'hui, toutes les fonctions sont dans tous les plans : elles ne font pas de lignes (elles
        // ne comparent rien), le tableau n'a que le groupe des limites (relecture DA-16)
        verifier(JSON.stringify(tableau.groupes.map((g) => g.toLowerCase())) === JSON.stringify(['limites']), `comparaison : le seul groupe des limites ${a} (${tableau.groupes.join(' | ')})`);
        verifier(tableau.lignes.every((l) => JSON.stringify(l.cellules.map((c) => c.plan)) === JSON.stringify(PLAN_ORDER.map((id) => PLANS[id].name))), `comparaison : chaque ligne a une case par plan, dans l'ordre ${a}`);

        // Limites : les valeurs de `limits` de PLANS
        const limites = tableau.lignes.filter((l) => l.groupe === 'Limites');
        verifier(
          JSON.stringify(limites.map((l) => l.libelle)) === JSON.stringify(LIMITES_DU_TABLEAU.map(([, nom]) => nom)),
          `tableau : les cinq limites réellement appliquées ${a} (${limites.map((l) => l.libelle).join(' | ')})`,
        );
        for (const [cle, nom] of LIMITES_DU_TABLEAU) {
          const ligne = limites.find((l) => l.libelle === nom);
          const attendu = PLAN_ORDER.map((id) => valeurDeLimite(cle, PLANS[id].limits[cle]));
          verifier(ligne && JSON.stringify(ligne.cellules.map((c) => c.texte)) === JSON.stringify(attendu), `tableau : ${nom} = ${attendu.join(' | ')} (limits de PLANS) ${a} (${ligne?.cellules.map((c) => c.texte).join(' | ')})`);
        }

        // Fonctions : une ligne seulement pour une fonction qui distingue les plans (aucune aujourd'hui) ; celles de tous
        // les plans sont dites sous le tableau, « Dans tous les plans : … », lues dans PLANS
        const fonctions = tableau.lignes.filter((l) => l.groupe === 'Fonctions');
        verifier(fonctions.length === 0, `comparaison : aucune ligne de fonction (aucune n'est réservée à un plan, D-29) ${a} (${fonctions.map((l) => l.libelle).join(' | ')})`);
        const communes = tousLesLibelles.filter((l) => !ditUneLimite(l) && !/^Tout le plan /.test(l));
        verifier(tableau.communes.startsWith('Dans tous les plans') && communes.every((l) => tableau.communes.includes(NORMALISER(l))),
          `comparaison : « Dans tous les plans : … » dit chaque fonction de PLANS ${a} (« ${tableau.communes} »)`);
        // Aucun libellé de PLANS ne manque : il est une limite (ligne du tableau), « Tout le plan … », ou dans tous les plans
        const manquants = tousLesLibelles.filter((l) => !ditUneLimite(l) && !/^Tout le plan /.test(l) && !tableau.communes.includes(NORMALISER(l)));
        verifier(manquants.length === 0, `tableau : aucune fonction de PLANS oubliée ${a} (${manquants.join(' | ')})`);
        verifier(tableau.note === "Les limites sont celles que l’application applique aujourd’hui.", `comparaison : la note ne parle plus de tiret ${a} (« ${tableau.note} »)`);
        const equipe = limites.find((l) => l.libelle === 'Collaborateurs');
        verifier(JSON.stringify(equipe.cellules.map((c) => c.texte)) === JSON.stringify(['Vous + 1', 'Vous + 1', 'Vous + 10']), `comparaison : la ligne d'équipe reste une limite ${a}`);

        // Jamais de défilement horizontal de la page ; le tableau, s'il déborde, défile dans son propre conteneur
        // (région nommée, au clavier, libellés fixes)
        const defilement = await page.evaluate(() => {
          const t = [...document.querySelectorAll('#pricing table')].find((x) => x.getClientRects().length > 0);
          const c = t?.closest('[data-defilement]');
          return {
            page: document.documentElement.scrollWidth - innerWidth,
            tableau: !!t,
            conteneur: !!c,
            deborde: !!c && c.scrollWidth > c.clientWidth + 1,
            marque: c?.getAttribute('data-deborde') || '',
            tabindex: c?.getAttribute('tabindex'),
            nomme: !!c && !!c.getAttribute('aria-label') && c.getAttribute('role') === 'region',
            colonneFixe: !!t && getComputedStyle(t.querySelector('tbody th[scope="row"]')).position === 'sticky',
            enteteCollant: !!t && [...t.querySelectorAll('thead th')].every((th) => getComputedStyle(th).position === 'sticky' && getComputedStyle(th).top === '64px'),
          };
        });
        verifier(defilement.page <= 0, `comparaison : aucun défilement horizontal de la page ${a} (${defilement.page} px)`);
        verifier(defilement.tableau === (largeur >= 640) && (!defilement.tableau || defilement.conteneur), `comparaison : le tableau est dans un conteneur de défilement ${a} (${JSON.stringify(defilement)})`);
        verifier(!defilement.tableau || (defilement.nomme && defilement.marque === (defilement.deborde ? 'oui' : 'non')), `comparaison : conteneur nommé, débordement mesuré ${a} (${JSON.stringify(defilement)})`);
        verifier(!defilement.tableau || (defilement.tabindex === (defilement.deborde ? '0' : null)), `comparaison : le conteneur ne prend le focus que s'il déborde réellement ${a} (${JSON.stringify(defilement)})`);
        verifier(!defilement.deborde || defilement.colonneFixe, `comparaison : si le tableau déborde, libellés fixes ${a}`);
        if (defilement.tableau) {
          verifier(defilement.enteteCollant, `comparaison : l'en-tête des plans est collant sous la barre fixe (top : 64 px) ${a}`);
          // Vrai défilement : le tableau passe sous la barre, l'en-tête reste juste dessous
          await page.evaluate(() => { const r = document.querySelector('#pricing table').getBoundingClientRect(); window.scrollBy(0, r.top - 64 + 220); });
          await attendre(500);
          const collee = await page.evaluate(() => {
            const t = document.querySelector('#pricing table').getBoundingClientRect();
            return { tableau: Math.round(t.top), entete: [...document.querySelectorAll('#pricing thead th')].map((th) => Math.round(th.getBoundingClientRect().top)) };
          });
          verifier(collee.tableau < 0 && collee.entete.every((h) => Math.abs(h - 64) <= 1), `comparaison : l'en-tête reste collé à 64 px quand le tableau défile ${a} (${JSON.stringify(collee)})`);
          await page.evaluate(() => document.querySelector('#pricing').scrollIntoView());
          await attendre(300);
          // Fenêtre étroite (640 px) : le tableau tient, pas de conteneur au clavier ; élargi de force : il défile, nommé et au clavier
          const ecran = page.viewport();
          await page.setViewport({ ...ecran, width: 640 });
          await attendre(500);
          const etroit = await page.evaluate(() => { const c = document.querySelector('#pricing [data-defilement]'); return { visible: c.getClientRects().length > 0, deborde: c.scrollWidth > c.clientWidth + 1, marque: c.getAttribute('data-deborde'), tabindex: c.getAttribute('tabindex'), page: document.documentElement.scrollWidth - innerWidth }; });
          verifier(etroit.visible && !etroit.deborde && etroit.marque === 'non' && etroit.tabindex === null && etroit.page <= 0, `comparaison à 640 px : le tableau tient, sans focus de conteneur ${a} (${JSON.stringify(etroit)})`);
          await page.addStyleTag({ content: '#pricing table { min-width: 900px !important; }' });
          await attendre(500);
          const force = await page.evaluate(() => { const c = document.querySelector('#pricing [data-defilement]'); return { deborde: c.scrollWidth > c.clientWidth + 1, marque: c.getAttribute('data-deborde'), tabindex: c.getAttribute('tabindex'), defile: getComputedStyle(c).overflowX, nomme: c.getAttribute('role') === 'region' && !!c.getAttribute('aria-label'), page: document.documentElement.scrollWidth - innerWidth }; });
          verifier(force.deborde && force.marque === 'oui' && force.tabindex === '0' && force.defile === 'auto' && force.nomme && force.page <= 0, `comparaison élargie de force : défilement dans son conteneur, au clavier, nommé, page intacte ${a} (${JSON.stringify(force)})`);
          await page.setViewport(ecran);
          await attendre(300);
        }
        await capturerSection(page, RACINE, '#pricing', `tarifs-${largeur}-ouvert`);

        // Fermer et rouvrir : le panneau suit
        await cliquer(page, BOUTON_COMPARER, { dans: '#pricing' });
        await attendre(300);
        const refermé = await page.evaluate(() => {
          const b = [...document.querySelectorAll('#pricing button')].find((x) => x.innerText.trim() === 'Comparer les plans en détail');
          return { etendu: b.getAttribute('aria-expanded'), cache: document.getElementById(b.getAttribute('aria-controls')).hidden };
        });
        verifier(refermé.etendu === 'false' && refermé.cache, `un second clic referme le tableau ${a}`);
        await cliquer(page, BOUTON_COMPARER, { dans: '#pricing' });
        await attendre(300);

        // ── Les boutons des cartes mènent à l'inscription actuelle
        await page.evaluate(() => document.querySelector('#pricing [data-plan="artisan"]').scrollIntoView({ block: 'center' }));
        await attendre(300);
        const nbInscriptions = await page.evaluate(() => document.querySelectorAll('#pricing [data-plan] button').length);
        verifier(nbInscriptions === PLAN_ORDER.length, `#pricing : un bouton d'inscription par plan ${a} (${nbInscriptions})`);

        // ── Construit en public
        await page.evaluate(() => document.querySelector('#early-adopters').scrollIntoView());
        await attendre(1200);
        const public_ = await page.evaluate(() => {
          const s = document.querySelector('#early-adopters');
          const norm = (x) => (x || '').replace(/\s+/g, ' ').trim();
          const b = s?.querySelector('button, a');
          const cs = b ? getComputedStyle(b) : null;
          return {
            h2: [...(s?.querySelectorAll('h2') || [])].map((h) => norm(h.textContent)),
            intro: norm(s?.querySelector('[data-intro]')?.textContent),
            cartes: [...(s?.querySelectorAll('[data-carte-public]') || [])].map((c) => ({ titre: norm(c.querySelector('h3')?.textContent), texte: norm(c.querySelector('p')?.textContent), complet: norm(c.textContent) })),
            bouton: norm(b?.innerText),
            fond: cs?.backgroundColor,
            couleur: cs?.color,
            hauteur: b?.getBoundingClientRect().height ?? 0,
            texteComplet: norm(s?.textContent),
          };
        });
        verifier(public_.h2.length === 1, `#early-adopters : un seul titre h2 ${a} (${public_.h2.join(' | ')})`);
        verifier(public_.intro === TEXTE_CONSTRUIT_EN_PUBLIC, `#early-adopters : texte exact de la spec ${a} (« ${public_.intro} »)`);
        verifier(JSON.stringify(public_.cartes.map((c) => c.titre)) === JSON.stringify(CARTES_PUBLIC), `#early-adopters : quatre cartes aux titres vérifiés ${a} (${public_.cartes.map((c) => c.titre).join(' | ')})`);
        const garantie = public_.cartes[2].texte;
        verifier(garantie.includes(GARANTIE_FONDATEUR) && garantie.includes('tarif fondateur'), `#early-adopters : la garantie du tarif dit D-08, ${GARANTIE_FONDATEUR} ${a} (« ${garantie} »)`);
        verifier(public_.cartes[0].texte.includes('bouton de retours') && !public_.cartes[0].texte.includes('Un bug ? Une idée ?'), `#early-adopters : « le bouton de retours », pas le libellé qui n'est qu'une icône entre 768 et 1279 px ${a} (« ${public_.cartes[0].texte} »)`);
        verifier(public_.cartes[2].complet.includes(MENTION_TVA) && !/\bHT\b/.test(public_.texteComplet), `#early-adopters : la mention de franchise de TVA, aucun « HT » ${a}`);
        verifier(public_.cartes[2].complet.includes(`Artisan ${prixDuPlan('artisan')} par mois`) && public_.cartes[2].complet.includes(`Équipe ${prixDuPlan('equipe')} par mois`), `#early-adopters : les prix du tarif fondateur lus dans PLANS ${a}`);
        const enTrop = ['Réponse rapide', "file d'attente", 'Zéro risque', 'premiers artisans', "n'augmentera pas", 'logiciel établi', 'maintenant'].filter((t) => public_.texteComplet.replace(/’/g, "'").includes(t));
        verifier(enTrop.length === 0, `#early-adopters : aucune affirmation sans source de l'ancienne version ${a} (${enTrop.join(', ')})`);
        verifier(public_.bouton.startsWith('Créer mon compte gratuit') && public_.fond === 'rgb(18, 51, 111)' && public_.couleur === 'rgb(255, 255, 255)', `#early-adopters : pilule nuit-2 à texte blanc, plus de bouton noir ${a} (« ${public_.bouton} », ${public_.fond}, ${public_.couleur})`);
        verifier(public_.hauteur >= 44, `#early-adopters : bouton d'au moins 44 px ${a} (${public_.hauteur})`);
        await capturerSection(page, RACINE, '#early-adopters', `public-${largeur}`);

        // ── Aucun débordement ni élément hors de l'écran dans les deux sections (le conteneur du tableau défile)
        const debord = await page.evaluate(() => {
          const sortants = [...document.querySelectorAll('#pricing *, #early-adopters *')].filter((el) => {
            if (el.closest('[data-decor]') || el.closest('[data-defilement]')) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && (r.left < -1 || r.right > innerWidth + 1);
          });
          return { page: document.documentElement.scrollWidth - innerWidth, elements: sortants.slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`) };
        });
        verifier(debord.page <= 0 && debord.elements.length === 0, `tarifs et construit en public sans débordement ${a} (${debord.page} px ; ${debord.elements.join(' | ')})`);

        // ── Cibles tactiles de 44 px
        const petites = await page.evaluate(() => [...document.querySelectorAll('#pricing button, #pricing a, #early-adopters button, #early-adopters a')]
          .filter((el) => el.getClientRects().length > 0)
          .map((el) => ({ texte: el.innerText.trim().slice(0, 30), h: el.getBoundingClientRect().height }))
          .filter((x) => x.h < 44));
        verifier(petites.length === 0, `cibles de 44 px au moins ${a} (${petites.map((x) => `${x.texte} ${x.h}`).join(' | ')})`);

        // ── Contrastes des textes clés (fond réellement peint derrière) ; la présentation de la comparaison rendue
        // est marquée, pour mesurer celle qu'on voit (l'autre est en `display: none`)
        await page.evaluate(() => [...document.querySelectorAll('#pricing [data-rendu]')].filter((e) => e.getClientRects().length > 0).forEach((e) => e.setAttribute('data-rendu-visible', '')));
        for (const selecteur of [
          '#pricing h2', '#pricing [data-intro]', '#pricing [data-plan] h3', '#pricing [data-prix]', '#pricing [data-unite]',
          '#pricing [data-plan] li', '#pricing [data-fondateur]', '#pricing [data-badge]', '#pricing [data-plan="gratuit"] button',
          '#pricing [data-plan="artisan"] button', '#pricing [data-note-inscription]', '#pricing [data-annuel]', '#pricing [data-sans-limite]', '#early-adopters [data-carte-public] ul + p',
          '[data-rendu-visible] [data-entete]', '[data-rendu-visible] [data-libelle]', '[data-rendu-visible] [data-case]', '[data-rendu-visible] [data-groupe-titre]', '#pricing [data-note-tableau]',
          '#early-adopters h2', '#early-adopters [data-intro]', '#early-adopters h3', '#early-adopters [data-carte-public] p', '#early-adopters button',
        ]) {
          const c = await contrasteDe(page, selecteur);
          verifier(c >= 4.5, `contraste de ${selecteur} ≥ 4,5 ${a} (${c.toFixed(2)})`);
        }

        // ── Le bouton « Créer mon compte gratuit » de la section ouvre l'inscription
        await page.evaluate(() => document.querySelector('#early-adopters button, #early-adopters a').scrollIntoView({ block: 'center' }));
        await cliquer(page, 'Créer mon compte gratuit', { dans: '#early-adopters' });
        await attendre(800);
        const email = await page.evaluate(() => {
          const champ = document.querySelector('input[type="email"]');
          const r = champ?.getBoundingClientRect();
          return !!r && r.width > 0 && r.height > 0;
        });
        verifier(email, `« Créer mon compte gratuit » (construit en public) ouvre un champ e-mail ${a}`);
        await browser.close();

        // ── Un bouton de carte ouvre la même inscription
        const second = await ouvrir({ reel: true, largeur, supabase: () => json([]) });
        await second.page.evaluate(() => document.querySelector('#pricing [data-plan="artisan"]').scrollIntoView({ block: 'center' }));
        await attendre(500);
        await second.page.evaluate(() => document.querySelector('#pricing [data-plan="artisan"] button').click());
        await attendre(800);
        const emailCarte = await second.page.evaluate(() => {
          const champ = document.querySelector('input[type="email"]');
          const r = champ?.getBoundingClientRect();
          return !!r && r.width > 0 && r.height > 0;
        });
        verifier(emailCarte, `le bouton de la carte Artisan ouvre l'inscription ${a}`);
        await second.browser.close();

        // ── Mouvement réduit : tout est lisible d'emblée, le tableau s'ouvre sans transition
        const reduit = await ouvrir({ reel: true, largeur, supabase: () => json([]) });
        await reduit.page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        await reduit.page.reload({ waitUntil: 'networkidle0' });
        await attendre(500);
        await reduit.page.evaluate(() => document.querySelector('#pricing').scrollIntoView());
        await attendre(150);
        const opacites = await reduit.page.evaluate(() => [...document.querySelectorAll('#pricing [data-plan], #pricing h2, #early-adopters h2')].map((el) => {
          let o = 1;
          for (let n = el; n; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
          return o;
        }));
        verifier(opacites.length === PLAN_ORDER.length + 2 && opacites.every((o) => o === 1), `mouvement réduit : cartes et titres entièrement visibles d'emblée ${a} (${opacites.join(', ')})`);
        await cliquer(reduit.page, BOUTON_COMPARER, { dans: '#pricing' });
        await attendre(60);
        const tableReduit = await lireComparaison(reduit.page);
        verifier(tableReduit.visible, `mouvement réduit : la comparaison s'ouvre ${a}`);
        const opaciteTable = await reduit.page.evaluate(() => {
          let o = 1;
          for (const n of [...document.querySelectorAll('#pricing [data-ligne]')].filter((x) => x.getClientRects().length > 0).slice(0, 1)) {
            for (let m = n; m; m = m.parentElement) o *= parseFloat(getComputedStyle(m).opacity);
          }
          return o;
        });
        verifier(opaciteTable === 1, `mouvement réduit : la comparaison est opaque dès l'ouverture ${a} (${opaciteTable})`);
        await capturerSection(reduit.page, RACINE, '#pricing', `tarifs-${largeur}-reduit`);
        await reduit.browser.close();

        // ── Arrivée sur /tarifs et /faq : la section est dans la fenêtre
        for (const [chemin, section] of [['/tarifs', '#pricing'], ['/faq', '#faq']]) {
          const arrivee = await ouvrir({ reel: true, largeur, chemin, supabase: () => json([]) });
          await attendre(1500);
          const haut = await arrivee.page.evaluate((s) => document.querySelector(s)?.getBoundingClientRect().top, section);
          verifier(typeof haut === 'number' && haut > -10 && haut < 200, `arrivée sur ${chemin} : ${section} dans la fenêtre ${a} (haut : ${haut})`);
          await arrivee.browser.close();
        }
      }
    },
  },
  {
    // FAQ (#faq), dernier appel et pied de page de l'accueil (tâche 7) : réponses lues dans faq.js (elles-mêmes lues
    // dans PLANS), accordéon accessible, textes exacts de la spec pour le dernier appel, pied de page à la charte.
    nom: 'site : FAQ, dernier appel et pied de page',
    reel: true,
    async executer({ ouvrir, attendre, verifier, RACINE }) {
      const { questionsFaq } = charger(RACINE, 'src', 'components', 'landing', 'faq.js');
      const { PLANS } = plansDuSite(RACINE);
      const questions = questionsFaq();
      verifier(questions.length >= 10, `la FAQ a ses questions (${questions.length})`);

      for (const largeur of [375, 1440]) {
        const a = `à ${largeur} px`;
        const { page, browser } = await ouvrir({ reel: true, largeur, supabase: () => json([]) });

        // ── FAQ : un titre, toutes les questions, l'accordéon s'ouvre au clic et le dit (aria-expanded)
        await page.evaluate(() => document.querySelector('#faq').scrollIntoView());
        await attendre(700);
        const faq = await page.evaluate(() => {
          const s = document.querySelector('#faq');
          const boutons = [...s.querySelectorAll('[data-question]')];
          return {
            h2: [...s.querySelectorAll('h2')].map((h) => h.textContent.trim()),
            // Les blancs du code sont repliés, pas les espaces fines insécables du texte (typographie fine du site)
            questions: boutons.map((b) => b.textContent.replace(/[ \t\n\r]+/g, ' ').trim()),
            fermees: boutons.every((b) => b.getAttribute('aria-expanded') === 'false'),
            liees: boutons.every((b) => !!document.getElementById(b.getAttribute('aria-controls') || '-')),
            jsonLd: (() => {
              try { return JSON.parse(document.getElementById('faq-jsonld')?.textContent || '{}').mainEntity?.length || 0; } catch { return -1; }
            })(),
          };
        });
        verifier(faq.h2.length === 1, `#faq : un seul titre h2 ${a} (${faq.h2.join(' | ')})`);
        // Composition : au bureau, le titre à gauche et les questions à droite (plus de moitié droite vide) ; au
        // téléphone, une colonne, le contact après les questions
        const composition = await page.evaluate(() => {
          const r = (s) => document.querySelector(s)?.getBoundingClientRect();
          const titre = r('#faq h2');
          const questions = r('#faq ul');
          const contact = r('#faq [data-contact-faq]');
          const section = document.querySelector('#faq > div').getBoundingClientRect();
          return { titreG: titre.left, titreD: titre.right, questionsG: questions.left, questionsD: questions.right, questionsBas: questions.bottom, contactHaut: contact.top, contenuD: section.right };
        });
        if (largeur >= 1024) {
          verifier(composition.questionsG >= composition.titreD && composition.contenuD - composition.questionsD <= 40,
            `#faq : titre à gauche, questions à droite jusqu'au bord du contenu ${a} (${JSON.stringify(composition)})`);
        } else {
          verifier(composition.contactHaut >= composition.questionsBas, `#faq : au téléphone, le contact après les questions ${a} (${JSON.stringify(composition)})`);
        }
        verifier(JSON.stringify(faq.questions) === JSON.stringify(questions.map((q) => q.q)), `#faq : les questions de faq.js, dans l'ordre ${a} (${faq.questions.length})`);
        verifier(faq.fermees && faq.liees, `#faq : questions fermées à l'arrivée, chacune liée à sa réponse (aria-controls) ${a}`);
        verifier(faq.jsonLd === questions.length, `#faq : données structurées FAQPage, une entrée par question ${a} (${faq.jsonLd})`);

        // Sous 1024 px : six questions, puis « Voir les N autres questions » (N compté dans faq.js) ; le bouton dit
        // aria-expanded, et à l'ouverture le focus va à la septième question (relecture DA-15)
        if (largeur < 1024) {
          const replie = await page.evaluate(() => {
            const visibles = [...document.querySelectorAll('#faq [data-question]')].filter((b) => b.getClientRects().length > 0);
            const bouton = document.querySelector('#faq [data-voir-autres]');
            return { visibles: visibles.length, texte: bouton?.innerText.trim() || '', etendu: bouton?.getAttribute('aria-expanded'), liste: !!document.getElementById(bouton?.getAttribute('aria-controls') || '-'), hauteur: bouton?.getBoundingClientRect().height || 0 };
          });
          verifier(replie.visibles === 6 && replie.texte === `Voir les ${questions.length - 6} autres questions` && replie.etendu === 'false' && replie.liste && replie.hauteur >= 44,
            `#faq : six questions, puis « Voir les ${questions.length - 6} autres questions » ${a} (${JSON.stringify(replie)})`);
          await page.click('#faq [data-voir-autres]');
          await attendre(400);
          const deplie = await page.evaluate((septieme) => ({
            visibles: [...document.querySelectorAll('#faq [data-question]')].filter((b) => b.getClientRects().length > 0).length,
            focus: document.activeElement?.hasAttribute('data-question') ? document.activeElement.textContent.trim() : document.activeElement?.tagName,
            attendu: septieme,
          }), questions[6].q);
          verifier(deplie.visibles === questions.length && deplie.focus === deplie.attendu, `#faq : toutes les questions, le focus sur la septième ${a} (${JSON.stringify(deplie)})`);
        }

        // Ouvrir « Puis-je essayer avant de payer ? » : la réponse est lue dans faq.js (limites et prix de PLANS)
        const essai = questions.find((q) => q.q.startsWith('Puis-je essayer'));
        await page.evaluate((q) => [...document.querySelectorAll('#faq [data-question]')].find((b) => b.textContent.includes(q)).click(), essai.q);
        await attendre(500);
        const ouverte = await page.evaluate((q) => {
          const b = [...document.querySelectorAll('#faq [data-question]')].find((x) => x.textContent.includes(q));
          const r = document.getElementById(b.getAttribute('aria-controls'));
          let o = 1;
          for (let n = r; n; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
          return { etat: b.getAttribute('aria-expanded'), texte: (r?.innerText || '').replace(/[\s  ]+/g, ' ').trim(), opacite: o, hauteur: r?.getBoundingClientRect().height || 0 };
        }, essai.q);
        verifier(ouverte.etat === 'true' && ouverte.hauteur > 20 && ouverte.opacite === 1, `#faq : la réponse s'ouvre au clic ${a} (${JSON.stringify({ ...ouverte, texte: undefined })})`);
        verifier(NORMALISER(ouverte.texte) === NORMALISER(essai.a), `#faq : la réponse affichée est celle de faq.js ${a}`);
        const { devis, clients, chantiers } = PLANS.gratuit.limits;
        verifier(ouverte.texte.includes(`${devis} devis par mois`) && ouverte.texte.includes(`${clients} clients`) && ouverte.texte.includes(`${chantiers} chantiers`) && !/actifs/.test(ouverte.texte),
          `#faq : limites du plan Gratuit lues dans PLANS, « ${chantiers} chantiers » sans « actifs » ${a}`);
        verifier(ouverte.texte.includes(MENTION_TVA) && !/\bHT\b/.test(ouverte.texte), `#faq : prix avec la mention de franchise de TVA, jamais « HT » ${a}`);
        await capturerSection(page, RACINE, '#faq', `faq-${largeur}`);

        // Filtre par catégorie : boutons aria-pressed, une seule catégorie pressée
        const categories = await page.evaluate(() => [...document.querySelectorAll('#faq [data-categorie]')].map((b) => ({ texte: b.textContent.trim(), presse: b.getAttribute('aria-pressed'), h: b.getBoundingClientRect().height })));
        verifier(categories.length >= 2 && categories.filter((c) => c.presse === 'true').length === 1, `#faq : catégories en boutons pressables, une seule pressée ${a} (${categories.map((c) => c.texte).join(', ')})`);
        await page.evaluate(() => [...document.querySelectorAll('#faq [data-categorie]')].find((b) => b.textContent.trim() === 'Tarifs').click());
        await attendre(400);
        const tarifs = await page.evaluate(() => [...document.querySelectorAll('#faq [data-question]')].map((b) => b.textContent.trim()));
        const attendues = questions.filter((q) => q.categorie === 'pricing').map((q) => q.q);
        verifier(JSON.stringify(tarifs) === JSON.stringify(attendues), `#faq : « Tarifs » ne garde que les questions de tarifs ${a} (${tarifs.length})`);

        // ── Dernier appel : textes exacts de la spec, deux pilules
        const dernier = await page.evaluate(() => {
          const s = document.querySelector('[data-dernier-appel]');
          if (!s) return null;
          s.scrollIntoView();
          const liens = [...s.querySelectorAll('a, button')];
          const creer = liens.find((x) => x.innerText.trim().startsWith('Créer mon compte gratuit'));
          const demo = liens.find((x) => x.innerText.trim() === 'Voir la démo');
          const cs = creer ? getComputedStyle(creer) : null;
          return {
            h2: s.querySelector('h2')?.textContent.trim(),
            signature: s.querySelector('[data-signature]')?.textContent.trim(),
            creer: !!creer, demo: demo?.getAttribute('href') || '',
            fond: cs?.backgroundColor, couleur: cs?.color,
            texte: s.textContent,
          };
        });
        verifier(dernier && dernier.h2 === 'Votre prochain devis, dès ce soir.', `dernier appel : titre de la spec ${a} (« ${dernier?.h2} »)`);
        verifier(dernier.signature === 'Mallettico — tout y est, rien ne pèse.', `dernier appel : la ligne de la spec ${a} (« ${dernier.signature} »)`);
        verifier(dernier.creer && dernier.fond === 'rgb(18, 51, 111)' && dernier.couleur === 'rgb(255, 255, 255)', `dernier appel : « Créer mon compte gratuit » en pilule nuit-2 à texte blanc ${a} (${dernier.fond}, ${dernier.couleur})`);
        verifier(dernier.demo === '/?demo=true', `dernier appel : « Voir la démo » mène à la démo ${a} (${dernier.demo})`);
        const promesses = ['vitesse supérieure', '2 minutes', 'Sans engagement', 'tableurs'].filter((t) => dernier.texte.includes(t));
        verifier(promesses.length === 0, `dernier appel : aucune promesse non vérifiée ${a} (${promesses.join(', ')})`);
        await attendre(500);
        await capturerSection(page, RACINE, '[data-dernier-appel]', `dernier-appel-${largeur}`);

        // ── Pied de page : bleu-noir, logo, liens actuels sans « Blog », pilule blanche à texte nuit, rien d'éteint
        const pied = await page.evaluate(() => {
          const f = document.querySelector('footer');
          f.scrollIntoView();
          const contact = f.querySelector('[data-contact]');
          const cs = contact ? getComputedStyle(contact) : null;
          return {
            fond: getComputedStyle(f).backgroundColor,
            logo: f.querySelector('svg[role="img"]')?.getAttribute('aria-label') || '',
            liens: [...f.querySelectorAll('a')].map((l) => ({ texte: l.innerText.trim(), href: l.getAttribute('href') || '' })),
            texte: f.textContent,
            contact: contact ? { href: contact.getAttribute('href'), fond: cs.backgroundColor, couleur: cs.color, h: contact.getBoundingClientRect().height } : null,
          };
        });
        verifier(pied.fond === 'rgb(11, 19, 36)', `pied de page bleu-noir #0B1324 ${a} (${pied.fond})`);
        verifier(pied.logo === 'Mallettico', `pied de page : le logo LogoMallettico ${a} (« ${pied.logo} »)`);
        const libelles = pied.liens.map((l) => l.texte);
        const attendus = ['Fonctionnalités', 'Tarifs', 'Signature électronique', 'Relances automatiques', 'Facture électronique', 'Ressources', 'Pourquoi Mallettico', 'FAQ', 'Mentions légales', 'CGU', 'CGV', 'Confidentialité'];
        const manquants = attendus.filter((t) => !libelles.includes(t));
        verifier(manquants.length === 0, `pied de page : les liens actuels ${a} (manquent : ${manquants.join(', ')})`);
        verifier(!/Blog|Bientôt/.test(pied.texte), `pied de page : ni « Blog » ni « Bientôt » ${a}`);
        const eteints = pied.liens.filter((l) => /\/pay\/|\/portal|portail|paiement/i.test(`${l.href} ${l.texte}`));
        verifier(eteints.length === 0, `pied de page : aucun lien vers une fonction éteinte ${a} (${eteints.map((l) => l.href).join(', ')})`);
        verifier(pied.contact && pied.contact.href === 'mailto:contact@mallettico.fr' && pied.contact.fond === 'rgb(255, 255, 255)' && pied.contact.couleur === 'rgb(13, 46, 108)' && pied.contact.h >= 44,
          `pied de page : le contact en pilule blanche à texte nuit, plus de bouton orange ${a} (${JSON.stringify(pied.contact)})`);
        await capturerSection(page, RACINE, 'footer', `pied-${largeur}`);

        // ── Les trois blocs : sans débordement, cibles de 44 px, contrastes, aucun texte orange
        const debord = await page.evaluate(() => {
          const sortants = [...document.querySelectorAll('#faq *, [data-dernier-appel] *, footer *')].filter((el) => {
            if (el.closest('[data-decor]')) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && (r.left < -1 || r.right > innerWidth + 1);
          });
          return { page: document.documentElement.scrollWidth - innerWidth, elements: sortants.slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`) };
        });
        verifier(debord.page <= 0 && debord.elements.length === 0, `FAQ, dernier appel et pied de page sans débordement ${a} (${debord.page} px ; ${debord.elements.join(' | ')})`);
        const petites = await page.evaluate(() => [...document.querySelectorAll('#faq button, #faq a, [data-dernier-appel] a, [data-dernier-appel] button, footer a, footer button')]
          .filter((el) => el.getClientRects().length > 0)
          .map((el) => ({ texte: el.innerText.trim().slice(0, 30), h: el.getBoundingClientRect().height }))
          .filter((x) => x.h < 44));
        verifier(petites.length === 0, `cibles de 44 px au moins ${a} (${petites.map((x) => `${x.texte} ${x.h}`).join(' | ')})`);
        const oranges = await page.evaluate(() => [...document.querySelectorAll('#faq *, [data-dernier-appel] *, footer *')]
          .filter((el) => el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
          .filter((el) => ['rgb(238, 123, 32)', 'rgb(249, 115, 22)', 'rgb(234, 88, 12)', 'rgb(251, 146, 60)', 'rgb(253, 186, 116)'].includes(getComputedStyle(el).color))
          .map((el) => el.textContent.trim().slice(0, 30)));
        verifier(oranges.length === 0, `aucun texte orange ${a} (${oranges.join(' | ')})`);
        for (const selecteur of ['#faq h2', '#faq [data-intro]', '#faq [data-question]', '#faq [data-categorie][aria-pressed="true"]', '#faq [data-categorie][aria-pressed="false"]', '#faq [data-reponse]', '#faq [data-contact-faq]',
          '[data-dernier-appel] h2', '[data-dernier-appel] [data-signature]', 'footer [data-accroche]', 'footer [data-titre-colonne]', 'footer li a', 'footer [data-copyright]', 'footer [data-contact]']) {
          const c = await contrasteDe(page, selecteur);
          verifier(c >= 4.5, `contraste de ${selecteur} ≥ 4,5 ${a} (${c.toFixed(2)})`);
        }
        await browser.close();

        // ── Mouvement réduit : FAQ, dernier appel et pied de page lisibles d'emblée
        const reduit = await ouvrir({ reel: true, largeur, supabase: () => json([]) });
        await reduit.page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        await reduit.page.reload({ waitUntil: 'networkidle0' });
        await attendre(500);
        await reduit.page.evaluate(() => document.querySelector('#faq').scrollIntoView());
        await attendre(150);
        const opacites = await reduit.page.evaluate(() => [...document.querySelectorAll('#faq h2, #faq [data-question], [data-dernier-appel] h2, footer')].map((el) => {
          let o = 1;
          for (let n = el; n; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
          return o;
        }));
        verifier(opacites.length >= questions.length + 3 && opacites.every((o) => o === 1), `mouvement réduit : FAQ, dernier appel et pied de page opaques d'emblée ${a}`);
        await reduit.browser.close();
      }
    },
  },
  {
    // Sous-pages marketing (tâche 7) : /fonctionnalites, une page de détail, /ressources, à la charte « Glacier vif ».
    nom: 'site : sous-pages',
    reel: true,
    async executer({ ouvrir, attendre, verifier, RACINE }) {
      const CHEMINS = ['/fonctionnalites', '/fonctionnalites/devis-factures', '/fonctionnalites/relances', '/fonctionnalites/signature-electronique', '/ressources'];
      for (const largeur of [375, 1440]) {
        const a = `à ${largeur} px`;
        for (const chemin of CHEMINS) {
          const ou = `${chemin} ${a}`;
          const { page, browser, erreurs } = await ouvrir({ reel: true, largeur, chemin, supabase: () => json([]) });
          await attendre(800);
          // À l'arrivée : les images du premier écran ne sont pas paresseuses, la première est prioritaire ; rien du
          // premier écran n'est transparent (aucune apparition n'y attend)
          const arrivee = await page.evaluate(() => {
            const dansLEcran = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0; };
            const imgs = [...document.querySelectorAll('main img')].filter(dansLEcran);
            const transparents = [...document.querySelectorAll('main *')].filter((el) => dansLEcran(el) && !el.closest('[aria-hidden="true"]')
              && parseFloat(getComputedStyle(el).opacity) < 1);
            return {
              images: imgs.map((i) => ({ src: i.getAttribute('src'), chargement: i.getAttribute('loading'), priorite: i.getAttribute('fetchpriority') })),
              transparents: transparents.slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)}`),
            };
          });
          verifier(arrivee.images.every((i) => i.chargement !== 'lazy') && (arrivee.images.length === 0 || arrivee.images[0].priorite === 'high'),
            `${ou} : images du premier écran chargées tout de suite, la première en priorité (${JSON.stringify(arrivee.images)})`);
          verifier(arrivee.transparents.length === 0, `${ou} : rien de transparent dans le premier écran à l'arrivée (${arrivee.transparents.join(' | ')})`);
          // Toute la page parcourue (images paresseuses chargées, apparitions jouées), puis retour en haut
          await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += Math.round(innerHeight * 0.7)) {
              window.scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 120));
            }
          });
          await attendre(900);
          const etat = await page.evaluate(() => {
            const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
            const imgs = [...document.querySelectorAll('main img')];
            return {
              connexion: [...document.querySelectorAll('header button, header a')].some((b) => visible(b) && b.innerText.trim() === 'Connexion'),
              pied: visible(document.querySelector('footer')) && document.querySelector('footer').textContent.includes('Mentions légales'),
              h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
              debord: document.documentElement.scrollWidth - innerWidth,
              images: imgs.map((i) => ({ src: i.getAttribute('src'), charge: i.complete && i.naturalWidth > 0, l: i.getAttribute('width'), h: i.getAttribute('height'), alt: i.getAttribute('alt') || '' })),
              anciennes: [...document.querySelectorAll('[src*="/screenshots/"], [href*="/screenshots/"]')].length,
              texte: document.body.innerText,
              // Typographie fine (src/components/landing/site/typographie.js) : espace fine insécable dans les « » et
              // avant ; : ? ! %, jamais une espace ordinaire ou insécable à ces places
              // (et apostrophe typographique entre deux lettres, « 1ᵉʳ » : relecture DA-17)
              typographie: [/«(?!\u202f)/g, /(?<!\u202f)»/g, /[ \u00a0]([;:?!%])(?=$|[\s"'\u2019)\],.…»])/gm, /\p{L}'(?=\p{L})/gu, /(?<![\d\p{L}])1er(?![\p{L}\d])/gu]
                .flatMap((m) => [...document.querySelector('main').innerText.matchAll(m)].map((x) => x.input.slice(Math.max(0, x.index - 25), x.index + 5))),
              oranges: [...document.querySelectorAll('main *, footer *')]
                .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
                .filter((el) => ['rgb(238, 123, 32)', 'rgb(249, 115, 22)', 'rgb(234, 88, 12)', 'rgb(251, 146, 60)', 'rgb(253, 186, 116)'].includes(getComputedStyle(el).color))
                .map((el) => el.textContent.trim().slice(0, 30)),
              petites: [...document.querySelectorAll('main a, main button, footer a, footer button')]
                .filter((el) => el.getClientRects().length > 0 && !el.closest('p, li p'))
                .map((el) => ({ texte: el.innerText.trim().slice(0, 30), h: el.getBoundingClientRect().height }))
                .filter((x) => x.h < 44),
            };
          });
          verifier(etat.connexion, `${ou} : la barre et son bouton « Connexion »`);
          verifier(etat.pied, `${ou} : le pied de page`);
          verifier(etat.h1.length === 1, `${ou} : un seul titre h1 (${etat.h1.join(' | ')})`);
          verifier(etat.debord <= 0, `${ou} : aucun défilement horizontal (${etat.debord} px)`);
          verifier(etat.images.length > 0 && etat.images.every((i) => i.charge && /^\/site\/[a-z0-9-]+\.webp$/.test(i.src) && i.l && i.h && i.alt.length > 10),
            `${ou} : captures du site chargées, en WebP, dimensions et texte de remplacement (${etat.images.filter((i) => !i.charge || !/^\/site\//.test(i.src)).map((i) => i.src).join(', ')})`);
          verifier(etat.anciennes === 0, `${ou} : plus aucune image de public/screenshots/`);
          verifier(etat.typographie.length === 0, `${ou} : typographie fine, espace fine dans les « » et avant ; : ? ! % (${etat.typographie.slice(0, 3).join(' | ')})`);
          // Au téléphone, les captures lisibles : les vues téléphone de l'application (une capture d'ordinateur réduite
          // à la largeur d'un téléphone ne se lit plus)
          if (largeur < 640) {
            const ordinateur = etat.images.filter((i) => !/^\/site\/tel-/.test(i.src)).map((i) => i.src);
            verifier(ordinateur.length === 0, `${ou} : au téléphone, les captures de téléphone (${ordinateur.join(', ')})`);
          }
          const interdits = ['Factur-X', 'dictée', 'Dictée', 'BTP Rénovation', 'gmail', 'Bientôt', 'bientôt', 'Plan Équipe', '(plan Équipe)', 'LEGO', 'drag-and-drop', 'Dashboard', 'widgets', 'templates', '30, 60 et 90', '30/60/90', 'Pennylane', 'Indy', 'app.mallettico.fr']
            .filter((t) => etat.texte.includes(t));
          verifier(interdits.length === 0, `${ou} : aucun texte retiré par la relecture d'honnêteté (${interdits.join(', ')})`);
          verifier(etat.oranges.length === 0, `${ou} : aucun texte orange (${etat.oranges.join(' | ')})`);
          verifier(etat.petites.length === 0, `${ou} : cibles de 44 px au moins (${etat.petites.map((x) => `${x.texte} ${x.h}`).join(' | ')})`);
          for (const selecteur of ['h1', 'main [data-intro]', 'main h2', 'main h3', 'footer li a']) {
            const c = await contrasteDe(page, selecteur);
            verifier(c >= 4.5, `${ou} : contraste de ${selecteur} ≥ 4,5 (${c.toFixed(2)})`);
          }
          verifier(erreurs.length === 0, `${ou} : aucune erreur JavaScript (${erreurs[0] || ''})`);
          await page.evaluate(() => window.scrollTo(0, 0));
          await attendre(300);
          const nom = `sous-page${chemin.replace(/\//g, '-')}-${largeur}`;
          const fichier = path.join(RACINE, 'audit-ui', `site-${nom}.png`);
          await page.screenshot({ path: fichier, fullPage: true });
          await browser.close();
        }

        // Questions d'une page de détail : accordéon accessible
        const detail = await ouvrir({ reel: true, largeur, chemin: '/fonctionnalites/relances', supabase: () => json([]) });
        await attendre(600);
        const avant = await detail.page.evaluate(() => {
          const b = document.querySelector('main [data-question]');
          b?.scrollIntoView({ block: 'center' });
          return { etat: b?.getAttribute('aria-expanded'), lie: !!document.getElementById(b?.getAttribute('aria-controls') || '-') };
        });
        await detail.page.evaluate(() => document.querySelector('main [data-question]').click());
        await attendre(500);
        const apres = await detail.page.evaluate(() => {
          const b = document.querySelector('main [data-question]');
          const r = document.getElementById(b.getAttribute('aria-controls'));
          return { etat: b.getAttribute('aria-expanded'), hauteur: r?.getBoundingClientRect().height || 0 };
        });
        verifier(avant.etat === 'false' && avant.lie && apres.etat === 'true' && apres.hauteur > 20, `/fonctionnalites/relances : une question s'ouvre et le dit (aria-expanded) ${a}`);
        await detail.browser.close();

        // Mouvement réduit : la page des fonctionnalités est lisible d'emblée
        const reduit = await ouvrir({ reel: true, largeur, chemin: '/fonctionnalites', supabase: () => json([]) });
        await reduit.page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        await reduit.page.reload({ waitUntil: 'networkidle0' });
        await attendre(500);
        const opacites = await reduit.page.evaluate(() => [...document.querySelectorAll('h1, main h2, main h3')].map((el) => {
          let o = 1;
          for (let n = el; n; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
          return o;
        }));
        verifier(opacites.length > 3 && opacites.every((o) => o === 1), `/fonctionnalites, mouvement réduit : titres opaques d'emblée ${a}`);
        await reduit.browser.close();
      }
    },
  },
  {
    // Vieux navigateur sans IntersectionObserver (relecture du code de la manche A : `useInView` en créait un sans garde,
    // « IntersectionObserver is not a constructor », /fonctionnalites et /ressources s'affichaient vides) : l'accueil et
    // les sous-pages montrent tout leur contenu, opaque, sans erreur JavaScript.
    nom: 'site : vieux navigateur sans IntersectionObserver',
    reel: true,
    async executer({ ouvrir, attendre, verifier }) {
      const sansObservateur = () => {
        delete window.IntersectionObserver;
        delete window.IntersectionObserverEntry;
      };
      for (const chemin of ['/', '/fonctionnalites', '/ressources']) {
        for (const largeur of [375, 1440]) {
          const ou = `${chemin} à ${largeur} px`;
          const { page, browser, erreurs } = await ouvrir({ reel: true, largeur, chemin, supabase: () => json([]), avantChargement: sansObservateur });
          await attendre(1500);
          await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += Math.round(innerHeight * 0.8)) {
              window.scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 80));
            }
            window.scrollTo(0, 0);
          });
          await attendre(800);
          const etat = await page.evaluate(() => {
            const opacite = (el) => { let o = 1; for (let n = el; n; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; };
            const titres = [...document.querySelectorAll('main h1, main h2, main h3')].filter((t) => t.getClientRects().length > 0);
            return {
              observateur: typeof window.IntersectionObserver,
              h1: document.querySelector('h1')?.textContent.trim() || '',
              texte: document.querySelector('main')?.innerText.length || 0,
              titres: titres.length,
              transparents: titres.filter((t) => opacite(t) < 1).map((t) => t.textContent.trim().slice(0, 30)),
              images: [...document.querySelectorAll('main img')].filter((i) => i.getClientRects().length > 0).length,
              pied: !!document.querySelector('footer') && document.querySelector('footer').textContent.includes('Mentions légales'),
            };
          });
          verifier(etat.observateur === 'undefined', `${ou} : IntersectionObserver retiré pour l'essai (${etat.observateur})`);
          verifier(etat.h1.length > 0 && etat.texte > 600 && etat.titres > 3 && etat.pied && (chemin === '/' || etat.images > 0),
            `${ou} : le contenu s'affiche (${JSON.stringify({ ...etat, transparents: undefined })})`);
          verifier(etat.transparents.length === 0, `${ou} : aucun titre transparent (${etat.transparents.join(' | ')})`);
          verifier(erreurs.length === 0, `${ou} : aucune erreur JavaScript (${erreurs[0] || ''})`);
          await browser.close();
        }
      }
    },
  },
];
