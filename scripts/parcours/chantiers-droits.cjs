// Relecture de la Task 6 (tour 1, 26 oct. 2026) : les prix selon le rôle, les droits sur les tâches, et « pas de faux succès »
// (une écriture refusée par la base ne s'annonce pas, et la saisie reste).
const { creerBase, UID } = require('../lib/fauxSupabase.cjs');
const { ouvrirFiche, ongletFiche, nomsOnglets, ecouterMessages, cliquerBouton, texteContenu } = require('../lib/parcoursChantier.cjs');

const json = (corps, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(corps) });
const REFUS = (table) => json({ code: '42501', message: `new row violates row-level security policy for table "${table}"` }, 403);

// Un chantier avec devis signé, facture à encaisser, dépense qui dépasse le budget : de quoi voir des prix partout
function jeuAvecPrix() {
  const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000021', nom: 'Morel', prenom: 'Claire', created_at: '2026-10-01T08:00:00Z' };
  const CHANTIER = {
    id: 'c1c1c1c1-0000-4000-8000-000000000021', nom: 'Rénovation Morel Parcours', client_id: CLIENT.id, statut: 'en_cours', avancement: 60,
    budget_prevu: 8500, date_debut: '2026-09-01', date_fin: '2026-09-30', created_at: '2026-10-01T08:00:00Z',
  };
  const DEVIS = {
    id: 'd0d0d0d0-0000-4000-8000-000000000021', client_id: CLIENT.id, chantier_id: CHANTIER.id, type: 'devis', statut: 'accepte', numero: 'DEV-2026-0021',
    date: '2026-09-02', date_validite: '2026-10-02', total_ht: 8500, total_tva: 850, total_ttc: 9350, lignes: [], created_at: '2026-09-02T08:00:00Z',
  };
  const FACTURE = {
    id: 'd0d0d0d0-0000-4000-8000-000000000022', client_id: CLIENT.id, chantier_id: CHANTIER.id, type: 'facture', statut: 'envoye', numero: 'FAC-2026-0022',
    devis_source_id: DEVIS.id, facture_type: 'acompte', date: '2026-09-10', date_echeance: '2026-10-10', total_ht: 2000, total_tva: 200, total_ttc: 2200, lignes: [], created_at: '2026-09-10T08:00:00Z',
  };
  const DEPENSE = { id: 'e0e0e0e0-0000-4000-8000-000000000021', chantier_id: CHANTIER.id, description: 'Fournitures Morel', montant: 9200, date: '2026-09-20', categorie: 'Matériaux', created_at: '2026-09-20T08:00:00Z' };
  return { CLIENT, CHANTIER, DEVIS, FACTURE, DEPENSE };
}

