// Fiche chantier : deux pannes silencieuses corrigées le 9 oct. 2026.
//  - « Pointer » rangeait les heures dans une clé que personne ne lisait (et annonçait « Xh pointées ») ;
//  - la première photo, prise depuis l'état vide, partait dans une catégorie que la galerie n'affiche pas.
// Passe « ancien code » du 25 oct. 2026 (audit UX du 20 oct.) : la liste d'abord, une action principale par fiche, une seule
// rangée d'onglets, le dépassement du budget dit une fois, un seul message par geste.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { creerBase, UID } = require('../lib/fauxSupabase.cjs');

async function ouvrirFiche(page, attendre, nom = 'Rénovation cuisine') {
  await page.evaluate((n) => {
    const b = document.querySelector(`button[aria-label^="Ouvrir le chantier ${n}"]`);
    if (!b) throw new Error(`chantier « ${n} » introuvable`);
    b.click();
  }, nom);
  await attendre(1000);
}

async function ongletFiche(page, attendre, nom) {
  const ok = await page.evaluate((n) => {
    const t = [...document.querySelectorAll('[role="tablist"] [role="tab"]')].find((x) => (x.innerText || '').trim().startsWith(n));
    t?.click();
    return !!t;
  }, nom);
  if (!ok) throw new Error(`onglet « ${nom} » introuvable`);
  await attendre(500);
}

