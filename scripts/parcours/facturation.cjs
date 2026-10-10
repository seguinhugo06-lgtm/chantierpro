// Facturation (recette du 9 oct. 2026), en démo avec des documents posés avant le chargement :
// - deux appuis rapides sur « Facturer » ne créent qu'une facture d'acompte ;
// - un devis déjà entièrement facturé ne se refacture pas ;
// - une facture émise ne propose ni « Modifier » ni « Supprimer » ;
// - « Encaisser » enregistre le paiement reçu et met à jour le reste dû ;
// - une facture entièrement créditée par un avoir n'est plus « à encaisser ».
const path = require('path');

const ligne = { id: 'l1', description: 'Remplacement tableau électrique', quantite: 1, prixUnitaire: 1000, tva: 10 };
const DEVIS_SIGNE = {
  id: 'd-parcours-signe', numero: 'DEV-2026-00095', type: 'devis', statut: 'signe', client_id: 'c1', date: '2026-10-01',
  objet: 'Tableau électrique', lignes: [ligne], sections: [{ id: 's1', titre: '', lignes: [ligne] }],
  tvaRate: 10, total_ht: 1000, tva: 100, total_ttc: 1100,
};
const DEVIS_FACTURE = { ...DEVIS_SIGNE, id: 'd-parcours-facture', numero: 'DEV-2026-00096', statut: 'signe' };
const FACTURE_EMISE = {
  id: 'f-parcours-emise', numero: 'FAC-2026-00096', type: 'facture', facture_type: 'totale', statut: 'envoye',
  devis_source_id: 'd-parcours-facture', client_id: 'c1', date: '2026-10-02', date_echeance: '2026-11-01',
  lignes: [ligne], tvaRate: 10, total_ht: 1000, tva: 100, total_ttc: 1100,
};

async function demoAvec(documents) {
  const { DEMO_DEVIS } = await import(path.resolve(__dirname, '../../src/lib/demo-data.js'));
  return `localStorage.setItem('mallettico_demo_data', ${JSON.stringify(JSON.stringify({ devis: [...DEMO_DEVIS, ...documents], paiements: [] }))});`;
}
const ouvrirDocument = (page, numero) => page.evaluate((n) => {
  const b = [...document.querySelectorAll('[data-ui="LigneListe"] > button')].find((x) => x.innerText.includes(n));
  b?.click();
  return !!b;
}, numero);
const documentsEnregistres = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('mallettico_demo_data') || '{}'));
const texte = (page) => page.evaluate(() => document.body.innerText);

