// Site public (refonte d'octobre 2026, spec docs/superpowers/specs/2026-10-19-site-refonte-design.md).
// Le site n'apparaît qu'hors démo : mode « réel simulé », Supabase répond vide (visiteur non connecté).
// Chaque tâche de la refonte ajoute ici les parcours des sections qu'elle refait.
const path = require('path');
const fs = require('fs');

const json = (corps, status = 200) => ({ status, body: JSON.stringify(corps) });

const TITRE = "L'administratif du chantier, rangé dans une mallette.";
const TEXTE_HORS_ECRAN = 'Exemple : un devis de 7 lignes pour une mise aux normes de tableau électrique, signé en ligne, facturé puis payé.';

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
        await attendre(2000);
        verifier((await lireCarte(page)).etape === reduite.etape, `mouvement réduit : pas de boucle ${a}`);
        await capturer(page, RACINE, `premier-ecran-${largeur}-reduit`);

        // La barre mène aux sections : « Tarifs » au bureau ; au téléphone, le menu puis « FAQ » (menu refermé,
        // page de nouveau défilable)
        await page.evaluate(() => window.scrollTo(0, 0));
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
          menu: !!document.getElementById('menu-site'),
          bloquee: document.body.style.overflow === 'hidden',
        }), ancre);
        verifier(arrivee.haut > -10 && arrivee.haut < 200, `la barre mène à ${ancre} ${a} (haut : ${arrivee.haut})`);
        verifier(!arrivee.menu && !arrivee.bloquee, `menu refermé et page défilable ${a}`);

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
];
