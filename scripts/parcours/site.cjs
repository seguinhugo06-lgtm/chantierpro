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
        const TITRES_CONTROLES = '#metiers h2, #parcours h2, #fiabilite h2';
        const nbTitres = await page.evaluate((s) => document.querySelectorAll(s).length, TITRES_CONTROLES);
        verifier(nbTitres === 3, `un titre h2 par section refaite ${a} (${nbTitres})`);
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

        // ── La barre mène aux sections Métiers, Fonctionnalités (pour l'instant le cycle) et Fiabilité
        for (const [libelle, attendu] of [['Métiers', '#metiers'], ['Fonctionnalités', null], ['Fiabilité', '#fiabilite']]) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await attendre(300);
          const href = await page.evaluate((t) => [...document.querySelectorAll('header a')].find((x) => x.textContent.trim() === t)?.getAttribute('href'), libelle);
          const ancre = (href || '').replace(/^\//, '');
          if (attendu) verifier(ancre === attendu, `« ${libelle} » vise ${attendu} ${a} (${href})`);
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
];

