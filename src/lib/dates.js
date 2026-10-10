/**
 * Le jour « AAAA-MM-JJ » à l'heure de l'appareil. `new Date().toISOString().slice(0, 10)` donne le jour
 * en UTC : entre minuit et 2 h à Paris c'est la veille, et outre-mer (UTC−4) c'est le lendemain dès 20 h
 * (recette du 9 oct. 2026 : factures datées de la veille, échéances affichées un jour trop tôt).
 */
export function jourLocal(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default jourLocal;
