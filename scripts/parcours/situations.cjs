// [solde-situations] Un devis déjà facturé par situations de travaux ne propose plus de facture
// « complète » (qui refacturerait le devis entier, situations comprises) : la suite passe par les situations.
const path = require('path');

/** Les devis de démonstration + une facture de situation sur DEV-2026-00007 (id d12), posés avant le chargement. */
async function demoAvecSituation() {
  const { DEMO_DEVIS } = await import(path.resolve(__dirname, '../../src/lib/demo-data.js'));
  const devis = [...DEMO_DEVIS, {
    id: 'fac-situation-essai', numero: 'FAC-2026-00090', type: 'facture', facture_type: 'situation', situation_numero: 1,
    devis_source_id: 'd12', client_id: 'c10', chantier_id: 'ch10', statut: 'facture', date: '2026-03-01',
    lignes: [{ description: 'Situation n°1', quantite: 1, prixUnitaire: 5000, tva: 10 }], total_ht: 5000, tva: 500, total_ttc: 5500,
  }];
  // Les autres collections retombent sur les données de démonstration de l'app.
  return `localStorage.setItem('mallettico_demo_data', ${JSON.stringify(JSON.stringify({ devis }))});`;
}

module.exports = [
  {
    nom: 'devis facturé par situations : pas de facture complète, « Situation suivante » (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 375, avantChargement: await demoAvecSituation() });
      await attendre(800);
      const ouvert = await page.evaluate(() => {
        const b = [...document.querySelectorAll('[data-ui="LigneListe"] > button')].find((x) => /DEV-2026-00007/.test(x.innerText));
        b?.click();
        return !!b;
      });
      verifier(ouvert, 'le devis DEV-2026-00007 est dans la liste');
      await attendre(1000);
      const boutons = await page.evaluate(() => [...document.querySelectorAll('main button')].filter((b) => b.offsetParent).map((b) => b.innerText.trim()));
      verifier(boutons.includes('Situation suivante'), `« Situation suivante » proposé (${JSON.stringify(boutons.slice(0, 8))})`);
      verifier(!boutons.includes('Facturer') && !boutons.some((t) => /^100 %|^Solde/.test(t)), 'ni « Facturer », ni facture complète, ni solde');
      const carte = await page.evaluate(() => document.querySelector('main')?.innerText.includes('Facturé par situations de travaux'));
      verifier(carte, 'la carte dit que le devis est facturé par situations');
    },
  },
];