/** Les notifications qui passent, une par une (une notification en remplace une autre). */
async function ecouterMessages(page) {
  await page.evaluate(() => {
    window.__messages = [];
    const lire = () => {
      const t = [...document.querySelectorAll('[role="status"][aria-live="polite"]')].map((e) => (e.innerText || '').trim()).filter(Boolean).join(' | ');
      if (t && window.__messages[window.__messages.length - 1] !== t) window.__messages.push(t);
    };
    new MutationObserver(lire).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
}

module.exports = [
  {
    nom: 'liste des chantiers : la liste d’abord, des chiffres qui disent ce qu’ils sont (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'chantiers', largeur: 375 });
      const etat = await page.evaluate(() => {
        const premiere = document.querySelector('button[aria-label^="Ouvrir le chantier"]');
        const bandeau = [...document.querySelectorAll('button[aria-expanded]')].find((b) => /aujourd'hui/.test(b.innerText));
        return {
          y: premiere ? premiere.getBoundingClientRect().top : null,
          tuiles: document.querySelectorAll('[data-ui="TuileChiffre"]').length,
          bandeauReplie: bandeau ? bandeau.getAttribute('aria-expanded') === 'false' : null,
          bandeauTexte: bandeau ? bandeau.innerText.replace(/\s+/g, ' ').trim() : '',
          itineraires: [...document.querySelectorAll('button')].filter((b) => /^Itinéraire vers/.test(b.getAttribute('aria-label') || '')).length,
          cartes: [...document.querySelectorAll('button[aria-label^="Ouvrir le chantier"]')].map((b) => b.innerText.replace(/\s+/g, ' ')).join(' || '),
        };
      });
      verifier(etat.y !== null && etat.y < 600, `la première carte de chantier est dans le premier écran (à ${Math.round(etat.y)} px sur 812)`);
      verifier(etat.tuiles === 0, `plus de tuiles qui répètent les puces (${etat.tuiles})`);
      verifier(etat.bandeauReplie === true && /chantiers? aujourd'hui/.test(etat.bandeauTexte) && /Itinéraires/.test(etat.bandeauTexte), `« Aujourd'hui » tient sur une ligne, repliée (« ${etat.bandeauTexte} »)`);
      verifier(etat.itineraires === 0, 'aucun itinéraire tant que la ligne est repliée');
      verifier(/Budget\s+[\d\s]+€\s*HT/.test(etat.cartes) && /Avancement/.test(etat.cartes), 'la carte dit « Budget … € HT » et « Avancement »');
      await page.evaluate(() => [...document.querySelectorAll('button[aria-expanded]')].find((b) => /aujourd'hui/.test(b.innerText))?.click());
      await attendre(400);
      const depliee = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /^Itinéraire vers/.test(b.getAttribute('aria-label') || '')).length);
      verifier(depliee > 0, `dépliée, la ligne propose les itinéraires (${depliee})`);
    },
  },
  {
    nom: 'fiche chantier : une action principale selon l’état, une seule rangée d’onglets, plus de « + » flottant',
    async executer({ ouvrir, attendre, verifier }) {
      const pleins = (page) => page.evaluate(() => [...document.querySelectorAll('main button, #root button')]
        .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && b.className.split(/\s+/).includes('bg-accent') && !b.closest('[role="dialog"]') && !b.closest('nav') && !b.closest('header'); })
        .map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim()));
      // En cours : la dépense ; prospect avec un devis : l'ouvrir (le prospect sans devis : parcours suivant, en base simulée)
      for (const [nom, attendu] of [['Rénovation cuisine', 'Ajouter une dépense'], ['Extension maison', 'Ouvrir le devis']]) {
        const { page } = await ouvrir({ page: 'chantiers', largeur: 375 });
        await ouvrirFiche(page, attendre, nom);
        const liste = await pleins(page);
        verifier(liste.length === 1 && liste[0] === attendu, `${nom} : un seul bouton plein, « ${attendu} » (${JSON.stringify(liste)})`);
        const onglets = await page.evaluate(() => ({
          rangees: document.querySelectorAll('[role="tablist"]').length,
          noms: [...document.querySelectorAll('[role="tablist"] [role="tab"]')].map((t) => t.innerText.replace(/\s+\d+$/, '').trim()),
          flottant: [...document.querySelectorAll('button')].some((b) => (b.getAttribute('aria-label') || '') === 'Actions rapides'),
        }));
        verifier(onglets.rangees === 1, `une seule rangée d’onglets (${onglets.rangees})`);
        verifier(['Aperçu', 'Tâches', 'Photos', 'Documents', 'Finances'].every((n) => onglets.noms.includes(n)), `Aperçu, Tâches, Photos, Documents, Finances (${onglets.noms.join(', ')})`);
        verifier(!onglets.flottant, 'plus de bouton « + » flottant sans libellé');
      }
    },
  },
  {
    nom: 'fiche chantier : un prospect sans devis propose « Créer le devis », qui mène à Devis & factures avec le client du chantier',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000002', nom: 'Durand', prenom: 'Paul', created_at: '2026-10-01T08:00:00Z' };
      const PROSPECT = { id: 'c1c1c1c1-0000-4000-8000-000000000002', nom: 'Terrasse Durand Parcours', client_id: CLIENT.id, statut: 'prospect', avancement: 0, created_at: '2026-10-01T08:00:00Z' };
      const base = creerBase({ clients: [CLIENT], chantiers: [PROSPECT] });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'chantiers', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2000);
      await ouvrirFiche(page, attendre, 'Terrasse Durand');
      const principal = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.className.split(/\s+/).includes('bg-accent') && b.getBoundingClientRect().width > 0 && !b.closest('nav') && !b.closest('header')).map((b) => b.innerText.trim()));
      verifier(principal.length === 1 && principal[0] === 'Créer le devis', `un seul bouton plein, « Créer le devis » (${JSON.stringify(principal)})`);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Créer le devis')?.click());
      await attendre(1500);
      const apres = await page.evaluate(() => ({ page: localStorage.getItem('cp_current_page'), texte: document.body.innerText }));
      verifier(apres.page === 'devis', `« Créer le devis » mène à Devis & factures (${apres.page})`);
      verifier(/Durand/.test(apres.texte), 'le client du chantier est repris');
    },
  },
  {
    nom: 'fiche chantier : le dépassement du budget se dit une seule fois, sur la marge (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'chantiers', largeur: 375 });
      await ouvrirFiche(page, attendre);
      const lire = () => page.evaluate(() => ({
        texte: document.body.innerText,
        rouges: [...document.querySelectorAll('[class*="bg-danger-point"], [class*="bg-red-"]')].filter((e) => e.getBoundingClientRect().width > 0).length,
      }));
      const apercu = await lire();
      verifier((apercu.texte.match(/Budget dépassé/g) || []).length === 1, `« Budget dépassé » une seule fois sur l’aperçu (${(apercu.texte.match(/Budget dépassé/g) || []).length})`);
      verifier(!/Négatif/.test(apercu.texte), 'plus de pastille « Négatif » en plus');
      await ongletFiche(page, attendre, 'Finances');
      const finances = await lire();
      verifier(!/Budget dépassé/.test(finances.texte) && finances.rouges === 0, `rien de rouge ni de « dépassé » dans l’onglet Finances (${finances.rouges} barre rouge)`);
    },
  },
  {
    nom: 'fiche chantier : l’onglet Documents liste les devis et factures du chantier et les ouvre',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'chantiers', largeur: 375 });
      await ouvrirFiche(page, attendre);
      await ongletFiche(page, attendre, 'Documents');
      const lignes = await page.evaluate(() => [...document.querySelectorAll('[data-ui="LigneListe"] > button')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()));
      verifier(lignes.length >= 1 && lignes.some((l) => /Devis|Facture|Solde|Acompte/.test(l)), `les devis et factures du chantier sont là (${JSON.stringify(lignes)})`);
      await page.evaluate(() => document.querySelector('[data-ui="LigneListe"] > button')?.click());
      await attendre(1200);
      const apres = await page.evaluate(() => ({ page: localStorage.getItem('cp_current_page'), texte: document.body.innerText }));
      verifier(apres.page === 'devis' && /DEV-|FAC-/.test(apres.texte), `toucher une ligne ouvre le document dans Devis & factures (${apres.page})`);
    },
  },
  {
    // Avant : « Statut : Terminé » (et « Chantier marqué comme terminé ») s'affichait dès le geste, même quand la base refusait
    // l'écriture ; et « Chantier mis à jour » arrivait ensuite par-dessus le message du geste.
    nom: 'fiche chantier : un statut refusé par la base n’est pas annoncé comme fait ; accepté, un seul message',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const json = (corps, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(corps) });
      const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000003', nom: 'Martin', prenom: 'Jean', created_at: '2026-10-01T08:00:00Z' };
      const CHANTIER = { id: 'c1c1c1c1-0000-4000-8000-000000000003', nom: 'Salle de bain Martin Parcours', client_id: CLIENT.id, statut: 'en_cours', avancement: 10, created_at: '2026-10-01T08:00:00Z' };
      let refus = true;
      const base = creerBase({ clients: [CLIENT], chantiers: [CHANTIER] }, {
        refuser: (m, table) => (refus && m === 'PATCH' && table === 'chantiers' ? json({ code: '42501', message: 'new row violates row-level security policy for table "chantiers"' }, 403) : null),
      });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'chantiers', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2000);
      await ouvrirFiche(page, attendre, 'Salle de bain Martin');
      const choisirTermine = async () => {
        const statut = await page.evaluateHandle(() => [...document.querySelectorAll('label')].find((l) => l.innerText.includes('Statut du chantier'))?.querySelector('select'));
        verifier(await statut.evaluate((el) => !!el), 'le statut se change dans la fiche');
        await statut.asElement().select('termine');
        await attendre(600);
        // « Terminé » ferme le chantier : la fenêtre de confirmation passe avant l'écriture (relecture de la Task 6, tour 1)
        await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.innerText.trim() === 'Confirmer')?.click());
        await attendre(1800);
      };
      await ecouterMessages(page);
      await choisirTermine();
      const refuse = await page.evaluate(() => window.__messages || []);
      verifier(!refuse.some((m) => /Statut : Terminé|marqué comme terminé/.test(m)), `un refus de la base n’est pas annoncé comme fait (${JSON.stringify(refuse)})`);
      refus = false;
      await page.evaluate(() => { window.__messages = []; });
      await choisirTermine();
      const messages = await page.evaluate(() => window.__messages || []);
      verifier(messages.some((m) => /Chantier marqué comme terminé/.test(m)), `accepté, le geste se dit (${JSON.stringify(messages)})`);
      verifier(!messages.some((m) => /Chantier mis à jour/.test(m)), 'sans « Chantier mis à jour » par-dessus');
      verifier(base.tables.chantiers.find((c) => c.id === CHANTIER.id)?.statut === 'termine', 'le statut est en base');
    },
  },
  {
    nom: 'fiche chantier → « Pointer des heures » ouvre le vrai formulaire (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'chantiers', largeur: 375 });
      await ouvrirFiche(page, attendre);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Pointer des heures')?.click());
      await attendre(600);
      const formulaire = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        const h = d && [...d.querySelectorAll('h1, h2, h3')].find((x) => x.innerText.trim() === 'Pointer des heures');
        return h ? { select: !!d.querySelector('select'), heures: !!d.querySelector('input[type="number"]') } : null;
      });
      verifier(formulaire !== null, 'le formulaire « Pointer des heures » est ouvert, en fenêtre');
      verifier(formulaire?.select && formulaire?.heures, 'on y choisit la personne et le nombre d’heures');
    },
  },
  {
    nom: 'fiche chantier → la première photo prise depuis l’état vide apparaît (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'chantiers', largeur: 375 });
      await ouvrirFiche(page, attendre);
      await ongletFiche(page, attendre, 'Photos');
      const fichier = path.join(os.tmpdir(), 'mallettico-photo-essai.png');
      fs.writeFileSync(fichier, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
      const avant = await page.evaluate(() => document.querySelectorAll('img[alt^="Photo "]').length);
      const champ = await page.evaluateHandle(() => {
        const etiquette = [...document.querySelectorAll('label')].find((l) => /Prendre une photo/.test(l.innerText));
        return etiquette ? etiquette.querySelector('input[type="file"]') : null;
      });
      verifier(champ && (await champ.evaluate((e) => !!e)), 'le bouton « Prendre une photo » de l’état vide est là');
      await champ.asElement().uploadFile(fichier);
      await attendre(1200);
      const apres = await page.evaluate(() => document.querySelectorAll('img[alt^="Photo "]').length);
      verifier(apres === avant + 1, `la photo est visible dans la galerie (${avant} → ${apres})`);
    },
  },
  {
    // Relecture juriste-btp du 17 oct. 2026 : la fenêtre disait « Montant total TTC » alors que la marge et le reste de
    // l'app le comptaient en HT, et aucune dépense ne portait de taux (la TVA déductible était supposée à 20 %).
    nom: 'dépense de chantier : montant HT et TVA de la facture du fournisseur partent en base',
    reel: true,
    async executer({ ouvrir, cliquer, saisir, attendre, verifier, sessionFactice }) {
      const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000001', nom: 'Dupont', prenom: 'Marie', created_at: '2026-10-01T08:00:00Z' };
      const CHANTIER = { id: 'c1c1c1c1-0000-4000-8000-000000000001', nom: 'Rénovation cuisine Parcours', client_id: CLIENT.id, statut: 'en_cours', avancement: 10, created_at: '2026-10-01T08:00:00Z' };
      const base = creerBase({ clients: [CLIENT], chantiers: [CHANTIER] });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'chantiers', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2000);
      await ouvrirFiche(page, attendre);
      await cliquer(page, 'Ajouter une dépense');
      const fenetre = await page.evaluate(() => ({
        etiquette: document.querySelector('label[for="depense-montant"]')?.innerText || '',
        taux: [...(document.querySelector('#depense-tva')?.options || [])].map((o) => o.value),
      }));
      verifier(fenetre.etiquette.includes('HT'), `le montant demandé est HT (« ${fenetre.etiquette} »)`);
      verifier(JSON.stringify(fenetre.taux) === JSON.stringify(['', '20', '10', '5.5', '0']), `taux proposés : à préciser, 20, 10, 5,5, 0 (${fenetre.taux.join(', ')})`);
      await saisir(page, 'input[placeholder="Ex: Sac de ciment 35kg"]', 'Câble R2V 3G2,5');
      await saisir(page, '#depense-montant', '100');
      await page.select('#depense-tva', '10');
      await cliquer(page, 'Enregistrer la dépense');
      await attendre(1500);
      const dep = (base.tables.depenses || []).find((d) => d.description === 'Câble R2V 3G2,5');
      verifier(!!dep, 'la dépense est en base');
      verifier(Number(dep?.montant) === 100 && Number(dep?.montant_ht) === 100, `montant HT 100 (${dep?.montant} / ${dep?.montant_ht})`);
      verifier(Number(dep?.taux_tva) === 10 && Number(dep?.montant_tva) === 10, `taux 10 %, TVA 10 € (${dep?.taux_tva} / ${dep?.montant_tva})`);
      // Le taux d'une dépense déjà saisie se corrige dans la fiche (onglet Finances) : la TVA enregistrée suit
      await ongletFiche(page, attendre, 'Finances');
      await page.select('select[aria-label="TVA de la facture : Câble R2V 3G2,5"]', '20');
      await attendre(1500);
      const corrigee = (base.tables.depenses || []).find((d) => d.description === 'Câble R2V 3G2,5');
      verifier(Number(corrigee?.taux_tva) === 20 && Number(corrigee?.montant_tva) === 20, `taux corrigé à 20 %, TVA 20 € (${corrigee?.taux_tva} / ${corrigee?.montant_tva})`);
      verifier(base.journal.some((j) => j.m === 'PATCH' && j.table === 'depenses'), 'la correction est envoyée à la base');

      // Facture à plusieurs lignes : la TVA écrite sur la facture (19,98 €) prime sur HT × taux (20 €)
      await cliquer(page, 'Dépense');
      await saisir(page, 'input[placeholder="Ex: Sac de ciment 35kg"]', 'Disjoncteurs');
      await saisir(page, '#depense-montant', '100');
      await page.select('#depense-tva', '20');
      await saisir(page, '#depense-tva-montant', '19,98');
      await cliquer(page, 'Enregistrer la dépense');
      await attendre(1500);
      const ecrite = (base.tables.depenses || []).find((d) => d.description === 'Disjoncteurs');
      verifier(Number(ecrite?.montant_tva) === 19.98 && Number(ecrite?.taux_tva) === 20, `TVA écrite sur la facture enregistrée (${ecrite?.taux_tva} / ${ecrite?.montant_tva})`);
    },
  },
];
