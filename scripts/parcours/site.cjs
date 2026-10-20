// Site public (refonte d'octobre 2026, spec docs/superpowers/specs/2026-10-19-site-refonte-design.md).
// Le site n'apparaît qu'hors démo : mode « réel simulé », Supabase répond vide (visiteur non connecté).
// Chaque tâche de la refonte ajoute ici les parcours des sections qu'elle refait.
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const json = (corps, status = 200) => ({ status, body: JSON.stringify(corps) });

const TITRE = "L'administratif du chantier, rangé dans une mallette.";
const TEXTE_HORS_ECRAN = 'Exemple : un devis de 7 lignes pour une mise aux normes de tableau électrique, signé en ligne, facturé puis payé.';
const TEXTE_RELANCE = 'Relance du devis à J+7, au rythme que vous choisissez';

// Textes exacts de la spec (sections 5 et 6)
const ETAPES_DU_CYCLE = [
  "Le chantier du jour, d'un coup d'œil",
  'Le devis se monte par lots',
  'Signé, facturé, encaissé',
];
const LIENS_DU_CYCLE = ['/fonctionnalites/devis-factures', '/fonctionnalites/devis-factures', '/fonctionnalites/signature-electronique'];
const GARANTIES = [
  'Des numéros qui se suivent, sans trou',
  'Une facture envoyée ne se supprime pas : on la corrige par un avoir',
  'Une facture n\'est « payée » que si les paiements la soldent',
  "Assurance décennale, TVA réduite, pénalités de retard : les mentions s'ajoutent toutes seules",
];
const LEGENDE_CAPTURES = "Captures de l'application, données fictives.";

// Textes exacts de la spec, section « Les fonctionnalités en action »
const TITRE_FONCTIONNALITES = "Essayez, c'est l'application.";
const INTRO_FONCTIONNALITES = "Des exemples à manipuler, sur des données fictives. Le document, le métré et les relances sortent du code même de l'application.";
const ECHEC_MONTANTS_SIGNATURE = "Les montants n'ont pas pu être chargés. Rechargez la page pour les voir.";
const ONGLETS = ['Le document que reçoit votre client', 'Signature en ligne', 'Métré express', 'Relances', 'Encaissements'];
const LEGENDES = {
  'Le document que reçoit votre client': 'Exemple fictif généré par Mallettico.',
  'Signature en ligne': 'Démonstration : votre signature ne quitte pas cette page.',
  Relances: "Vous réglez les délais et les messages ; l'envoi automatique est une option.",
  Encaissements: 'Une facture n\'est « payée » que si les paiements la soldent.',
};
const SIGNE_LE = /^Signé le \d{2}\/\d{2}\/\d{4} à \d{2}:\d{2}$/;
const euros = (n) => NORMALISER(new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n));
const PANNEAU = '#fonctionnalites [role="tabpanel"]:not([hidden])';

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
    recommencer: [...(p?.querySelectorAll('button') || [])].some((b) => b.innerText.trim() === "Recommencer l'exemple"),
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
        verifier(reduite.relance === 'cachee' && reduite.encaisse === 'visible', `mouvement réduit : pas de bulle de relance du devis, encaissement affiché ${a}`);
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
        if (auBureau) {
          verifier(cycle.telephone && cycle.capturesDesEtapes === 0, `#parcours : téléphone collant au bureau, pas de capture par étape ${a}`);
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
        // opacité du titre et de tous ses parents. Sections refaites seulement : les anciennes (tarifs, construit en
        // public…) ont des apparitions plus longues que 800 ms ; leurs tâches les ajouteront à TITRES_CONTROLES.
        const TITRES_CONTROLES = '#metiers h2, #fonctionnalites h2, #parcours h2, #fiabilite h2';
        const nbTitres = await page.evaluate((s) => document.querySelectorAll(s).length, TITRES_CONTROLES);
        verifier(nbTitres === 4, `un titre h2 par section refaite ${a} (${nbTitres})`);
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
          objet: e.querySelector('[data-objet]')?.textContent.replace(/\s+/g, ' ').trim() || '',
          opacite: parseFloat(getComputedStyle(e).opacity),
        })), PANNEAU);
        const jours = frise.map((e) => Number((/J\+(\d+)/.exec(e.delai) || [])[1]));
        verifier(frise.length >= 3 && jours.every((j, i) => j > 0 && (i === 0 || j > jours[i - 1])), `frise : au moins trois relances aux délais croissants ${a} (${frise.map((e) => e.delai).join(' | ')})`);
        verifier(frise.every((e) => e.nom && e.objet.includes('Relance : Devis DEV-2026-00012')), `chaque relance a un nom et l'objet du message ${a} (${frise.map((e) => e.objet).join(' | ')})`);
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
        await page.evaluate((s) => [...document.querySelectorAll(`${s} button`)].find((b) => b.innerText.trim() === "Recommencer l'exemple")?.click(), PANNEAU);
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
        const selecteurs = [
          '#fonctionnalites h2', '#fonctionnalites [data-intro]',
          '#fonctionnalites [role="tab"][aria-selected="true"] [data-titre]', '#fonctionnalites [role="tab"][aria-selected="false"] [data-titre]',
          `${PANNEAU} [data-legende]`, `${PANNEAU} [data-mention]`, '#fonctionnalites [data-cadre-titre]',
        ];
        if (auBureau) selecteurs.push('#fonctionnalites [role="tab"][aria-selected="false"] [data-phrase]', '#fonctionnalites [role="tab"][aria-selected="true"] [data-phrase]');
        for (const s of selecteurs) {
          const c = await contrasteDe(page, s);
          verifier(c >= 4.5, `contraste de ${s} ≥ 4,5 ${a} (${c.toFixed(2)})`);
        }
        for (const [onglet, s] of [['Signature en ligne', '[data-montant-devis]'], ['Métré express', '[data-montant]'], ['Métré express', 'label'], ['Relances', '[data-objet]'], ['Relances', '[data-delai]'], ['Encaissements', '[data-statut-facture]'], ['Encaissements', '[data-reste]']]) {
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
];

