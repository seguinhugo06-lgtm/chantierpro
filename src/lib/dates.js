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

/**
 * Date à afficher : « AAAA-MM-JJ » est lue comme ce jour-là à minuit en heure locale ; `new Date('2026-10-31')`
 * la lit à minuit UTC, soit le 30 octobre à 20 h outre-mer (UTC−4) — une échéance s'affichait la veille
 * (recette du 9 oct. 2026). Toute autre valeur (horodatage, Date) est lue comme par `new Date`.
 */
export function dateLue(valeur) {
  const m = typeof valeur === 'string' && valeur.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(valeur);
}

export default jourLocal;
