// Trésorerie en démo : les réglages (solde de départ, seuil d'alerte) survivent au chargement de la page.
// Avant (constaté le 20 oct. 2026, src/hooks/useTresorerie.js) : relus trop tard, ils étaient remplacés à chaque
// chargement par les réglages par défaut (solde de départ 0 €) ; la démo affichait un solde négatif et deux alertes.

const lireSolde = (page) => page.evaluate(() => {
  const m = /Solde estimé\s*\n\s*([^\n]+)/.exec(document.body.innerText);
  return m ? m[1].trim() : '';
});
// Le signe moins peut être le tiret (« -3 077 € ») ou le vrai signe U+2212 (« −3 077 € », Intl) : les deux comptent
const enEuros = (texte) => Number(texte.replace(/−/g, '-').replace(/[^\d,-]/g, '').replace(',', '.'));

module.exports = [
  {
    nom: 'trésorerie (démo) : le solde de départ réglé est gardé au rechargement et compte dans le solde (390 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'finances', largeur: 390 });
      const regler = async (soldeInitial) => {
        await page.evaluate((s) => localStorage.setItem('cp_tresorerie_settings', JSON.stringify({ seuilAlerte: 5000, soldeInitial: s, soldeDate: '2026-01-01' })), soldeInitial);
        await page.reload({ waitUntil: 'networkidle0' }).catch(() => {});
        await attendre(1500);
        return {
          garde: await page.evaluate(() => JSON.parse(localStorage.getItem('cp_tresorerie_settings') || '{}').soldeInitial),
          solde: await lireSolde(page),
        };
      };
      const a = await regler(20000);
      const b = await regler(21000);
      verifier(a.garde === 20000 && b.garde === 21000, `réglages gardés après le rechargement (${a.garde}, ${b.garde})`);
      verifier(a.solde !== '' && enEuros(b.solde) - enEuros(a.solde) === 1000,
        `1 000 € de plus au départ, 1 000 € de plus au solde du jour (« ${a.solde} » → « ${b.solde} »)`);
    },
  },
];
