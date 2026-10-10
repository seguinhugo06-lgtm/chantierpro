// Écritures en base, en mode « réel simulé » avec un faux Supabase qui garde ses lignes (recette du 9 oct. 2026) :
// - une écriture refusée par la base est DITE (en français) et annulée à l'écran, jamais « ajouté » ;
// - une suppression refusée en silence (RLS : 0 ligne, sans erreur) est détectée ;
// - un rendez-vous du planning part en base (avant : aucune requête) et revient au rechargement.
const { creerBase, UID, json } = require('../lib/fauxSupabase.cjs');

const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000001', nom: 'Dupont', prenom: 'Marie', telephone: '0611223344', created_at: '2026-10-01T08:00:00Z' };
const texte = (page) => page.evaluate(() => document.body.innerText);
const refusRls = json({ code: '42501', message: 'new row violates row-level security policy for table "clients"' }, 403);

module.exports = [
  {
    nom: 'clients : une création refusée par la base est dite, la fenêtre reste ouverte avec la saisie',
    reel: true,
    async executer({ ouvrir, cliquer, saisir, attendre, verifier, sessionFactice }) {
      const base = creerBase({ clients: [CLIENT] }, { refuser: (m, table) => (m === 'POST' && table === 'clients' ? refusRls : null) });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'clients', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(1500);
      await cliquer(page, 'Nouveau client');
      await saisir(page, 'input[placeholder="ex. Dupont"]', 'Martin');
      await saisir(page, 'input[placeholder="06 12 34 56 78"]', '0698765432');
      await cliquer(page, 'Ajouter', { dans: '[role="dialog"]' });
      await attendre(1500);
      const t = await texte(page);
      verifier(base.journal.some((j) => j.m === 'POST' && j.table === 'clients'), 'la création est bien envoyée à la base');
      verifier(t.includes('Non enregistré') && t.includes("Votre compte n'a pas le droit"), 'refus dit en français');
      verifier(!/Martin.{0,20}ajouté|Client "Martin" ajouté/.test(t), 'aucun « ajouté »');
      verifier(!/row-level|violates/i.test(t), 'aucun message technique en anglais');
      const ouverte = await page.evaluate(() => !!document.querySelector('[role="dialog"] input[placeholder="ex. Dupont"]')?.value);
      verifier(ouverte, 'la fenêtre reste ouverte avec la saisie');
      verifier(base.tables.clients.length === 1, 'rien en base');
    },
  },
  {
    nom: 'clients : une suppression refusée en silence (RLS, 0 ligne) est dite, le client reste',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier, sessionFactice }) {
      // RLS sur DELETE : 200, aucune ligne supprimée, aucune erreur
      const base = creerBase({ clients: [CLIENT] }, { refuser: (m, table) => (m === 'DELETE' && table === 'clients' ? json([]) : null) });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'clients', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(1500);
      await page.evaluate(() => [...document.querySelectorAll('[data-ui="LigneListe"] > button')].find((b) => b.innerText.includes('Dupont'))?.click());
      await attendre(800);
      await cliquer(page, 'Supprimer le client');
      await cliquer(page, 'Confirmer', { dans: '[role="dialog"]' });
      await attendre(1500);
      const t = await texte(page);
      verifier(base.journal.some((j) => j.m === 'DELETE' && j.table === 'clients'), 'la suppression est bien envoyée');
      verifier(t.includes('Suppression refusée'), 'refus dit');
      verifier(!t.includes('Client supprimé'), 'aucun « Client supprimé »');
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(1500);
      verifier((await texte(page)).includes('Dupont'), 'le client est toujours là après rechargement');
    },
  },
  {
    nom: 'clients : une création acceptée part en base et revient au rechargement',
    reel: true,
    async executer({ ouvrir, cliquer, saisir, attendre, verifier, sessionFactice }) {
      const base = creerBase({ clients: [CLIENT] });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'clients', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(1500);
      await cliquer(page, 'Nouveau client');
      await saisir(page, 'input[placeholder="ex. Dupont"]', 'Martin');
      await saisir(page, 'input[placeholder="06 12 34 56 78"]', '0698765432');
      await cliquer(page, 'Ajouter', { dans: '[role="dialog"]' });
      await attendre(1500);
      verifier(base.tables.clients.some((c) => c.nom === 'Martin'), 'le client est en base');
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(1500);
      verifier((await texte(page)).includes('Martin'), 'le client revient au rechargement');
    },
  },
  {
    nom: 'planning : un rendez-vous part en base (planning_events) avec son heure, et revient au rechargement',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const base = creerBase({ clients: [CLIENT] });
      const { page } = await ouvrir({ reel: true, largeur: 390, page: 'planning', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2000);
      const ouvert = await page.evaluate(() => { const b = document.querySelector('button[aria-label="Nouvel événement"]'); if (b) b.click(); return !!b; });
      verifier(ouvert, 'bouton « Nouvel événement »');
      await attendre(600);
      await page.click('input[placeholder^="Ex: RDV"]');
      await page.keyboard.type('RDV chaudière Dupont');
      await page.evaluate(() => {
        const heure = document.querySelector('input[type="time"]');
        if (heure) {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(heure, '09:00');
          heure.dispatchEvent(new Event('input', { bubbles: true }));
        }
        [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Créer')?.click();
      });
      await attendre(1500);
      const ligne = (base.tables.planning_events || []).find((e) => e.title === 'RDV chaudière Dupont');
      verifier(!!ligne, 'le rendez-vous est en base, table planning_events');
      verifier(!(base.tables.events || []).length, 'rien dans l’ancienne table events');
      verifier(ligne && ligne.time === '09:00' && /^\d{4}-\d{2}-\d{2}$/.test(ligne.date || ''), `jour et heure locaux enregistrés (${ligne?.date} ${ligne?.time})`);
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(2000);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((e) => e.innerText.trim() === 'Agenda' && e.getBoundingClientRect().width > 0)?.click());
      await attendre(600);
      verifier((await texte(page)).includes('RDV chaudière Dupont'), 'le rendez-vous revient au rechargement');
    },
  },
];
