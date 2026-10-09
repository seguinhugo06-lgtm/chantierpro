#!/usr/bin/env node
/**
 * audit-menus — ouvre tout ce qui s'ouvre (menus « ⋯ », listes déroulantes, fenêtres, panneaux)
 * sur chaque page de l'app, en largeur téléphone, et mesure ce qui sort de l'écran.
 *
 * Pourquoi : audit-ui ne clique que sur les boutons qui s'annoncent comme menus (aria), en haut
 * de page : les menus faits main, ceux du bas de page et ceux des fiches lui échappaient, et
 * Hugo voyait sur son téléphone des menus coupés que l'audit déclarait « 0 défaut » (9 oct. 2026).
 *
 * Pour chaque page × largeur (360 = petit Android, 390 = iPhone) : clique chaque bouton visible
 * et non destructif (barre du bas exclue), puis mesure les éléments apparus en position
 * absolue/fixe ou de rôle menu/listbox/dialog :
 *   - qui dépassent à droite ou à gauche de l'écran ;
 *   - fixes qui dépassent en bas, ou absolus qui finissent sous le bas de la page (inatteignables) ;
 *   - coupés par un ancêtre `overflow: hidden/auto` (menu tronqué dans sa carte) ;
 *   - dont les entrées font moins de 40 px de haut (difficiles à toucher avec un doigt).
 * Si un clic change de page ou laisse une fenêtre ouverte, la page est rechargée avant le suivant.
 * Les pages devis, clients et chantiers sont aussi auditées fiche ouverte (premier élément).
 *
 * Usage : npm run build (sans .env, mode démo) puis
 *   node scripts/audit-menus.cjs                 # toutes les pages, 360 et 390
 *   node scripts/audit-menus.cjs devis 390       # une page, une largeur
 *   node scripts/audit-menus.cjs devis 390 --captures   # capture aussi chaque ouverture sans défaut (revue visuelle)
 *   node scripts/audit-menus.cjs devis 360 --dist=audit-ui/dist-apercu   # un autre build démo
 * Contexte « editeur » (page devis) : l'éditeur de devis ouvert, ses boutons cliqués et ses champs de
 * recherche remplis (« pr ») pour ouvrir les listes d'autocomplétion (clients, catalogue).
 * Sortie : audit-ui/menus.md, audit-ui/menus.json, captures dans audit-ui/menus/.
 */
const fs = require('fs');
const path = require('path');
const { ouvrir, RACINE } = require('./lib/navigateur.cjs');

const SORTIE = path.join(RACINE, 'audit-ui');
const CAPTURES = path.join(SORTIE, 'menus');
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const args = process.argv.slice(2);
const TOUTES_CAPTURES = args.includes('--captures');
const DIST = (args.find((a) => a.startsWith('--dist=')) || '').slice(7) || undefined;
// --contexte=liste|fiche|editeur : un seul contexte (audit ciblé).
const SEUL = (args.find((a) => a.startsWith('--contexte=')) || '').slice(11);
const faire = (c) => !SEUL || SEUL === c;
const [filtrePage, filtreLargeur] = args.filter((a) => !a.startsWith('--'));
const LARGEURS = filtreLargeur ? [Number(filtreLargeur)] : [360, 390];
const HAUTEUR = 780;
const MAX_CLICS = 70;
// Jamais cliqués : effets irréversibles ou fichiers, même en démo, et ce qui quitte l'app.
const INTERDITS = /supprim|effac|envoyer|renvoyer|d[ée]connex|valider|confirmer|payer|signer|archiv|r[ée]initialis|importer|exporter|t[ée]l[ée]charg|imprimer|dupliquer|convertir|annuler la facture|avoir|facturer|cr[ée]er (le|la|un|une)|enregistrer|ajouter$/i;

function pagesRoutees() {
  const app = fs.readFileSync(path.join(RACINE, 'src/App.jsx'), 'utf8');
  const exclues = new Set(['cgv', 'cgu', 'confidentialite', 'mentions-legales', 'accessibilite', 'conformite',
    'design-system', 'client-portal', 'checkout-success', 'admin', 'changelog']);
  return [...new Set([...app.matchAll(/page === '([a-z0-9-]+)'/g)].map((m) => m[1]))].filter((p) => !exclues.has(p));
}

