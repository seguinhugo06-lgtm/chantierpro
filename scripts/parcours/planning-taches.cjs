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
];
