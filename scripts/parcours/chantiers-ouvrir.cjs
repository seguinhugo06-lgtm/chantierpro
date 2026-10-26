// Relecture de la Task 6 (tour 1, 26 oct. 2026) : ouvrir un chantier depuis l'Accueil et la cloche (écran blanc : l'objet
// entier était passé à la place de l'identifiant), une seule règle de retard, la carte d'un prospect, le rapport « sur cet
// appareil », la confirmation de « Terminé » et « Abandonné ».
const { creerBase, UID } = require('../lib/fauxSupabase.cjs');
const { ouvrirFiche, nomsOnglets, ecouterMessages, cliquerBouton, ongletFiche } = require('../lib/parcoursChantier.cjs');

const aujourdhui = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-JJ, heure locale

module.exports = [
  {
    nom: 'accueil → ligne d’un chantier en cours → la fiche s’affiche avec ses onglets (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'dashboard', largeur: 375 });
      await attendre(1500);
      const ouvert = await page.evaluate(() => {
        const bouton = document.querySelector('section[aria-label="Chantiers en cours"] [data-ui="LigneListe"] > button');
        const titre = bouton?.innerText.split('\n')[0] || '';
        bouton?.click();
        return titre;
      });
      verifier(!!ouvert, 'l’Accueil liste des chantiers en cours');
      await attendre(1500);
      const noms = await nomsOnglets(page);
      verifier(noms.includes('Aperçu') && noms.includes('Tâches') && noms.includes('Documents'), `la fiche de « ${ouvert} » s’affiche avec ses onglets (${noms.join(', ') || 'aucun : écran blanc'})`);
      const titre = await page.evaluate(() => document.querySelector('h1')?.innerText || '');
      verifier(titre.includes(ouvert), `et c’est bien ce chantier (« ${titre} »)`);
    },
  },
  {
    nom: 'cloche → chantier en retard → sa fiche s’affiche (375 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000010', nom: 'Petit', prenom: 'Jo', created_at: '2026-10-01T08:00:00Z' };
      const TARDIF = { id: 'c1c1c1c1-0000-4000-8000-000000000010', nom: 'Toiture Petit Parcours', client_id: CLIENT.id, statut: 'en_cours', avancement: 30, date_debut: '2026-08-01', date_fin: '2026-09-15', created_at: '2026-10-01T08:00:00Z' };
      const base = creerBase({ clients: [CLIENT], chantiers: [TARDIF] });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'dashboard', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2500);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^Notifications/.test(b.getAttribute('aria-label') || ''))?.click());
      await attendre(600);
      const cible = await page.evaluate(() => {
        const bouton = [...document.querySelectorAll('[role="dialog"] li button')].find((b) => /Chantier ".*" en retard de/.test(b.innerText));
        const texte = bouton?.innerText.replace(/\s+/g, ' ') || null;
        bouton?.click();
        return texte;
      });
      verifier(!!cible, `la cloche annonce un chantier en retard (${cible})`);
      await attendre(1500);
      const noms = await nomsOnglets(page);
      verifier(noms.includes('Aperçu') && noms.includes('Documents'), `toucher l’alerte ouvre la fiche (${noms.join(', ') || 'écran blanc'})`);
      const nom = (/"(.*)"/.exec(cible) || [])[1];
      const titre = await page.evaluate(() => document.querySelector('h1')?.innerText || '');
      verifier(nom && titre.includes(nom), `la fiche est celle du chantier annoncé (« ${titre} »)`);
    },
  },
  {
    // Une seule règle (src/lib/echeanceChantier.js) pour la cloche, la liste et la fiche : seul un chantier EN COURS dont la fin
    // est passée est en retard (rouge) ; le jour même, ou un prospect dont la date est passée, c'est « à surveiller » (ambre).
    nom: 'cloche et liste : fin prévue aujourd’hui = ambre, jamais « en retard » ; un prospect à la date passée n’est pas en retard',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000011', nom: 'Leroy', prenom: 'Anne', created_at: '2026-10-01T08:00:00Z' };
      const DU_JOUR = { id: 'c1c1c1c1-0000-4000-8000-000000000011', nom: 'Echéance du jour Leroy', client_id: CLIENT.id, statut: 'en_cours', avancement: 40, date_debut: '2026-09-01', date_fin: aujourdhui(), created_at: '2026-10-01T08:00:00Z' };
      const PROSPECT = { id: 'c1c1c1c1-0000-4000-8000-000000000012', nom: 'Prospect date passée Leroy', client_id: CLIENT.id, statut: 'prospect', avancement: 0, date_debut: '2026-08-01', date_fin: '2026-09-01', created_at: '2026-10-01T08:00:00Z' };
      const TARDIF = { id: 'c1c1c1c1-0000-4000-8000-000000000013', nom: 'Retard Leroy', client_id: CLIENT.id, statut: 'en_cours', avancement: 20, date_debut: '2026-08-01', date_fin: '2026-09-01', created_at: '2026-10-01T08:00:00Z' };
      const base = creerBase({ clients: [CLIENT], chantiers: [DU_JOUR, PROSPECT, TARDIF] });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'chantiers', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2200);
      // La liste : la fin du jour en ambre, le retard en rouge, le prospect en ambre (jamais rouge)
      const cartes = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('button[aria-label^="Ouvrir le chantier"]')].map((b) => {
        const fin = [...b.querySelectorAll('span')].find((s) => !s.children.length && /^Fin (le|dans|dépassée|prévue)/.test(s.innerText.trim()));
        return [b.getAttribute('aria-label').replace('Ouvrir le chantier ', ''), { texte: fin?.innerText.trim() || '', classe: fin?.className || '' }];
      })));
      verifier(/aujourd'hui/.test(cartes['Echéance du jour Leroy']?.texte) && /alerte/.test(cartes['Echéance du jour Leroy']?.classe), `fin du jour : ambre (${JSON.stringify(cartes['Echéance du jour Leroy'])})`);
      verifier(/dépassée/.test(cartes['Retard Leroy']?.texte) && /danger/.test(cartes['Retard Leroy']?.classe), `chantier en cours en retard : rouge (${JSON.stringify(cartes['Retard Leroy'])})`);
      verifier(/dépassée/.test(cartes['Prospect date passée Leroy']?.texte) && /alerte/.test(cartes['Prospect date passée Leroy']?.classe) && !/danger/.test(cartes['Prospect date passée Leroy']?.classe), `prospect à la date passée : ambre, pas rouge (${JSON.stringify(cartes['Prospect date passée Leroy'])})`);
      // La cloche : le retard en retard ; la fin du jour « fin prévue aujourd'hui » en ambre ; rien pour le prospect
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^Notifications/.test(b.getAttribute('aria-label') || ''))?.click());
      await attendre(700);
      const cloche = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] li')].map((li) => ({ texte: li.innerText.replace(/\s+/g, ' ').trim(), rouge: !!li.querySelector('[class*="bg-danger-fond"]'), ambre: !!li.querySelector('[class*="bg-alerte-fond"]') })));
      const retard = cloche.find((n) => /Retard Leroy/.test(n.texte));
      const duJour = cloche.find((n) => /Echéance du jour Leroy/.test(n.texte));
      verifier(retard && /en retard de/.test(retard.texte) && retard.rouge, `la cloche annonce le retard, en rouge (${JSON.stringify(retard)})`);
      verifier(duJour && /fin prévue aujourd'hui/.test(duJour.texte) && !/en retard/.test(duJour.texte) && duJour.ambre && !duJour.rouge, `la fin du jour est « à surveiller », en ambre (${JSON.stringify(duJour)})`);
      verifier(!cloche.some((n) => /Prospect date passée/.test(n.texte)), 'le prospect à la date passée n’apparaît pas comme un retard');
    },
  },
  {
    // Avant : la carte d'un prospect disait toujours « Créer le devis », même quand un devis existait — la fiche disait « Ouvrir le devis ».
    nom: 'liste : la carte d’un prospect dit comme la fiche — « Ouvrir le devis » avec un devis lié, « Créer le devis » sans',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'chantiers', largeur: 375 });
      await attendre(800);
      const boutons = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('article')].map((a) => [
        a.querySelector('button[aria-label^="Ouvrir le chantier"]')?.getAttribute('aria-label').replace('Ouvrir le chantier ', ''),
        [...a.querySelectorAll('button')].map((b) => b.innerText.trim()).filter((t) => /devis/.test(t)),
      ])));
      const avecDevis = boutons['Extension maison Petit'];
      verifier(avecDevis && avecDevis.includes('Ouvrir le devis') && !avecDevis.includes('Créer le devis'), `la carte du prospect qui a un devis dit « Ouvrir le devis » (${JSON.stringify(avecDevis)})`);
      await page.evaluate(() => [...document.querySelectorAll('article')].find((a) => /Extension maison Petit/.test(a.innerText))?.querySelectorAll('button')[1]?.click());
      await attendre(1500);
      const apres = await page.evaluate(() => ({ page: localStorage.getItem('cp_current_page'), texte: document.body.innerText }));
      verifier(apres.page === 'devis' && /DEV-|FAC-/.test(apres.texte), `le bouton ouvre le devis dans Devis & factures (${apres.page})`);
    },
  },
  {
    nom: 'liste : la carte d’un prospect sans devis propose « Créer le devis »',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000012', nom: 'Faure', prenom: 'Luc', created_at: '2026-10-01T08:00:00Z' };
      const PROSPECT = { id: 'c1c1c1c1-0000-4000-8000-000000000014', nom: 'Pergola Faure Parcours', client_id: CLIENT.id, statut: 'prospect', avancement: 0, created_at: '2026-10-01T08:00:00Z' };
      const base = creerBase({ clients: [CLIENT], chantiers: [PROSPECT] });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'chantiers', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2000);
      const textes = await page.evaluate(() => [...(document.querySelector('article')?.querySelectorAll('button') || [])].map((b) => b.innerText.trim()).filter((t) => /devis/.test(t)));
      verifier(textes.length === 1 && textes[0] === 'Créer le devis', `sans devis lié : « Créer le devis » (${JSON.stringify(textes)})`);
    },
  },
  {
    // Le rapport est gardé sur l'appareil (localStorage) : le message le dit, au lieu de « Brouillon enregistré » tout court.
    nom: 'rapport de chantier : le message dit « sur cet appareil » et passe par la notification de l’app',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'chantiers', largeur: 1440 });
      await ouvrirFiche(page, attendre, 'Rénovation cuisine');
      await ongletFiche(page, attendre, 'Documents');
      await ecouterMessages(page);
      verifier(await cliquerBouton(page, 'Nouveau rapport'), 'le bouton « Nouveau rapport » est là');
      await attendre(500);
      verifier(await cliquerBouton(page, 'Enregistrer brouillon'), 'le bouton « Enregistrer brouillon » est là');
      await attendre(700);
      const messages = await page.evaluate(() => window.__messages || []);
      verifier(messages.some((m) => /Brouillon enregistré sur cet appareil/.test(m)), `le message dit où le rapport est gardé (${JSON.stringify(messages)})`);
      const maison = await page.evaluate(() => !!document.querySelector('.fixed.top-4.right-4'));
      verifier(!maison, 'plus de notification faite main dans le rapport');
    },
  },
  {
    // « Terminé » et « Abandonné » ferment le chantier : confirmation, et la date de fin est celle d'aujourd'hui (comme « Terminer »).
    nom: 'fiche chantier : « Terminé » et « Abandonné » demandent confirmation et posent la date de fin',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000013', nom: 'Roux', prenom: 'Eva', created_at: '2026-10-01T08:00:00Z' };
      const A = { id: 'c1c1c1c1-0000-4000-8000-000000000015', nom: 'Cloison Roux Parcours', client_id: CLIENT.id, statut: 'en_cours', avancement: 50, date_fin: '2026-12-31', created_at: '2026-10-01T08:00:00Z' };
      const B = { id: 'c1c1c1c1-0000-4000-8000-000000000016', nom: 'Terrasse Roux Parcours', client_id: CLIENT.id, statut: 'en_cours', avancement: 50, date_fin: '2026-12-31', created_at: '2026-10-01T08:00:00Z' };
      const base = creerBase({ clients: [CLIENT], chantiers: [A, B] });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'chantiers', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2000);
      const choisir = async (valeur) => {
        const statut = await page.evaluateHandle(() => [...document.querySelectorAll('label')].find((l) => l.innerText.includes('Statut du chantier'))?.querySelector('select'));
        await statut.asElement().select(valeur);
        await attendre(700);
      };
      const enBase = (id) => base.tables.chantiers.find((c) => c.id === id);
      await ouvrirFiche(page, attendre, 'Cloison Roux');
      await choisir('termine');
      const dialogue = await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText.replace(/\s+/g, ' ') || '');
      verifier(/Terminer le chantier/.test(dialogue), `« Terminé » demande confirmation (${dialogue.slice(0, 80)})`);
      await cliquerBouton(page, 'Annuler', { dansFenetre: true });
      await attendre(800);
      verifier(enBase(A.id).statut === 'en_cours', 'annulé : le chantier reste en cours en base');
      await choisir('termine');
      await cliquerBouton(page, 'Confirmer', { dansFenetre: true });
      await attendre(1800);
      verifier(enBase(A.id).statut === 'termine' && enBase(A.id).date_fin === aujourdhui(), `confirmé : terminé, fin d’aujourd’hui (${enBase(A.id).statut} / ${enBase(A.id).date_fin})`);
      // Abandonné
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Retour|Chantiers/.test(b.getAttribute('aria-label') || ''))?.click());
      await attendre(800);
      await ouvrirFiche(page, attendre, 'Terrasse Roux');
      await choisir('abandonne');
      const dialogue2 = await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText.replace(/\s+/g, ' ') || '');
      verifier(/Abandonner le chantier/.test(dialogue2), `« Abandonné » demande confirmation (${dialogue2.slice(0, 80)})`);
      await cliquerBouton(page, 'Confirmer', { dansFenetre: true });
      await attendre(1800);
      verifier(enBase(B.id).statut === 'abandonne' && enBase(B.id).date_fin === aujourdhui(), `confirmé : abandonné, fin d’aujourd’hui (${enBase(B.id).statut} / ${enBase(B.id).date_fin})`);
    },
  },
];