// DANS la page : étiquette les boutons candidats (clé stable = libellé + rang) et renvoie leurs clés.
function etiqueter(interdits) {
  const re = new RegExp(interdits[0], interdits[1]);
  const racineSel = interdits[2];
  const fenetres = racineSel ? [...document.querySelectorAll(racineSel)] : [];
  const racine = racineSel ? fenetres[fenetres.length - 1] : document;
  if (!racine) return [];
  const libelle = (b) => (b.getAttribute('aria-label') || b.innerText || b.title || '').trim().replace(/\s+/g, ' ').slice(0, 50);
  const dansBarreDuBas = (b) => { for (let p = b; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.position === 'fixed' && p.getBoundingClientRect().top > innerHeight - 120) return true; } return false; };
  const vus = {};
  const cles = [];
  document.querySelectorAll('[data-audit-cle]').forEach((e) => e.removeAttribute('data-audit-cle'));
  const selecteur = racineSel ? 'button, [role="button"], summary, [role="combobox"], input[type="search"], input[type="text"], input:not([type])' : 'button, [role="button"], summary';
  for (const b of racine.querySelectorAll(selecteur)) {
    const r = b.getBoundingClientRect(); const s = getComputedStyle(b);
    if (r.width < 8 || r.height < 8 || s.visibility === 'hidden' || s.display === 'none' || b.disabled) continue;
    if (r.right <= 0 || r.left >= innerWidth) continue; // menu latéral replié hors écran
    if ((!racineSel && b.closest('[role="dialog"]')) || b.closest('[aria-hidden="true"], [inert]') || dansBarreDuBas(b)) continue;
    const l = (b.tagName === 'INPUT' ? 'champ ' + (b.getAttribute('aria-label') || b.placeholder || b.name || '') : libelle(b)).trim().slice(0, 50) || '(sans nom)';
    if (re.test(l)) continue;
    vus[l] = (vus[l] || 0) + 1;
    const cle = `${l}#${vus[l]}`;
    b.setAttribute('data-audit-cle', cle);
    cles.push(cle);
  }
  return cles;
}

// DANS la page : marque ce qui est déjà ouvert/positionné avant le clic.
function photographier() {
  document.querySelectorAll('[data-audit-avant]').forEach((e) => e.removeAttribute('data-audit-avant'));
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if ((s.position === 'absolute' || s.position === 'fixed' || el.matches('[role="menu"],[role="listbox"],[role="dialog"]'))
      && s.display !== 'none' && s.visibility !== 'hidden') el.setAttribute('data-audit-avant', '1');
  }
}

// DANS la page : défauts des éléments apparus depuis la photo.
function mesurerApparus() {
  const W = innerWidth, H = innerHeight, docH = document.documentElement.scrollHeight;
  const defauts = [];
  const nom = (el) => {
    const t = (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return `${el.tagName.toLowerCase()}${el.getAttribute('role') ? '[' + el.getAttribute('role') + ']' : ''}${t ? ' « ' + t + ' »' : ''}`;
  };
  const coupeur = (el) => {
    const r = el.getBoundingClientRect();
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.position === 'fixed') return null; // un fixe (modale) gère son propre défilement
      if (/(hidden|clip|auto|scroll)/.test(s.overflowX + s.overflowY)) {
        const q = p.getBoundingClientRect();
        if (r.right > q.right + 2 || r.left < q.left - 2 || (s.overflowY !== 'visible' && s.overflowY !== 'auto' && s.overflowY !== 'scroll' && r.bottom > q.bottom + 2)) {
          return `${p.tagName.toLowerCase()}.${String(p.className).split(' ').filter(Boolean).slice(0, 3).join('.')}`;
        }
      }
    }
    return null;
  };
  const apparus = [...document.querySelectorAll('body *')].filter((el) => {
    if (el.hasAttribute('data-audit-avant')) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false;
    if (!(s.position === 'absolute' || s.position === 'fixed' || el.matches('[role="menu"],[role="listbox"],[role="dialog"]'))) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 60 || r.height < 30) return false;
    // Un menu ou une fenêtre : rôle explicite, ou élément au premier plan qui porte plusieurs commandes
    // (les décors positionnés des cartes — pastilles, dégradés — ne comptent pas).
    if (el.matches('[role="menu"],[role="listbox"],[role="dialog"]')) return true;
    const z = Number(s.zIndex) || 0;
    return z >= 10 && el.querySelectorAll('button, a, [role="menuitem"], [role="option"], input').length >= 2;
  });
  // On ne garde que les plus hauts éléments apparus (pas leurs descendants positionnés).
  const racines = apparus.filter((el) => !apparus.some((a) => a !== el && a.contains(el)));
  for (const el of racines) {
    const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    const d = [];
    if (r.right > W + 1) d.push(`dépasse à droite de ${Math.round(r.right - W)} px`);
    if (r.left < -1) d.push(`dépasse à gauche de ${Math.round(-r.left)} px`);
    if (s.position === 'fixed' && r.bottom > H + 1 && r.height < H * 1.5) d.push(`dépasse en bas de ${Math.round(r.bottom - H)} px`);
    if (s.position === 'absolute' && r.bottom + scrollY > docH + 1) d.push(`finit ${Math.round(r.bottom + scrollY - docH)} px sous la page (inatteignable)`);
    const c = coupeur(el); if (c) d.push(`coupé par ${c}`);
    if (el.matches('[role="menu"],[role="listbox"]') || /menu|dropdown|popover/i.test(String(el.className))) {
      const petits = [...el.querySelectorAll('button, [role="menuitem"], [role="option"], a')].filter((i) => { const q = i.getBoundingClientRect(); return q.height > 0 && q.height < 40; });
      if (petits.length) d.push(`${petits.length} entrée(s) de moins de 40 px de haut`);
    }
    if (d.length) defauts.push(`${nom(el)} : ${d.join(', ')}`);
  }
  return { defauts, ouvert: racines.length > 0 };
}

