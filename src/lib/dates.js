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

/**
 * « AAAA-MM-JJ » décalé de `n` mois, le jour ramené au dernier jour du mois s'il n'existe pas : une
 * mensualité du 31 tombe le 30 novembre, puis le 31 décembre. Avant (recette du 9 oct. 2026), `setMonth`
 * débordait : 31/10 → 01/12, novembre sautait et décembre en avait deux.
 */
export function ajouterMois(jour, n) {
  const [a, m, j] = String(jour || '').slice(0, 10).split('-').map(Number);
  if (!a || !m || !j) return '';
  const cible = new Date(a, m - 1 + n, 1);
  const dernier = new Date(cible.getFullYear(), cible.getMonth() + 1, 0).getDate();
  return jourLocal(new Date(cible.getFullYear(), cible.getMonth(), Math.min(j, dernier)));
}

export default jourLocal;
