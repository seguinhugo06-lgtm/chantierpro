// Fiche chantier : deux pannes silencieuses corrigées le 9 oct. 2026.
//  - « Pointer » rangeait les heures dans une clé que personne ne lisait (et annonçait « Xh pointées ») ;
//  - la première photo, prise depuis l'état vide, partait dans une catégorie que la galerie n'affiche pas.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { creerBase, UID } = require('../lib/fauxSupabase.cjs');

async function ouvrirFiche(page, attendre) {
  await page.evaluate(() => {
    const b = document.querySelector('button[aria-label^="Ouvrir le chantier Rénovation cuisine"]');
    if (!b) throw new Error('chantier « Rénovation cuisine » introuvable');
    b.click();
  });
  await attendre(1000);
}

module.exports = [
  {
    nom: 'fiche chantier → « Pointer des heures » ouvre le vrai formulaire (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'chantiers', largeur: 375 });
      await ouvrirFiche(page, attendre);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Pointer des heures')?.click());
      await attendre(600);
      const formulaire = await page.evaluate(() => {
        const h = [...document.querySelectorAll('h3')].find((x) => x.innerText.trim() === 'Pointer des heures');
        return h ? { select: !!h.parentElement.querySelector('select'), heures: !!h.parentElement.querySelector('input[type="number"]') } : null;
      });
      verifier(formulaire !== null, 'le formulaire « Pointer des heures » est ouvert');
      verifier(formulaire?.select && formulaire?.heures, 'on y choisit la personne et le nombre d’heures');
    },
  },
  {
    nom: 'fiche chantier → la première photo prise depuis l’état vide apparaît (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'chantiers', largeur: 375 });
      await ouvrirFiche(page, attendre);
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
      await cliquer(page, 'Dépense');
      const fenetre = await page.evaluate(() => ({
        etiquette: document.querySelector('label[for="depense-montant"]')?.innerText || '',
        taux: [...(document.querySelector('#depense-tva')?.options || [])].map((o) => o.value),
      }));
      verifier(fenetre.etiquette.includes('HT'), `le montant demandé est HT (« ${fenetre.etiquette} »)`);
      verifier(JSON.stringify(fenetre.taux) === JSON.stringify(['', '20', '10', '5.5', '0']), `taux proposés : à préciser, 20, 10, 5,5, 0 (${fenetre.taux.join(', ')})`);
      await saisir(page, 'input[placeholder="Ex: Sac de ciment 35kg"]', 'Câble R2V 3G2,5');
      await saisir(page, '#depense-montant', '100');
      await page.select('#depense-tva', '10');
      await cliquer(page, '✓ Acheté');
      await attendre(1500);
      const dep = (base.tables.depenses || []).find((d) => d.description === 'Câble R2V 3G2,5');
      verifier(!!dep, 'la dépense est en base');
      verifier(Number(dep?.montant) === 100 && Number(dep?.montant_ht) === 100, `montant HT 100 (${dep?.montant} / ${dep?.montant_ht})`);
      verifier(Number(dep?.taux_tva) === 10 && Number(dep?.montant_tva) === 10, `taux 10 %, TVA 10 € (${dep?.taux_tva} / ${dep?.montant_tva})`);
      // Le taux d'une dépense déjà saisie se corrige dans la fiche (onglet Finances) : la TVA enregistrée suit
      await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].find((t) => t.innerText.trim() === 'Finances')?.click());
      await attendre(800);
      await page.select('select[aria-label="TVA de la facture : Câble R2V 3G2,5"]', '20');
      await attendre(1500);
      const corrigee = (base.tables.depenses || []).find((d) => d.description === 'Câble R2V 3G2,5');
      verifier(Number(corrigee?.taux_tva) === 20 && Number(corrigee?.montant_tva) === 20, `taux corrigé à 20 %, TVA 20 € (${corrigee?.taux_tva} / ${corrigee?.montant_tva})`);
      verifier(base.journal.some((j) => j.m === 'PATCH' && j.table === 'depenses'), 'la correction est envoyée à la base');
    },
  },
];
