// Relecture de la Task 6 (tour 1, 26 oct. 2026) : le filtre « Moi » du planning retrouve les tâches, la frise passe sur ui/Modal
// avec un seul bouton plein, la vue Équipe écrit « Non assigné » et « tâche » avec leurs accents.
const { creerBase, UID } = require('../lib/fauxSupabase.cjs');
const { cliquerBouton } = require('../lib/parcoursChantier.cjs');

const jourDans = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };

module.exports = [
  {
    // Avant : une tâche n'avait pas de `employeId` dans le planning ; « Moi » (les événements sans personne) les gardait toutes,
    // et le filtre d'une personne n'en gardait aucune.
    nom: 'planning : le filtre « Moi » garde mes tâches et écarte celles d’un collègue ; le filtre d’une personne garde les siennes (1440 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const COLLEGUE = { id: 'a0a0a0a0-0000-4000-8000-000000000061', nom: 'Garcia', prenom: 'Léo', actif: true, type: 'employe', created_at: '2026-10-01T08:00:00Z' };
      const MIENNE = { id: 'f0f0f0f0-0000-4000-8000-000000000061', text: 'Relever les compteurs', status: 'a_faire', is_done: false, due_date: jourDans(2), created_at: '2026-10-01T08:00:00Z' };
      const SIENNE = { id: 'f0f0f0f0-0000-4000-8000-000000000062', text: 'Commande du câble collègue', status: 'a_faire', is_done: false, due_date: jourDans(2), assigned_to: COLLEGUE.id, created_at: '2026-10-01T08:00:00Z' };
      const base = creerBase({ equipe: [COLLEGUE], memos: [MIENNE, SIENNE] });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'planning', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2500);
      await cliquerBouton(page, 'Agenda');
      await attendre(500);
      const visibles = () => page.evaluate(() => ({ miennes: /Relever les compteurs/.test(document.body.innerText), collegue: /Commande du câble collègue/.test(document.body.innerText) }));
      let etat = await visibles();
      verifier(etat.miennes && etat.collegue, `sans filtre, les deux tâches sont dans l’agenda (${JSON.stringify(etat)})`);
      const choisir = async (libelle) => {
        await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^Filtres/.test(b.innerText.trim()) || /Filtres/.test(b.getAttribute('aria-label') || ''))?.click());
        await attendre(500);
        const ok = await page.evaluate((l) => {
          const radio = [...document.querySelectorAll('[role="radio"]')].find((r) => r.innerText.trim() === l);
          radio?.click();
          return !!radio;
        }, libelle);
        verifier(ok, `le filtre propose « ${libelle} »`);
        await attendre(500);
        await page.keyboard.press('Escape');
        await attendre(400);
      };
      await choisir('Moi');
      etat = await visibles();
      verifier(etat.miennes && !etat.collegue, `« Moi » : ma tâche reste, celle du collègue disparaît (${JSON.stringify(etat)})`);
      await choisir('Garcia');
      etat = await visibles();
      verifier(!etat.miennes && etat.collegue, `« Garcia » : sa tâche seulement (${JSON.stringify(etat)})`);
    },
  },
  {
    nom: 'chantiers → Frise : « Frise du planning », une fenêtre ui/Modal pour « Tâche », un seul bouton plein (1440 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'chantiers', largeur: 1440 });
      await attendre(800);
      await page.evaluate(() => [...document.querySelectorAll('[aria-label="Vue des chantiers"] button')].find((b) => b.innerText.trim() === 'Frise' && b.getBoundingClientRect().width > 0)?.click());
      await attendre(1500);
      const titre = await page.evaluate(() => [...document.querySelectorAll('h2')].map((h) => h.innerText.trim()));
      verifier(titre.includes('Frise du planning') && !titre.includes('Planning Gantt'), `le titre est « Frise du planning » (${JSON.stringify(titre)})`);
      const pleins = await page.evaluate(() => [...document.querySelectorAll('#main-content button')].filter((b) => b.className.split(/\s+/).includes('bg-accent') && b.getBoundingClientRect().width > 0).map((b) => b.innerText.trim()));
      verifier(pleins.length === 1 && /Nouveau chantier/.test(pleins[0]), `un seul bouton plein, « Nouveau chantier » (${JSON.stringify(pleins)})`);
      verifier(await cliquerBouton(page, 'Tâche'), 'le bouton « Tâche » est là');
      await attendre(600);
      const fenetre = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        return d ? { titre: d.querySelector('h2, h3')?.innerText.trim(), aria: d.getAttribute('aria-modal'), champs: d.querySelectorAll('input, select, textarea').length } : null;
      });
      verifier(fenetre && fenetre.titre === 'Nouvelle tâche' && fenetre.aria === 'true' && fenetre.champs >= 5, `la fenêtre est une vraie fenêtre modale (${JSON.stringify(fenetre)})`);
      await page.keyboard.press('Escape');
      await attendre(500);
      verifier(!(await page.evaluate(() => !!document.querySelector('[role="dialog"]'))), 'Échap la ferme');
    },
  },
  {
    nom: 'tâches → vue Équipe : « Non assigné » et « tâche » s’écrivent avec leurs accents (1440 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const MEMO = { id: 'f0f0f0f0-0000-4000-8000-000000000071', text: 'Appeler le maçon', status: 'a_faire', is_done: false, due_date: new Date().toLocaleDateString('sv-SE'), created_at: '2026-10-01T08:00:00Z' };
      const base = creerBase({ memos: [MEMO] });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'tasks', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2500);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^Vue/.test(b.innerText.trim()))?.click());
      await attendre(500);
      await page.evaluate(() => [...document.querySelectorAll('[role="radio"]')].find((r) => r.innerText.trim() === 'Équipe')?.click());
      await attendre(1200);
      const texte = await page.evaluate(() => document.querySelector('#main-content')?.innerText || '');
      verifier(/Non assigné/.test(texte) && !/Non assigne\b/.test(texte), `« Non assigné » porte son accent (${texte.replace(/\s+/g, ' ').slice(0, 200)})`);
      verifier(!/\btache\b/i.test(texte.replace(/tâche/gi, '')), 'aucun « tache » sans accent');
    },
  },
  {
    // Avant : la frise affichait le champ « avancement » saisi (10 %), la liste l'avancement calculé (tâches, heures, achats : 75 %).
    nom: 'chantiers → Frise : l’avancement est celui de la liste (tâches faites), pas le champ saisi (1440 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000051', nom: 'Colin', prenom: 'Ana', created_at: '2026-10-01T08:00:00Z' };
      const CHANTIER = {
        id: 'c1c1c1c1-0000-4000-8000-000000000051', nom: 'Frise Colin Parcours', client_id: CLIENT.id, statut: 'en_cours', avancement: 10, date_debut: '2026-10-01', date_fin: '2026-12-31',
        taches: [{ id: 't1', text: 'A', done: true }, { id: 't2', text: 'B', done: true }, { id: 't3', text: 'C', done: true }, { id: 't4', text: 'D', done: false }], created_at: '2026-10-01T08:00:00Z',
      };
      const base = creerBase({ clients: [CLIENT], chantiers: [CHANTIER] });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'chantiers', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2500);
      const liste = await page.evaluate(() => (document.querySelector('button[aria-label^="Ouvrir le chantier Frise Colin"]')?.innerText || '').replace(/\s+/g, ' '));
      verifier(/Avancement 75 %/.test(liste), `la liste dit 75 % (« ${liste} »)`);
      await page.evaluate(() => [...document.querySelectorAll('[aria-label="Vue des chantiers"] button')].find((b) => b.innerText.trim() === 'Frise' && b.getBoundingClientRect().width > 0)?.click());
      await attendre(1500);
      const frise = await page.evaluate(() => document.querySelector('#main-content')?.innerText.replace(/\s+/g, ' ') || '');
      verifier(/75 % d'avancement/.test(frise) && !/10 % d'avancement/.test(frise), `la frise dit 75 % comme la liste (« ${(frise.match(/\d+ % d'avancement/) || [''])[0]} »)`);
    },
  },
  {
    // Avant : « Échéance dépassée » ne tenait pas dans la tuile « En retard » à 375 px (trois tuiles de front) : le mot débordait.
    nom: 'tâches : la tuile « En retard » n’est pas coupée à 375 px, ni aucune des trois tuiles',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const retard = (n) => ({ id: `f0f0f0f0-0000-4000-8000-00000000006${n}`, text: `Tâche en retard ${n}`, status: 'a_faire', is_done: false, due_date: '2026-10-01', created_at: '2026-10-01T08:00:00Z' });
      const base = creerBase({ memos: [retard(1), retard(2), retard(3)] });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'tasks', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2500);
      const tuiles = await page.evaluate(() => [...document.querySelectorAll('[data-ui="TuileChiffre"]')].map((t) => ({
        texte: t.innerText.replace(/\s+/g, ' ').trim(),
        horizontal: [...t.querySelectorAll('span')].filter((s) => s.scrollWidth > s.clientWidth + 1).map((s) => s.innerText.trim()),
        vertical: [...t.querySelectorAll('span[class*="line-clamp"]')].filter((s) => s.scrollHeight > s.clientHeight + 1).map((s) => s.innerText.trim()),
        dehors: [...t.querySelectorAll('span')].filter((s) => s.getBoundingClientRect().right > t.getBoundingClientRect().right).map((s) => s.innerText.trim()),
      })));
      verifier(tuiles.length === 3, `trois tuiles (${tuiles.length})`);
      verifier(/En retard 3/.test(tuiles[0].texte) && /depuis \d+ j/i.test(tuiles[0].texte), `la tuile « En retard » dit 3 et depuis combien de jours (« ${tuiles[0].texte} »)`);
      for (const t of tuiles) verifier(t.horizontal.length === 0 && t.vertical.length === 0 && t.dehors.length === 0, `tuile « ${t.texte} » : rien de coupé ni de débordant (${JSON.stringify({ h: t.horizontal, v: t.vertical, d: t.dehors })})`);
    },
  },
  {
    // Constat de la relecture de la Task 9 : les actions rapides d'une ligne (« Mettre à aujourd'hui », « Priorité haute »,
    // « Supprimer ») faisaient 28 px, trop petit pour un doigt. Elles n'existent qu'à partir de 640 px (au survol ; sous 640 px
    // elles sont masquées) : sur une tablette tactile elles font 44 px, à la souris elles restent compactes.
    nom: 'tâches : les actions rapides d’une ligne font 44 px au doigt (tablette, 768 px) et 28 px à la souris (1440 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const MEMO = { id: 'f0f0f0f0-0000-4000-8000-000000000081', text: 'Poser les prises', status: 'a_faire', is_done: false, priority: 'haute', due_date: new Date().toLocaleDateString('sv-SE'), created_at: '2026-10-01T08:00:00Z' };
      const NOMS = ['Mettre à aujourd\'hui', 'Priorité haute', 'Supprimer'];
      const mesurer = (page) => page.evaluate((noms) => {
        const lignes = [...document.querySelectorAll('main div')].filter((d) => d.innerText.includes('Poser les prises') && d.className.includes('group'));
        const ligne = lignes[lignes.length - 1];
        return {
          ligne: !!ligne,
          tactile: window.matchMedia('(pointer: coarse)').matches,
          boutons: [...(ligne?.querySelectorAll('button[aria-label]') || [])].filter((b) => noms.includes(b.getAttribute('aria-label'))).map((b) => {
            const r = b.getBoundingClientRect();
            return { nom: b.getAttribute('aria-label'), l: Math.round(r.width), h: Math.round(r.height) };
          }),
        };
      }, NOMS);
      const lire = async (largeur, tactile) => {
        const base = creerBase({ memos: [MEMO] });
        const { page } = await ouvrir({ reel: true, largeur, page: 'tasks', session: sessionFactice(UID), supabase: base.reponse });
        if (tactile) await page.setViewport({ width: largeur, height: 1024, isMobile: true, hasTouch: true });
        await attendre(2500);
        return mesurer(page);
      };
      const tablette = await lire(768, true);
      verifier(tablette.ligne && tablette.tactile, `tablette : la ligne est affichée, le pointeur est grossier (${JSON.stringify({ ligne: tablette.ligne, tactile: tablette.tactile })})`);
      verifier(tablette.boutons.length === 3 && tablette.boutons.every((b) => b.l >= 44 && b.h >= 44), `tablette tactile : les trois actions rapides font 44 px au moins (${JSON.stringify(tablette.boutons)})`);
      const souris = await lire(1440, false);
      verifier(souris.ligne && !souris.tactile, `bureau : la ligne est affichée, le pointeur est précis (${JSON.stringify({ ligne: souris.ligne, tactile: souris.tactile })})`);
      verifier(souris.boutons.length === 3 && souris.boutons.every((b) => b.l === 28 && b.h === 28), `souris : les trois actions rapides restent compactes, 28 px (${JSON.stringify(souris.boutons)})`);
    },
  },
];
