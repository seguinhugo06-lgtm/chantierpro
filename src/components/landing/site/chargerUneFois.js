/**
 * chargerUneFois — une fonction de chargement à la demande (un `import()`) qu'on peut appeler autant de fois qu'on
 * veut : le premier appel lance `fabrique()`, les suivants reçoivent la même promesse (un seul téléchargement pour toute
 * la page). Un échec (déploiement remplacé, réseau coupé) n'est pas gardé : l'appel suivant retente.
 * Test : `__tests__/chargerUneFois.test.js`.
 *
 * @template T
 * @param {() => Promise<T>} fabrique
 * @returns {() => Promise<T>}
 */
export function chargerUneFois(fabrique) {
  let promesse = null;
  return function charger() {
    if (!promesse) {
      promesse = Promise.resolve()
        .then(fabrique)
        .catch((erreur) => {
          promesse = null;
          throw erreur;
        });
    }
    return promesse;
  };
}

export default chargerUneFois;
