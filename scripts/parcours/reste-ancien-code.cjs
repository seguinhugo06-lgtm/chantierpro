// Task 9 du plan « ancien code » : le reste (restes de la Task 8, tâches, ramonage, pages publiques, coque).
// Chaque correction de comportement a son parcours ici, avec un contre-essai par mutation noté au rapport.
const { creerBase, UID } = require('../lib/fauxSupabase.cjs');

const ORG = '0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e0e';
const ENTREPRISE = {
  id: 'e0e0e0e0-0000-4000-8000-000000000901', user_id: UID, organization_id: ORG, nom: 'Élec Exemple', forme_juridique: 'SARL',
  adresse: '12 rue de l’Exemple\n33000 Bordeaux', code_postal: '33000', ville: 'Bordeaux', telephone: '05 00 00 00 00', email: 'contact@exemple.fr',
  siret: '00000000000000', is_active: true, is_default: true, settings_json: { reglages: {} }, created_at: '2026-01-01T00:00:00Z',
};

module.exports = [
  {
    // Relecture ciblée de la Task 8 (27 oct. 2026) : « Ventes », « Achats », « Résumé TVA » (et « Export CSV » des
    // mouvements) étaient visibles au rôle consultation, qui n'a pas le droit d'exporter, alors que l'onglet
    // « Export comptable » lui est caché. Le droit est le même : canExportData.
    nom: 'finances : les fichiers CSV de la trésorerie demandent le droit d’export (réel, 1440 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, attendre, verifier }) {
      const lire = async (role) => {
        const base = creerBase({ entreprise: [{ ...ENTREPRISE }] }, { role });
        const { page, browser } = await ouvrir({ reel: true, largeur: 1440, page: 'finances', session: sessionFactice(UID), supabase: (req, u) => base.reponse(req, u) });
        await attendre(1800);
        await page.evaluate(() => [...document.querySelectorAll('main [role="tab"]')].find((t) => t.innerText.trim() === 'TVA')?.click());
        await attendre(700);
        const etat = await page.evaluate(() => ({
          tva: /Tableau de TVA/.test(document.querySelector('main')?.innerText || ''),
          boutons: [...document.querySelectorAll('main button')].map((b) => b.innerText.trim()),
        }));
        await browser.close();
        return etat;
      };
      const FICHIERS = ['Ventes', 'Achats', 'Résumé TVA'];
      const titulaire = await lire('owner');
      verifier(titulaire.tva, 'le tableau de TVA est ouvert pour le titulaire');
      verifier(FICHIERS.every((b) => titulaire.boutons.includes(b)), `le titulaire a Ventes, Achats et Résumé TVA (${JSON.stringify(titulaire.boutons.filter((b) => FICHIERS.includes(b)))})`);
      const consultation = await lire('readonly');
      verifier(consultation.tva, 'le tableau de TVA est lisible en consultation');
      verifier(FICHIERS.every((b) => !consultation.boutons.includes(b)), `la consultation n’a aucun fichier CSV à télécharger (${JSON.stringify(consultation.boutons.filter((b) => FICHIERS.includes(b)))})`);
    },
  },
  {
    // Relecture ciblée de la Task 8 (27 oct. 2026) : la période de la grille des offres était lue une seule fois, au
    // premier rendu. L'abonnement est relu en base et arrive après : un abonné annuel voyait « Mensuel » sélectionné.
    nom: 'mon plan : la période de l’abonné annuel suit son abonnement quand il arrive après le premier rendu (réel, 375 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, attendre, verifier }) {
      const base = creerBase({
        entreprise: [{ ...ENTREPRISE }],
        subscriptions: [{
          id: 'b0b0b0b0-0000-4000-8000-000000000001', user_id: UID, organization_id: ORG, plan: 'artisan', status: 'active',
          billing_interval: 'yearly', stripe_subscription_id: 'sub_test', current_period_end: '2027-06-01T00:00:00Z', created_at: '2026-06-01T00:00:00Z',
        }],
      });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'plan', session: sessionFactice(UID), supabase: (req, u) => base.reponse(req, u) });
      const periode = () => page.evaluate(() => ({
        plan: document.querySelector('main h2')?.innerText.trim(),
        choisie: [...document.querySelectorAll('[data-ui="Segmente"] button')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.innerText.trim()),
      }));
      await attendre(1500);
      const apres = await periode();
      verifier(apres.plan === 'Plan Artisan', `l’abonnement est arrivé (${JSON.stringify(apres)})`);
      verifier(apres.choisie.length === 1 && /^Annuel/.test(apres.choisie[0]), `la période suit l’abonnement annuel (${JSON.stringify(apres.choisie)})`);
      // L’abonné qui choisit lui-même Mensuel garde son choix
      await page.evaluate(() => [...document.querySelectorAll('[data-ui="Segmente"] button')].find((b) => b.innerText.trim() === 'Mensuel')?.click());
      await attendre(500);
      const choix = await periode();
      verifier(choix.choisie.length === 1 && choix.choisie[0] === 'Mensuel', `son choix « Mensuel » est respecté (${JSON.stringify(choix.choisie)})`);
    },
  },
  {
    // Constat du 26 oct. 2026 : le bouton « Ajouter » d'une colonne du Kanban des tâches créait une tâche VIDE (sans titre)
    // dans la colonne. Il demande maintenant le titre ; sans titre, rien n'est créé.
    nom: 'tâches : « Ajouter une tâche » d’une colonne demande un titre et n’en crée jamais de vide (réel, 1440 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, attendre, verifier }) {
      const base = creerBase({ memos: [] });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'tasks', session: sessionFactice(UID), supabase: (req, u) => base.reponse(req, u) });
      await attendre(2000);
      // La vue se choisit dans le menu « Vue » (Liste, Colonnes, Frise, Équipe)
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^Vue/.test(b.innerText.trim()))?.click());
      await attendre(500);
      await page.evaluate(() => [...document.querySelectorAll('[role="radio"], [role="dialog"] button, [role="option"]')].find((o) => o.innerText.trim() === 'Colonnes')?.click());
      await attendre(900);
      const ecritures = () => base.journal.filter((j) => j.m === 'POST' && j.table === 'memos').map((j) => (Array.isArray(j.corps) ? j.corps[0] : j.corps));
      const libelles = await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter((t) => /^Ajouter/.test(t)));
      verifier(libelles.length === 3 && libelles.every((t) => t === 'Ajouter une tâche'), `chaque colonne dit « Ajouter une tâche » (${JSON.stringify(libelles)})`);
      // 1. Ouvrir la saisie de la première colonne, valider sans titre : aucune écriture
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Ajouter une tâche')?.click());
      await attendre(400);
      verifier(await page.evaluate(() => !!document.querySelector('input[placeholder="Titre de la tâche"]')), 'la saisie du titre s’ouvre');
      verifier(await page.evaluate(() => [...document.querySelectorAll('button[type="submit"]')].some((b) => b.innerText.trim() === 'Ajouter' && b.disabled)), '« Ajouter » est inactif tant que le titre est vide');
      await page.keyboard.press('Enter');
      await attendre(500);
      verifier(ecritures().length === 0, `aucune tâche vide créée (${ecritures().length} écriture(s))`);
      // 2. Un titre : la tâche est créée dans la colonne, avec son titre
      await page.type('input[placeholder="Titre de la tâche"]', 'Poser les prises');
      await page.keyboard.press('Enter');
      await attendre(1200);
      const creees = ecritures();
      verifier(creees.length === 1 && creees[0].text === 'Poser les prises' && creees[0].status === 'a_faire', `une tâche créée dans « À faire » (${JSON.stringify(creees.map((c) => ({ t: c.text, s: c.status })))})`);
      verifier(await page.evaluate(() => /Poser les prises/.test(document.body.innerText)), 'la carte « Poser les prises » est dans la colonne');
      verifier(await page.evaluate(() => !document.querySelector('input[placeholder="Titre de la tâche"]')), 'la saisie se referme');
    },
  },
  {
    // Relecture ciblée de la Task 8 (27 oct. 2026) : le capital social d'un entrepreneur individuel apparaissait encore
    // dans l'aperçu de l'en-tête des documents et dans la fenêtre d'une entreprise (les documents ne l'impriment déjà plus).
    nom: 'paramètres : le capital social n’est dit que pour une société, jamais pour un entrepreneur individuel (réel, 1440 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, cliquer, attendre, verifier }) {
      const EI = { ...ENTREPRISE, id: 'e0e0e0e0-0000-4000-8000-000000000902', nom: 'Au Bon Volt', forme_juridique: 'Micro-entreprise', capital: 5000, settings_json: { reglages: { nomEntrepreneur: 'Jean Exemple' } } };
      const SARL = { ...ENTREPRISE, id: 'e0e0e0e0-0000-4000-8000-000000000903', forme_juridique: 'SARL', capital: 10000 };
      const apercu = async (entreprise) => {
        const base = creerBase({ entreprise: [entreprise] });
        const { page, browser } = await ouvrir({ reel: true, largeur: 1440, page: 'settings', session: sessionFactice(UID), supabase: (req, u) => base.reponse(req, u) });
        await attendre(1800);
        await cliquer(page, 'Identité', { dans: 'nav[aria-label="Rubriques des paramètres"]' });
        await attendre(500);
        const etat = await page.evaluate(() => {
          const titre = [...document.querySelectorAll('h2, h3')].find((h) => /Aperçu de l’en-tête/.test(h.innerText));
          const bloc = titre?.closest('section, div[data-bloc], div');
          return { bloc: !!titre, texte: document.querySelector('main')?.innerText || '', formeLue: !!document.getElementById('settings-field-formeJuridique') };
        });
        await browser.close();
        return etat;
      };
      const ei = await apercu(EI);
      verifier(ei.bloc, 'l’aperçu de l’en-tête est affiché (entrepreneur individuel)');
      verifier(!/Capital\s*:/.test(ei.texte) && !/5\s?000\s?€/.test(ei.texte), `aucun capital pour un entrepreneur individuel (${(ei.texte.match(/Capital[^\n]*/) || ['—'])[0]})`);
      const sarl = await apercu(SARL);
      verifier(/Capital\s*:\s*10000\s*€/.test(sarl.texte), `le capital d’une SARL reste dit dans l’aperçu (${(sarl.texte.match(/Capital[^\n]*/) || ['—'])[0]})`);

      // La fenêtre d'une entreprise (Multi-entreprise) : l'onglet Légal ne propose le capital qu'à une société
      const base = creerBase({ entreprise: [{ ...ENTREPRISE }] });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'settings', session: sessionFactice(UID), supabase: (req, u) => base.reponse(req, u) });
      await attendre(1800);
      await cliquer(page, 'Multi-entreprise', { dans: 'nav[aria-label="Rubriques des paramètres"]' });
      await attendre(600);
      await cliquer(page, 'Nouvelle entreprise');
      await attendre(600);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Légal' && b.getAttribute('aria-pressed') !== null)?.click());
      await attendre(400);
      const champCapital = () => page.evaluate(() => !!document.querySelector('input[placeholder="10 000 €"]'));
      verifier(!(await champCapital()), 'sans forme juridique, pas de champ « Capital »');
      const choisir = async (forme) => {
        await page.evaluate(() => document.getElementById('entreprise-form-forme')?.click());
        await attendre(500);
        const ok = await page.evaluate((f) => {
          const o = [...document.querySelectorAll('[role="radio"], [role="option"], [role="dialog"] button, [role="listbox"] button')].find((x) => x.innerText.trim() === f || x.innerText.trim().startsWith(`${f}\n`));
          o?.click();
          return !!o;
        }, forme);
        verifier(ok, `le choix « ${forme} » est proposé`);
        await attendre(500);
      };
      await choisir('EI');
      verifier(!(await champCapital()), 'un entrepreneur individuel (EI) n’a pas de champ « Capital »');
      await choisir('SARL');
      verifier(await champCapital(), 'une SARL a le champ « Capital »');
    },
  },
  {
    // Constat du 26 oct. 2026 : au téléphone, la méta d'une ligne de liste (« Acompte · FAC-2026-00002… ») était coupée : le
    // numéro du document ne se lisait pas. Elle passe à la ligne (devis et ramonage).
    nom: 'devis : la méta d’une ligne de liste n’est plus coupée au téléphone (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 375 });
      await attendre(1200);
      const lignes = await page.evaluate(() => [...document.querySelectorAll('main [data-ui="LigneListe"]')].map((l) => {
        const metas = [...l.querySelectorAll('span.text-sm.text-encre-2')];
        return metas.map((m) => ({ texte: m.innerText.trim().slice(0, 60), coupe: m.scrollWidth > m.clientWidth + 1, points: getComputedStyle(m).textOverflow === 'ellipsis' }));
      }).flat());
      verifier(lignes.length >= 3, `la liste a des lignes avec une méta (${lignes.length})`);
      const coupees = lignes.filter((m) => m.coupe || m.points);
      verifier(coupees.length === 0, `aucune méta coupée (${JSON.stringify(coupees.slice(0, 3))})`);
      verifier(lignes.some((m) => /FAC-\d{4}-\d{5}|DEV-\d{4}-\d{5}/.test(m.texte)), 'les numéros de documents se lisent en entier');
    },
  },
  {
    // Constat du 26 oct. 2026 : en sombre, la flèche des listes natives du ramonage était foncée sur fond bleu-noir (illisible).
    nom: 'ramonage : la flèche des listes est dessinée par l’app, claire en sombre et foncée en clair (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const avantSombre = () => { try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); localStorage.setItem('cp_theme', 'dark'); } catch { /* */ } };
      const avantClair = () => { try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); localStorage.setItem('cp_theme', 'light'); } catch { /* */ } };
      const lire = async (sombre) => {
        const { page, browser } = await ouvrir({ page: 'settings', largeur: 375, avantChargement: sombre ? avantSombre : avantClair });
        await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Documents')?.click());
        await attendre(300);
        await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Ramonage')?.click());
        await attendre(400);
        await page.click('#ramonage-actif');
        await attendre(800);
        await page.evaluate(() => localStorage.setItem('cp_current_page', 'clients'));
        await page.reload({ waitUntil: 'networkidle0' });
        await attendre(1500);
        await page.evaluate(() => [...document.querySelectorAll('[data-ui="LigneListe"] > button')].find((x) => x.innerText.includes('Dupont'))?.click());
        await attendre(900);
        await cliquer(page, 'Nouveau ramonage', { dans: '[data-testid="onglet-ramonage"]' });
        await attendre(700);
        const etat = await page.evaluate(() => {
          const s = document.getElementById('ramonage-appareil_type');
          const cs = s && getComputedStyle(s);
          return cs ? { theme: document.documentElement.getAttribute('data-theme'), appearance: cs.appearance, image: cs.backgroundImage } : null;
        });
        await browser.close();
        return etat;
      };
      const clair = await lire(false);
      const sombre = await lire(true);
      verifier(clair && /64748b/i.test(clair.image) && clair.appearance === 'none', `clair : flèche de l’app, encre secondaire (${JSON.stringify(clair)})`);
      verifier(sombre && sombre.theme === 'sombre' && /94a3b8/i.test(sombre.image) && sombre.appearance === 'none', `sombre : flèche claire (${JSON.stringify(sombre && { t: sombre.theme, a: sombre.appearance })})`);
    },
  },
  {
    // Relecture ciblée de la Task 8 (27 oct. 2026) : même cause deux fois (Catalogue puis Finances) : un libellé masqué
    // (`span.sr-only`) dans une cellule d'en-tête, hors du bloc qui défile, élargissait la PAGE.
    nom: 'tableaux : toute cellule d’en-tête est le repère de ses libellés masqués, aucun ne sort du défilement (1024 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'catalogue', largeur: 1024 });
      await attendre(1200);
      const cellules = await page.evaluate(() => [...document.querySelectorAll('th')].map((t) => getComputedStyle(t).position));
      verifier(cellules.length > 0 && cellules.every((p) => p === 'relative' || p === 'sticky'), `les cellules d’en-tête sont positionnées (${JSON.stringify([...new Set(cellules)])})`);
      const debordement = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      verifier(debordement <= 0, `la page ne déborde pas (${debordement} px)`);
    },
  },
  {
    // Constat du 26 oct. 2026 (Au Bon Volt) : l'onglet Administratif s'ouvrait sur janvier 2026, un rappel « Ajouter » et des
    // reports qui n'enregistraient rien. Le calendrier s'ouvre sur le mois en cours ; les deux placebos sont retirés.
    nom: 'administratif : le calendrier s’ouvre sur le mois en cours, sans rappel ni report qui n’enregistrent rien (1440 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'settings', largeur: 1440 });
      await attendre(800);
      await cliquer(page, 'Administratif', { dans: 'nav[aria-label="Rubriques des paramètres"]' });
      await attendre(600);
      await page.evaluate(() => [...document.querySelectorAll('button[aria-pressed]')].find((b) => b.innerText.trim() === 'Calendrier')?.click());
      await attendre(500);
      const etat = await page.evaluate(() => ({
        texte: document.querySelector('main')?.innerText || '',
        mois: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        boutons: [...document.querySelectorAll('main button')].map((b) => b.innerText.trim()),
      }));
      verifier(/Calendrier Administratif/.test(etat.texte), 'le calendrier administratif est ouvert');
      verifier(etat.texte.toLowerCase().includes(etat.mois.toLowerCase()), `il s’ouvre sur le mois en cours (« ${etat.mois} »)`);
      verifier(!etat.boutons.some((b) => /Ajouter un rappel|Ajouter rappel|avant$/.test(b)), `ni « Ajouter un rappel » ni report (« 1 jour avant »…) (${JSON.stringify(etat.boutons.filter((b) => /rappel|avant/i.test(b)))})`);
      verifier(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(etat.texte), 'aucun émoji à l’écran');
    },
  },
  {
    // Constat du 26 oct. 2026 : la fenêtre « Fin du pointage » d'Équipe était faite main (ni role="dialog", ni nom sur la
    // croix, ni Échap fiable, champ sans libellé relié). Elle passe sur ui/Modal.
    nom: 'équipe : « Fin du pointage » est une vraie fenêtre (role=dialog, champ nommé, Échap) (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({
        page: 'equipe', largeur: 375,
        avantChargement: () => { try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); localStorage.setItem('mallettico_equipe_timer', JSON.stringify({ running: true, start: Date.now() - 120000, employeId: '', chantierId: '', paused: false, pausedAt: null, totalPauseTime: 0 })); } catch { /* */ } },
      });
      await attendre(1500);
      const ouvert = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Arrêter'); b?.click(); return !!b; });
      verifier(ouvert, 'le pointage en cours propose « Arrêter »');
      await attendre(600);
      const f = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        const champ = d?.querySelector('textarea');
        const nom = champ ? (document.querySelector(`label[for="${champ.id}"]`)?.innerText || '') : '';
        return { dialogue: !!d, titre: d?.querySelector('h2')?.innerText || '', nom, fermer: !!d?.querySelector('button[aria-label="Fermer"]'), boutons: [...(d?.querySelectorAll('button') || [])].map((b) => b.innerText.trim()).filter(Boolean) };
      });
      verifier(f.dialogue && f.titre === 'Fin du pointage', `une fenêtre « Fin du pointage » (${JSON.stringify(f)})`);
      verifier(/Note pour ce pointage/.test(f.nom), `le champ a son libellé relié (« ${f.nom} »)`);
      verifier(f.fermer && f.boutons.includes('Sans note') && f.boutons.includes('Confirmer'), 'la croix a un nom ; « Sans note » et « Confirmer »');
      await page.keyboard.press('Escape');
      await attendre(500);
      verifier(await page.evaluate(() => !document.querySelector('[role="dialog"]')), 'Échap ferme la fenêtre');
    },
  },
  {
    // Constat du 26 oct. 2026 : des émojis dans les lignes de tâches (priorité, actions rapides, sous-tâches) ; ils passent en
    // icônes lucide, et l'action rapide a un nom.
    nom: 'tâches : plus d’émoji dans la liste, les actions rapides sont des icônes nommées (1440 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, attendre, verifier }) {
      const MEMO = { id: 'f0f0f0f0-0000-4000-8000-000000000071', text: 'Poser les prises', status: 'a_faire', is_done: false, priority: 'haute', due_date: new Date().toLocaleDateString('sv-SE'), subtasks: [{ id: 's1', text: 'Câbler', done: true }, { id: 's2', text: 'Tester', done: false }], created_at: '2026-10-01T08:00:00Z' };
      const base = creerBase({ memos: [MEMO] });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'tasks', session: sessionFactice(UID), supabase: (req, u) => base.reponse(req, u) });
      await attendre(2200);
      const etat = await page.evaluate(() => {
        const ligne = [...document.querySelectorAll('main div')].find((d) => d.innerText.includes('Poser les prises') && d.className.includes('group'));
        return {
          ligne: !!ligne,
          texte: ligne?.innerText || '',
          actions: [...(ligne?.querySelectorAll('button[aria-label]') || [])].map((b) => b.getAttribute('aria-label')),
        };
      });
      verifier(etat.ligne, 'la tâche « Poser les prises » est dans la liste');
      verifier(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u.test(etat.texte), `aucun émoji dans la ligne de tâche (« ${etat.texte.replace(/\s+/g, ' ').slice(0, 80)} »)`);
      verifier(['Mettre à aujourd\'hui', 'Priorité haute', 'Supprimer'].every((a) => etat.actions.includes(a)), `les actions rapides ont un nom (${JSON.stringify(etat.actions)})`);
    },
  },
  {
    // Les fenêtres d'une version d'un devis et de leur comparaison (audit/SnapshotViewer, DiffViewer) étaient faites main
    // (fixed inset-0, sans role="dialog" ni nom sur la croix) : elles passent sur ui/Modal, avec les jetons du thème.
    nom: 'devis : une version et la comparaison de deux versions sont de vraies fenêtres (role=dialog, Échap) (1440 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 1440 });
      await attendre(800);
      await page.evaluate(() => {
        const ligne = (prix) => ({ description: 'Dépose cuisine existante', quantite: 1, unite: 'forfait', prixUnitaire: prix });
        const snap = (id, version, prix, objet) => ({ id, entity_type: 'devis', entity_id: 'd1', version, trigger: 'update', label: null, created_at: `2026-02-0${version}T10:00:00Z`, data: { numero: 'DEV-2026-00001', statut: 'accepte', client_nom: 'Dupont', date: '2026-01-05', objet, lignes: [ligne(prix)] } });
        localStorage.setItem('mallettico_demo_snapshots', JSON.stringify([snap('sn1', 1, 800, 'Cuisine'), snap('sn2', 2, 900, 'Cuisine complète')]));
      });
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(1500);
      await page.evaluate(() => document.querySelector('[aria-label="Ouvrir DEV-2026-00001"] button')?.click());
      await attendre(1200);
      const ouvertVersions = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^V2\b/.test(x.innerText.trim())); b?.click(); return !!b; });
      verifier(ouvertVersions, 'la fiche du devis propose ses versions (« V2 (2) »)');
      await attendre(400);
      await page.evaluate(() => [...document.querySelectorAll('div')].find((d) => d.className.includes('cursor-pointer') && /Version 1/.test(d.innerText))?.click());
      await attendre(700);
      const version = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        return { dialogue: !!d, titre: d?.querySelector('h2')?.innerText || '', fermer: !!d?.querySelector('button[aria-label="Fermer"]'), pleins: [...(d?.querySelectorAll('[data-ui="Bouton"]') || [])].filter((b) => /\bbg-accent\b/.test(b.className)).map((b) => b.innerText.trim()) };
      });
      verifier(version.dialogue && /Version 1/.test(version.titre), `la version s’ouvre dans une fenêtre (${JSON.stringify(version)})`);
      verifier(version.fermer, 'la croix a un nom (« Fermer »)');
      // Un devis signé ne se restaure pas (avenant) : la fenêtre n'a alors que « Comparer avec l'actuel », sans bouton plein
      verifier(version.pleins.length === 0, `ni « Restaurer » ni bouton plein sur un devis signé (${JSON.stringify(version.pleins)})`);
      await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find((b) => /Comparer avec l'actuel/.test(b.innerText))?.click());
      await attendre(700);
      const diff = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        return { dialogue: !!d, titre: d?.querySelector('h2')?.innerText || '', texte: d?.innerText || '', nb: document.querySelectorAll('[role="dialog"]').length };
      });
      verifier(diff.dialogue && diff.titre === 'Comparaison' && diff.nb === 1, `la comparaison s’ouvre dans une fenêtre (${JSON.stringify({ t: diff.titre, n: diff.nb })})`);
      await page.keyboard.press('Escape');
      await attendre(500);
      verifier(await page.evaluate(() => !document.querySelector('[role="dialog"]')), 'Échap ferme la comparaison');
    },
  },
];