module.exports = [
  {
    // Une seule règle : canViewPrices de usePermissions() — fausse pour chef_chantier et ouvrier. Sans ce droit : aucun budget, marge,
    // coût, ni montant de document, ni onglet Finances, ni tri « Par marge ».
    nom: 'chef de chantier : aucun montant dans la liste, la fiche ni l’onglet Documents (375 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, cliquer, sessionFactice }) {
      const { CLIENT, CHANTIER, DEVIS, FACTURE, DEPENSE } = jeuAvecPrix();
      const base = creerBase({ clients: [CLIENT], chantiers: [CHANTIER], devis: [DEVIS, FACTURE], depenses: [DEPENSE] }, { role: 'chef_chantier' });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'chantiers', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2500);
      const liste = await texteContenu(page);
      verifier(/Rénovation Morel Parcours/.test(liste), 'la liste montre le chantier au chef de chantier');
      verifier(!/€|\bHT\b|Budget|Marge/.test(liste), `aucun montant, budget ni marge dans la liste (« ${liste.slice(0, 160)} »)`);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^Trier/.test(b.innerText.trim()) || /Trier/.test(b.getAttribute('aria-label') || ''))?.click());
      await attendre(500);
      const tris = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"], [role="listbox"], [role="menu"]')].map((e) => e.innerText).join(' '));
      verifier(!/Par marge/.test(tris), 'le tri « Par marge » n’est pas proposé');
      await page.keyboard.press('Escape');
      await attendre(300);
      await ouvrirFiche(page, attendre, 'Rénovation Morel');
      const noms = await nomsOnglets(page);
      verifier(!noms.includes('Finances'), `pas d’onglet Finances (${noms.join(', ')})`);
      verifier(noms.includes('Aperçu') && noms.includes('Documents'), 'mais Aperçu et Documents restent');
      const apercu = await texteContenu(page);
      verifier(!/€|En chiffres|Budget|Marge|Dépensé|Facturé/.test(apercu), `aucun chiffre financier dans l’aperçu (« ${apercu.slice(0, 160)} »)`);
      await ongletFiche(page, attendre, 'Documents');
      const documents = await texteContenu(page);
      verifier(/Devis|Facture|Acompte/.test(documents), 'les devis et factures sont listés (type, numéro, statut)');
      verifier(!/€/.test(documents), `mais sans aucun montant (« ${documents.slice(0, 200)} »)`);
      // Le formulaire « Modifier » ne demande ni budget ni objectif de coûts (les valeurs déjà saisies sont gardées)
      await cliquer(page, "Plus d'actions");
      await attendre(500);
      const modifier = await page.evaluate(() => {
        const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => x.innerText.trim() === 'Modifier');
        b?.click();
        return !!b;
      });
      verifier(modifier, 'le chef de chantier peut modifier la fiche');
      await attendre(700);
      await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find((x) => /Plus de détails/.test(x.innerText))?.click());
      await attendre(400);
      const formulaire = await page.evaluate(() => ({ budget: !!document.querySelector('#chantier-budget'), materiaux: !!document.querySelector('#chantier-budget-materiaux'), heures: !!document.querySelector('#chantier-heures'), texte: document.querySelector('[role="dialog"]')?.innerText || '' }));
      verifier(formulaire.heures && !formulaire.budget && !formulaire.materiaux, `le formulaire de chantier cache le budget et l’objectif de matériaux (${JSON.stringify({ b: formulaire.budget, m: formulaire.materiaux, h: formulaire.heures })})`);
      verifier(!/€/.test(formulaire.texte), 'et aucun « € » dans la fenêtre');
    },
  },
  {
    nom: 'chef de chantier : le planning montre les échéances de documents sans montant (1440 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const { CLIENT, CHANTIER, DEVIS, FACTURE } = jeuAvecPrix();
      const echue = new Date(); echue.setDate(echue.getDate() + 3);
      const FACTURE_A_VENIR = { ...FACTURE, date_echeance: echue.toLocaleDateString('sv-SE') };
      for (const [role, attendu] of [['chef_chantier', 'sans montant'], ['owner', 'avec reste dû']]) {
        const base = creerBase({ clients: [CLIENT], chantiers: [CHANTIER], devis: [DEVIS, FACTURE_A_VENIR] }, { role });
        const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'planning', session: sessionFactice(UID), supabase: base.reponse });
        await attendre(2500);
        await cliquerBouton(page, 'Agenda');
        await attendre(500);
        const ouvert = await page.evaluate(() => {
          const ligne = [...document.querySelectorAll('button')].find((b) => /Facture FAC-2026-0*22/.test(b.innerText));
          ligne?.click();
          return !!ligne;
        });
        verifier(ouvert, `${role} : l’échéance « Facture FAC-2026-0022 » est dans l’agenda`);
        await attendre(500);
        const detail = await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText.replace(/\s+/g, ' ') || '');
        verifier(/Échéance facture/.test(detail), `${role} : le détail dit « Échéance facture » (${detail.slice(0, 120)})`);
        if (role === 'chef_chantier') verifier(!/€/.test(detail), `${attendu} : aucun montant pour le chef de chantier (${detail.slice(0, 160)})`);
        else verifier(/reste dû 2\s?200\s?€/.test(detail), `${attendu} : le montant est le reste dû (${detail.slice(0, 160)})`);
      }
    },
  },
  {
    // Avant : fenêtre fermée et saisie effacée AVANT que la base ait répondu ; un refus laissait croire que c'était fait.
    nom: 'ajustement de revenu : refusé par la base, la fenêtre et la saisie restent, rien n’est annoncé ; accepté, c’est écrit',
    reel: true,
    async executer({ ouvrir, attendre, verifier, cliquer, saisir, sessionFactice }) {
      const { CLIENT, CHANTIER } = jeuAvecPrix();
      let refus = true;
      const base = creerBase({ clients: [CLIENT], chantiers: [CHANTIER] }, { refuser: (m, table) => (refus && m === 'POST' && table === 'ajustements' ? REFUS('ajustements') : null) });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'chantiers', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2200);
      await ouvrirFiche(page, attendre, 'Rénovation Morel');
      await ongletFiche(page, attendre, 'Finances');
      await ecouterMessages(page);
      await cliquer(page, 'Revenu');
      await saisir(page, '[role="dialog"] input[placeholder^="Ex: Travaux"]', 'Travaux en plus');
      await saisir(page, '[role="dialog"] input[type="number"]', '450');
      await cliquer(page, 'Ajouter');
      await attendre(1500);
      const apresRefus = await page.evaluate(() => ({
        ouverte: !!document.querySelector('[role="dialog"]'),
        libelle: document.querySelector('[role="dialog"] input[placeholder^="Ex: Travaux"]')?.value,
        montant: document.querySelector('[role="dialog"] input[type="number"]')?.value,
        messages: window.__messages || [],
      }));
      verifier(apresRefus.ouverte && apresRefus.libelle === 'Travaux en plus' && apresRefus.montant === '450', `refusé : la fenêtre et la saisie restent (${JSON.stringify({ o: apresRefus.ouverte, l: apresRefus.libelle, m: apresRefus.montant })})`);
      verifier(!apresRefus.messages.some((m) => /Ajustement enregistré/.test(m)), `refusé : « Ajustement enregistré » n’est pas annoncé (${JSON.stringify(apresRefus.messages)})`);
      refus = false;
      await cliquer(page, 'Ajouter');
      await attendre(1800);
      const apres = await page.evaluate(() => ({ ouverte: !!document.querySelector('[role="dialog"]'), messages: window.__messages || [] }));
      verifier(!apres.ouverte, 'accepté : la fenêtre se ferme');
      verifier(apres.messages.some((m) => /Ajustement enregistré/.test(m)), `accepté : le geste se dit (${JSON.stringify(apres.messages)})`);
      verifier((base.tables.ajustements || []).some((a) => a.description === 'Travaux en plus'), 'l’ajustement est en base');
    },
  },
  {
    nom: 'fiche chantier : une tâche ou un mémo refusé par la base garde la saisie',
    reel: true,
    async executer({ ouvrir, attendre, verifier, cliquer, saisir, sessionFactice }) {
      const { CLIENT, CHANTIER } = jeuAvecPrix();
      let refus = true;
      const base = creerBase({ clients: [CLIENT], chantiers: [CHANTIER] }, {
        refuser: (m, table) => (refus && ((m === 'PATCH' && table === 'chantiers') || (m === 'POST' && table === 'memos')) ? REFUS(table) : null),
      });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'chantiers', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2200);
      await ouvrirFiche(page, attendre, 'Rénovation Morel');
      // Tâche
      await ongletFiche(page, attendre, 'Tâches');
      await saisir(page, 'input[aria-label="Ajouter une tâche"]', 'Poser les goulottes');
      await cliquer(page, 'Ajouter la tâche');
      await attendre(1500);
      const tache = await page.evaluate(() => document.querySelector('input[aria-label="Ajouter une tâche"]')?.value);
      verifier(tache === 'Poser les goulottes', `tâche refusée : le texte reste dans le champ (« ${tache} »)`);
      // Mémo
      await ongletFiche(page, attendre, 'Notes');
      await saisir(page, 'input[aria-label="Nouveau mémo pour ce chantier"]', 'Appeler le maçon');
      await cliquer(page, 'Ajouter le mémo');
      await attendre(1500);
      const memo = await page.evaluate(() => document.querySelector('input[aria-label="Nouveau mémo pour ce chantier"]')?.value);
      verifier(memo === 'Appeler le maçon', `mémo refusé : le texte reste dans le champ (« ${memo} »)`);
      refus = false;
      await cliquer(page, 'Ajouter le mémo');
      await attendre(1500);
      const apres = await page.evaluate(() => document.querySelector('input[aria-label="Nouveau mémo pour ce chantier"]')?.value);
      verifier(apres === '' && (base.tables.memos || []).some((m) => m.text === 'Appeler le maçon'), 'accepté : le champ se vide et le mémo est en base');
    },
  },
  {
    nom: 'tâches : une suppression, une date ou une récurrence refusée par la base n’est pas annoncée comme faite',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const aujourdhui = new Date().toLocaleDateString('sv-SE');
      const MEMO = { id: 'f0f0f0f0-0000-4000-8000-000000000031', text: 'Appeler le fournisseur', status: 'a_faire', is_done: false, due_date: '2026-10-01', created_at: '2026-10-01T08:00:00Z' };
      const REC = { id: 'f0f0f0f0-0000-4000-8000-000000000032', text: 'Relever les compteurs', status: 'a_faire', is_done: false, due_date: aujourdhui, recurrence: JSON.stringify({ type: 'weekly' }), created_at: '2026-10-01T08:00:00Z' };
      let refus = true;
      const base = creerBase({ memos: [MEMO, REC] }, {
        refuser: (m, table) => (refus && table === 'memos' && (m === 'DELETE' || m === 'POST' || (m === 'PATCH' && refus === 'date')) ? REFUS('memos') : null),
      });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'tasks', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2500);
      await ecouterMessages(page);
      // Suppression d'une ligne (action rapide, au survol)
      await page.evaluate(() => [...document.querySelectorAll('div.group')].find((g) => /Appeler le fournisseur/.test(g.innerText))?.querySelector('button[title="Supprimer"]')?.click());
      await attendre(500);
      await cliquerBouton(page, 'Supprimer', { dansFenetre: true });
      await attendre(1500);
      let messages = await page.evaluate(() => window.__messages || []);
      verifier(!messages.some((m) => /Tâche supprimée/.test(m)), `suppression refusée : « Tâche supprimée » n’est pas annoncé (${JSON.stringify(messages)})`);
      verifier(await page.evaluate(() => /Appeler le fournisseur/.test(document.body.innerText)), 'suppression refusée : la tâche reste dans la liste');
      // Date du jour
      refus = 'date';
      await page.evaluate(() => { window.__messages = []; });
      await page.evaluate(() => [...document.querySelectorAll('div.group')].find((g) => /Appeler le fournisseur/.test(g.innerText))?.querySelector('button[title="Mettre à aujourd\'hui"]')?.click());
      await attendre(1500);
      messages = await page.evaluate(() => window.__messages || []);
      verifier(!messages.some((m) => /Date mise à aujourd/.test(m)), `date refusée : « Date mise à aujourd’hui » n’est pas annoncé (${JSON.stringify(messages)})`);
      // Récurrence : cocher une tâche répétée dont la suivante ne peut pas être créée
      refus = true;
      await page.evaluate(() => { window.__messages = []; });
      await page.evaluate(() => [...document.querySelectorAll('div.group')].find((g) => /Relever les compteurs/.test(g.innerText))?.querySelector('button[aria-label="Marquer comme fait"]')?.click());
      await attendre(1800);
      messages = await page.evaluate(() => window.__messages || []);
      verifier(!messages.some((m) => /Prochaine occurrence créée/.test(m)), `suivante refusée : « Prochaine occurrence créée » n’est pas annoncé (${JSON.stringify(messages)})`);
    },
  },
  {
    nom: 'tâches : sans le droit de créer, modifier ni supprimer, rien à saisir, à cocher ou à supprimer (rôle lecture seule)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const faits = [1, 2, 3].map((n) => ({ id: `f0f0f0f0-0000-4000-8000-00000000004${n}`, text: `Tâche faite ${n}`, status: 'termine', is_done: true, done_at: '2026-10-20T08:00:00Z', created_at: '2026-10-01T08:00:00Z' }));
      const A_FAIRE = { id: 'f0f0f0f0-0000-4000-8000-000000000050', text: 'Tâche à faire', status: 'a_faire', is_done: false, created_at: '2026-10-01T08:00:00Z' };
      const base = creerBase({ memos: [A_FAIRE, ...faits] }, { role: 'readonly' });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'tasks', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2500);
      const etat = await page.evaluate(() => ({
        saisie: !!document.querySelector('input[aria-label="Créer une nouvelle tâche"]'),
        cases: [...document.querySelectorAll('button[aria-label="Marquer comme fait"], button[aria-label="Marquer comme non fait"]')].map((b) => b.disabled),
        supprimerTerminees: [...document.querySelectorAll('button')].some((b) => /Supprimer les \d+ terminées/.test(b.innerText)),
        actions: document.querySelectorAll('button[title="Supprimer"], button[title="Mettre à aujourd\'hui"]').length,
        glisse: document.querySelectorAll('[draggable="true"]').length,
      }));
      verifier(!etat.saisie, 'pas de champ « Nouvelle tâche »');
      verifier(etat.cases.length > 0 && etat.cases.every(Boolean), `les cases à cocher sont inertes (${JSON.stringify(etat.cases)})`);
      verifier(!etat.supprimerTerminees, 'pas de « Supprimer les terminées »');
      verifier(etat.actions === 0, `pas d’action rapide (date, suppression) (${etat.actions})`);
      verifier(etat.glisse === 0, `rien à glisser (${etat.glisse})`);
      // Le panneau de détail est en lecture seule
      await page.evaluate(() => [...document.querySelectorAll('div.group')].find((g) => /Tâche à faire/.test(g.innerText))?.click());
      await attendre(600);
      const detail = await page.evaluate(() => ({
        champDesactive: document.querySelector('[role="dialog"] fieldset')?.disabled === true,
        supprimer: !!document.querySelector('[role="dialog"] button[aria-label^="Supprimer cette tâche"]'),
      }));
      verifier(detail.champDesactive && !detail.supprimer, `le détail est en lecture seule, sans suppression (${JSON.stringify(detail)})`);
    },
  },
  {
    // Relecture de la Task 6, tour 2 : le Journal affichait « Total HT 8 000 € → 8 500 € » et « montant_devis 8000 → 8500 » à un chef de chantier.
    nom: 'chef de chantier : le journal du chantier n’affiche aucun montant mais garde le reste ; le gérant voit tout (375 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const { CLIENT, CHANTIER, DEVIS } = jeuAvecPrix();
      const entree = (id, type, entityId, action, changes, minutes) => ({
        id, entity_type: type, entity_id: entityId, action, changes, metadata: {}, snapshot_id: null, user_name: 'Hugo', created_at: new Date(Date.now() - minutes * 60000).toISOString(),
      });
      const AUDIT = [
        entree('a0a0a0a0-0000-4000-8000-000000000001', 'chantier', CHANTIER.id, 'updated', { montant_devis: { old: 8000, new: 8500 }, avancement: { old: 40, new: 60 } }, 10),
        entree('a0a0a0a0-0000-4000-8000-000000000002', 'chantier', CHANTIER.id, 'updated', { montant_devis: { old: 7000, new: 8000 } }, 20),
        entree('a0a0a0a0-0000-4000-8000-000000000003', 'devis', DEVIS.id, 'updated', { total_ht: { old: 8000, new: 8500 }, total_ttc: { old: 9600, new: 10200 }, remise_globale: { old: 0, new: 5 } }, 30),
        entree('a0a0a0a0-0000-4000-8000-000000000004', 'devis', DEVIS.id, 'updated', { objet: { old: 'Cuisine', new: 'Cuisine complète' }, total_ht: { old: 8000, new: 8500 } }, 40),
        entree('a0a0a0a0-0000-4000-8000-000000000005', 'devis', DEVIS.id, 'status_changed', { statut: { old: 'brouillon', new: 'envoye' } }, 50),
      ];
      const lignesAudit = (u) => {
        const type = (u.searchParams.get('entity_type') || '').replace(/^eq\./, '');
        const brut = u.searchParams.get('entity_id') || '';
        const ids = brut.startsWith('in.') ? brut.slice(4, -1).split(',') : [brut.replace(/^eq\./, '')];
        return AUDIT.filter((e) => e.entity_type === type && ids.includes(e.entity_id));
      };
      for (const role of ['owner', 'chef_chantier']) {
        const base = creerBase({ clients: [CLIENT], chantiers: [CHANTIER], devis: [DEVIS] }, { role });
        const { page } = await ouvrir({
          reel: true, largeur: 375, page: 'chantiers', session: sessionFactice(UID),
          supabase: (req, u) => (u.pathname === '/rest/v1/audit_logs' ? json(lignesAudit(u)) : base.reponse(req, u)),
        });
        await attendre(2500);
        await ouvrirFiche(page, attendre, 'Rénovation Morel');
        await ongletFiche(page, attendre, 'Journal');
        await attendre(1200);
        await page.evaluate(() => [...document.querySelectorAll('#main-content button')].filter((b) => /modification/.test(b.innerText)).forEach((b) => b.click()));
        await attendre(500);
        const journal = await page.evaluate(() => ({ entrees: document.querySelectorAll('#main-content .relative.pl-10').length, texte: (document.querySelector('#main-content')?.innerText || '').replace(/\s+/g, ' ') }));
        if (role === 'owner') {
          verifier(journal.entrees === 5, `gérant : les cinq entrées du journal (${journal.entrees})`);
          verifier(/8\s?500\s?€/.test(journal.texte) && /Total HT/.test(journal.texte), `gérant : les montants sont là (${journal.texte.slice(0, 160)})`);
        } else {
          verifier(journal.entrees === 3, `chef de chantier : trois entrées, celles qui ne portaient que des montants ont disparu (${journal.entrees})`);
          verifier(!/€|Total|Remise|Montant|\b8[\s\u202f\u00a0]?[05]00\b|\b9[\s\u202f\u00a0]?600\b|\b10[\s\u202f\u00a0]?200\b/.test(journal.texte), `chef de chantier : ni « € », ni total, ni montant (${journal.texte.slice(0, 200)})`);
          verifier(/avancement/i.test(journal.texte) && /Objet/.test(journal.texte) && /Statut modifié/.test(journal.texte), 'chef de chantier : le reste du journal est gardé (avancement, objet, statut)');
        }
      }
    },
  },
  {
    // Relecture de la Task 6, tour 2 : taper dans A puis passer à B avant la pause de 0,8 s écrivait le texte de A dans B.
    nom: 'notes de chantier : taper dans A puis passer à B tout de suite écrit dans A ; B reste inchangé (1440 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, saisir, sessionFactice }) {
      const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000031', nom: 'Girard', prenom: 'Lou', created_at: '2026-10-01T08:00:00Z' };
      const A = { id: 'c1c1c1c1-0000-4000-8000-000000000031', nom: 'Alpha Notes Parcours', client_id: CLIENT.id, statut: 'en_cours', avancement: 10, notes: '', created_at: '2026-10-01T08:00:00Z' };
      const B = { id: 'c1c1c1c1-0000-4000-8000-000000000032', nom: 'Bravo Notes Parcours', client_id: CLIENT.id, statut: 'en_cours', avancement: 10, notes: 'Note de B, ne pas toucher', created_at: '2026-10-02T08:00:00Z' };
      const base = creerBase({ clients: [CLIENT], chantiers: [A, B] });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'chantiers', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2500);
      await ouvrirFiche(page, attendre, 'Alpha Notes');
      await ongletFiche(page, attendre, 'Notes');
      await saisir(page, '#main-content textarea', 'Code du portail : 4521');
      // tout de suite, sans attendre la pause : le chantier suivant
      const suivant = await page.evaluate(() => {
        const b = [...document.querySelectorAll('[data-ui="EnTeteChantier"] button')].find((x) => /Bravo Notes/.test(x.innerText));
        b?.click();
        return !!b;
      });
      verifier(suivant, 'le bouton du chantier suivant est là');
      await attendre(2200);
      const de = (id) => base.tables.chantiers.find((c) => c.id === id);
      verifier(de(A.id).notes === 'Code du portail : 4521', `A a reçu le texte tapé (« ${de(A.id).notes} »)`);
      verifier(de(B.id).notes === 'Note de B, ne pas toucher', `B est inchangé (« ${de(B.id).notes} »)`);
      await ongletFiche(page, attendre, 'Notes');
      const affiche = await page.evaluate(() => document.querySelector('#main-content textarea')?.value);
      verifier(affiche === 'Note de B, ne pas toucher', `la fiche de B montre la note de B (« ${affiche} »)`);
    },
  },
  {
    // Balayage final (31 oct. 2026) : App.jsx ne passait pas voitPrix à la création rapide (Cmd+H), dont la valeur par défaut était « true » :
    // un chef de chantier y voyait le budget, l'objectif de coûts et les boutons « total HT » des devis. Contre-essai : retirer
    // voitPrix={canViewPrices} de <QuickChantierModal> dans App.jsx fait échouer la ligne « chef de chantier ».
    nom: 'création rapide de chantier (Ctrl+H) : le chef de chantier ne voit aucun montant, le gérant les voit, un rôle sans droit de créer ne l’ouvre pas (1440 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const { CLIENT, CHANTIER, DEVIS } = jeuAvecPrix();
      for (const role of ['chef_chantier', 'owner', 'comptable']) {
        const base = creerBase({ clients: [CLIENT], chantiers: [CHANTIER], devis: [DEVIS] }, { role });
        const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'dashboard', session: sessionFactice(UID), supabase: base.reponse });
        await attendre(2500);
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyH');
        await page.keyboard.up('Control');
        await attendre(900);
        const ouverte = await page.evaluate(() => !!document.querySelector('[role="dialog"] #chantier-nom'));
        if (role === 'comptable') {
          verifier(!ouverte, 'comptable : pas le droit de créer un chantier, Ctrl+H n’ouvre rien');
          continue;
        }
        verifier(ouverte, `${role} : Ctrl+H ouvre la création rapide`);
        await page.evaluate(() => document.querySelector('[role="dialog"] #chantier-client')?.click());
        await attendre(400);
        await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find((b) => /Morel/.test(b.innerText) && b.id !== 'chantier-client')?.click());
        await attendre(500);
        await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find((x) => /Plus de détails/.test(x.innerText))?.click());
        await attendre(400);
        const fenetre = await page.evaluate(() => ({
          budget: !!document.querySelector('#chantier-budget'),
          materiaux: !!document.querySelector('#chantier-budget-materiaux'),
          texte: (document.querySelector('[role="dialog"]')?.innerText || '').replace(/\s+/g, ' '),
        }));
        if (role === 'chef_chantier') {
          verifier(!fenetre.budget && !fenetre.materiaux, `chef de chantier : ni budget ni objectif de matériaux (${JSON.stringify({ b: fenetre.budget, m: fenetre.materiaux })})`);
          verifier(!/€/.test(fenetre.texte), `chef de chantier : aucun « € » dans la création rapide, même avec un client qui a un devis signé (« ${fenetre.texte.slice(0, 200)} »)`);
        } else {
          verifier(fenetre.budget, 'gérant : le budget du chantier est proposé');
          verifier(/8\s?500\s?€/.test(fenetre.texte), `gérant : le total du devis signé est proposé (« ${fenetre.texte.slice(0, 200)} »)`);
        }
      }
    },
  },
];