async function auditer(page, nomPage, largeur, contexte, entrer, racine) {
  const ARGS = [INTERDITS.source, INTERDITS.flags, racine || null];
  const resultats = [];
  const recharger = async () => {
    await page.evaluate((p) => { localStorage.setItem('cp_current_page', p); }, nomPage);
    await page.reload({ waitUntil: 'networkidle0' }).catch(() => {});
    await attendre(1200);
    if (entrer) await entrer(page);
  };
  await recharger();
  const cles = (await page.evaluate(etiqueter, ARGS)).slice(0, MAX_CLICS);
  for (const cle of cles) {
    const present = await page.evaluate((k) => {
      const b = document.querySelector(`[data-audit-cle="${CSS.escape(k)}"]`);
      if (!b) return false;
      b.scrollIntoView({ block: 'center' });
      return true;
    }, cle);
    if (!present) { await recharger(); await page.evaluate(etiqueter, ARGS); continue; }
    await attendre(120);
    await page.evaluate(photographier);
    const avantPage = await page.evaluate(() => localStorage.getItem('cp_current_page'));
    const estChamp = await page.evaluate((k) => document.querySelector(`[data-audit-cle="${CSS.escape(k)}"]`)?.tagName === 'INPUT', cle);
    if (estChamp) {
      await page.focus(`[data-audit-cle="${cle.replace(/"/g, '\\"')}"]`).catch(() => {});
      await page.keyboard.type('pr', { delay: 40 });
    } else {
      await page.evaluate((k) => document.querySelector(`[data-audit-cle="${CSS.escape(k)}"]`)?.click(), cle);
    }
    await attendre(450);
    const changePage = (await page.evaluate(() => localStorage.getItem('cp_current_page'))) !== avantPage;
    const { defauts, ouvert } = changePage ? { defauts: [], ouvert: false } : await page.evaluate(mesurerApparus);
    if (TOUTES_CAPTURES && ouvert && !defauts.length) {
      const nomFichier = `${nomPage}${contexte ? '-' + contexte : ''}-${largeur}-ouvert-${cle.replace(/[^a-z0-9]+/gi, '_').slice(0, 30)}.png`;
      await page.screenshot({ path: path.join(CAPTURES, nomFichier) }).catch(() => {});
    }
    if (defauts.length) {
      const fichier = `${nomPage}${contexte ? '-' + contexte : ''}-${largeur}-${resultats.length + 1}.png`;
      await page.screenshot({ path: path.join(CAPTURES, fichier) }).catch(() => {});
      resultats.push({ declencheur: cle.replace(/#1$/, ''), defauts, capture: `menus/${fichier}` });
    }
    const apresPage = await page.evaluate(() => localStorage.getItem('cp_current_page'));
    await page.keyboard.press('Escape').catch(() => {});
    await attendre(200);
    // Encore ouvert après Échap : une fenêtre, ou un panneau fixe apparu au clic qui couvre l'écran
    // (l'éditeur de devis ne se déclare pas comme fenêtre). Sinon la suite serait mesurée dessous.
    const resteOuvert = await page.evaluate((r) => (r ? (!document.querySelector(r) || document.querySelectorAll('[role="dialog"]').length > 1) : !!document.querySelector('[role="dialog"]')) || [...document.querySelectorAll('body *')].some((el) => {
      if (el.hasAttribute('data-audit-avant')) return false;
      const st = getComputedStyle(el); if (st.position !== 'fixed' || st.display === 'none' || st.visibility === 'hidden') return false;
      const q = el.getBoundingClientRect(); return !el.closest('[role="dialog"]') && q.width * q.height > innerWidth * innerHeight * 0.5;
    }), racine || null).catch(() => true);
    if (ouvert || resteOuvert || apresPage !== avantPage) {
      if (resteOuvert || apresPage !== avantPage) { await recharger(); await page.evaluate(etiqueter, ARGS); }
    }
  }
  if (!cles.length) throw new Error('aucun bouton cliqué : la page n\'a pas été atteinte, ou le filtre exclut tout');
  return { page: nomPage, contexte, largeur, cliques: cles.length, defauts: resultats };
}

// Entrer dans la fiche du premier élément d'une liste (devis, client, chantier) : le plus petit
// élément cliquable (curseur « main ») dont le texte ressemble à une fiche.
const entrerSi = (motif) => async (page) => {
  const ok = await page.evaluate((m) => {
    const re = new RegExp(m);
    const cliquables = [...document.querySelectorAll('main *')].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.height > 50 && r.width > 200 && getComputedStyle(e).cursor === 'pointer' && re.test(e.innerText || '');
    });
    const fiche = cliquables.find((e) => !cliquables.some((x) => x !== e && e.contains(x)));
    fiche?.click();
    return !!fiche;
  }, motif);
  await attendre(900);
  if (!ok) throw new Error('fiche non atteinte : aucun élément cliquable ne ressemble à une fiche');
};
const ENTREES = { devis: entrerSi('(DEV|FAC|ACO)-'), clients: entrerSi('@'), chantiers: entrerSi('\\d{5}') };
const ouvrirEditeur = async (page) => {
  const ok = await page.evaluate(() => {
    const b = [...document.querySelectorAll('main button')].find((x) => (x.innerText || '').trim() === 'Nouveau' && x.getBoundingClientRect().width > 0);
    b?.click();
    return !!b;
  });
  await attendre(1200);
  if (!ok || !(await page.evaluate(() => !!document.querySelector('[role="dialog"]')))) throw new Error('éditeur non ouvert (ou sans role="dialog")');
};

(async () => {
  fs.mkdirSync(CAPTURES, { recursive: true });
  const pages = pagesRoutees().filter((p) => !filtrePage || p === filtrePage);
  const tous = [];
  for (const largeur of LARGEURS) {
    for (const nomPage of pages) {
      const { page, browser } = await ouvrir({
        dist: DIST ? path.resolve(DIST) : undefined, page: nomPage, largeur: 390,
        avantChargement: () => { try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); } catch { /* stockage indisponible */ } },
      });
      await page.setViewport({ width: largeur, height: HAUTEUR, isMobile: true, hasTouch: true });
      // Les fonctions de mesure appelées depuis une autre fonction de la page doivent y exister.
      await page.evaluate(`window.photographier = ${photographier.toString()}`);
      try {
        if (faire('liste')) tous.push(await auditer(page, nomPage, largeur, '', null));
        if (ENTREES[nomPage] && faire('fiche')) tous.push(await auditer(page, nomPage, largeur, 'fiche', ENTREES[nomPage]));
        if (nomPage === 'devis' && faire('editeur')) tous.push(await auditer(page, nomPage, largeur, 'editeur', ouvrirEditeur, '[role="dialog"]'));
      } catch (e) {
        tous.push({ page: nomPage, largeur, erreur: String(e.message || e), defauts: [] });
      }
      await browser.close();
      const dernier = tous[tous.length - 1];
      console.log(`${nomPage} ${largeur} : ${tous.filter((t) => t.page === nomPage && t.largeur === largeur).reduce((n, t) => n + t.defauts.length, 0)} menu(s) en défaut${dernier.erreur ? ' — ' + dernier.erreur : ''}`);
    }
  }
  fs.writeFileSync(path.join(SORTIE, 'menus.json'), JSON.stringify(tous, null, 1));
  const L = ['# Menus et fenêtres ouverts en largeur téléphone', '', `Généré le ${new Date().toLocaleString('fr-FR')} — ${tous.reduce((n, t) => n + t.defauts.length, 0)} défaut(s).`, ''];
  for (const t of tous.filter((x) => x.defauts.length || x.erreur)) {
    L.push(`## ${t.page}${t.contexte ? ' (' + t.contexte + ')' : ''} — ${t.largeur} px`);
    if (t.erreur) L.push(`- Erreur : ${t.erreur}`);
    for (const d of t.defauts) L.push(`- « ${d.declencheur} » → ${d.defauts.join(' ; ')} — ${d.capture}`);
    L.push('');
  }
  fs.writeFileSync(path.join(SORTIE, 'menus.md'), L.join('\n'));
  console.log(`\n${tous.reduce((n, t) => n + t.defauts.length, 0)} défaut(s) → audit-ui/menus.md`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
