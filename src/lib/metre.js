/**
 * Métré express : la quantité d'une ligne de devis à partir des dimensions.
 *
 * Fonction pure partagée par la fenêtre « Métré » de l'éditeur de devis (`MetreModal`, src/components/DevisComposer.jsx)
 * et par l'exemple « Métré express » du site public (src/components/landing/exemples/ExempleMetre.jsx) : les deux
 * donnent le même métré. Règles de la fenêtre, reprises telles quelles à l'extraction (oct. 2026) :
 *   - longueur × largeur, × hauteur si elle est renseignée (> 0 : volume en m³, sinon surface en m²) ;
 *   - × nombre (vide ou nul : 1) ; × (1 + chutes / 100) ;
 *   - arrondi au centième par Math.round, sans autre correction ;
 *   - un champ vide ou illisible compte pour 0.
 * La fenêtre ne donne jamais « ml » (mètre linéaire) : seulement m² ou m³.
 * Les valeurs sont des nombres ou le texte des champs ; la virgule décimale (« 5,2 ») est lue comme un point : la
 * fenêtre, en champs numériques, n'en reçoit jamais, le site en accepte. Test : src/lib/__tests__/metre.test.js.
 */

/** Nombre saisi (texte d'un champ ou nombre), virgule décimale acceptée ; NaN si illisible. */
function nombreSaisi(valeur) {
  return parseFloat(String(valeur ?? '').replace(',', '.'));
}

/**
 * @param {{ longueur?: number|string, largeur?: number|string, hauteur?: number|string, nombre?: number|string, chutes?: number|string }} dimensions
 * @returns {{ quantite: number, unite: 'm²' | 'm³' }}
 */
export function calculerMetre({ longueur, largeur, hauteur, nombre = 1, chutes = 0 } = {}) {
  const L = nombreSaisi(longueur) || 0;
  const l = nombreSaisi(largeur) || 0;
  const h = nombreSaisi(hauteur) || 0;
  const n = nombreSaisi(nombre) || 1;
  const c = nombreSaisi(chutes) || 0;
  const volume = h > 0;
  const quantite = Math.round(L * l * (volume ? h : 1) * n * (1 + c / 100) * 100) / 100;
  return { quantite, unite: volume ? 'm³' : 'm²' };
}

export default calculerMetre;