module.exports = [
  {
    nom: 'acompte : deux appuis rapides sur « Facturer » ne créent qu’une facture (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 375, avantChargement: await demoAvec([DEVIS_SIGNE]) });
      await attendre(800);
      verifier(await ouvrirDocument(page, 'DEV-2026-00095'), 'le devis signé est dans la liste');
      await attendre(800);
      await cliquer(page, 'Facturer');
      await attendre(600);
      const deuxAppuis = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => /^Facturer\s.*€/.test(x.innerText.trim()));
        if (!b) return false;
        b.click(); b.click();
        return true;
      });
      verifier(deuxAppuis, 'bouton « Facturer … € » de la fenêtre d’acompte');
      await attendre(1500);
      const { devis = [] } = await documentsEnregistres(page);
      const acomptes = devis.filter((d) => d.devis_source_id === 'd-parcours-signe' && d.type === 'facture');
      verifier(acomptes.length === 1, `une seule facture d’acompte (${acomptes.length})`);
    },
  },
  {
    nom: 'devis déjà facturé : pas de seconde facture, facture émise ni modifiable ni supprimable (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 375, avantChargement: await demoAvec([DEVIS_FACTURE, FACTURE_EMISE]) });
      await attendre(800);
      verifier(await ouvrirDocument(page, 'DEV-2026-00096'), 'le devis est dans la liste');
      await attendre(800);
      const boutons = await page.evaluate(() => [...document.querySelectorAll('main button')].filter((b) => b.offsetParent).map((b) => b.innerText.trim()));
      if (boutons.includes('Facturer')) {
        await cliquer(page, 'Facturer');
        await attendre(800);
        const t = await texte(page);
        verifier(/déjà entièrement facturé/.test(t) || !/Facture d'acompte/.test(t), 'refacturer est refusé');
      }
      const { devis = [] } = await documentsEnregistres(page);
      verifier(devis.filter((d) => d.devis_source_id === 'd-parcours-facture' && d.type === 'facture').length <= 1, 'aucune seconde facture');

      await cliquer(page, 'Retour à la liste');
      await attendre(600);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Factures')?.click());
      await attendre(600);
      verifier(await ouvrirDocument(page, 'FAC-2026-00096'), 'la facture émise est dans la liste');
      await attendre(800);
      await cliquer(page, "Plus d'actions");
      await attendre(500);
      const menu = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button, [role="menu"] button')].map((b) => b.innerText.trim()));
      verifier(menu.length > 0, `menu ouvert (${menu.length} actions)`);
      verifier(!menu.includes('Modifier') && !menu.includes('Supprimer'), `ni « Modifier » ni « Supprimer » (${JSON.stringify(menu)})`);
      verifier(menu.includes('Créer un avoir'), '« Créer un avoir » proposé');
    },
  },
  {
    nom: '« Encaisser » enregistre le paiement reçu et met à jour le reste dû (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 375, avantChargement: await demoAvec([DEVIS_FACTURE, FACTURE_EMISE]) });
      await attendre(800);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Factures')?.click());
      await attendre(600);
      verifier(await ouvrirDocument(page, 'FAC-2026-00096'), 'la facture est dans la liste');
      await attendre(800);
      await cliquer(page, 'Encaisser');
      await attendre(600);
      const horsLigne = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => /Paiement reçu/.test(x.innerText));
        b?.click();
        return !!b;
      });
      verifier(horsLigne, 'option « Paiement reçu (hors ligne) »');
      await attendre(500);
      await page.evaluate(() => {
        const champ = [...document.querySelectorAll('input')].find((i) => i.value === '1100.00');
        if (champ) {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(champ, '400');
          champ.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await attendre(300);
      const confirme = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => /^Confirmer le paiement/.test(x.innerText.trim()));
        b?.click();
        return !!b;
      });
      verifier(confirme, 'bouton « Confirmer le paiement »');
      await attendre(1500);
      const { paiements = [], devis = [] } = await documentsEnregistres(page);
      const p = paiements.find((x) => x.facture_id === 'f-parcours-emise' || x.devisId === 'f-parcours-emise');
      verifier(!!p && Number(p.montant || p.amount) === 400, `paiement de 400 € enregistré (${JSON.stringify(p || null)})`);
      const f = devis.find((d) => d.id === 'f-parcours-emise');
      verifier(f && Number(f.montant_paye) === 400, `montant reçu sur la facture : ${f?.montant_paye}`);
      verifier(/reste 700/.test((await texte(page)).replace(/ | /g, ' ')), 'la fiche affiche le reste dû (700 €)');
    },
  },
  {
    nom: 'facture entièrement créditée par un avoir : plus « à encaisser » (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const AVOIR = {
        id: 'a-parcours', numero: 'AV-2026-00096', type: 'facture', facture_type: 'avoir', statut: 'envoye', avoir_source_id: 'f-parcours-emise',
        avoir_type: 'total', devis_source_id: 'd-parcours-facture', client_id: 'c1', date: '2026-10-03',
        lignes: [{ ...ligne, prixUnitaire: -1000, montant: -1000 }], total_ht: -1000, tva: -100, total_ttc: -1100,
      };
      const { page } = await ouvrir({ page: 'devis', largeur: 375, avantChargement: await demoAvec([DEVIS_FACTURE, FACTURE_EMISE, AVOIR]) });
      await attendre(800);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Factures')?.click());
      await attendre(600);
      verifier(await ouvrirDocument(page, 'FAC-2026-00096'), 'la facture est dans la liste');
      await attendre(800);
      const boutons = await page.evaluate(() => [...document.querySelectorAll('main button')].filter((b) => b.offsetParent).map((b) => b.innerText.trim()));
      verifier(!boutons.includes('Encaisser') && !boutons.includes('Relancer'), `ni « Encaisser » ni « Relancer » (${JSON.stringify(boutons.slice(0, 6))})`);
      verifier(/Annulée/.test(await texte(page)), 'la facture est « Annulée »');
    },
  },
];
