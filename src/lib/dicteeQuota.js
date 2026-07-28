/**
 * dicteeQuota — Compteur mensuel de dictées vocales.
 *
 * Pourquoi un quota : chaque dictée appelle Claude et coûte réellement de
 * l'argent (~0,004 €). L'offre gratuite doit laisser découvrir la fonction —
 * c'est elle qui fait la différence avec les autres logiciels — sans devenir
 * un poste de dépense à fonds perdu.
 *
 * Le compteur vit dans le navigateur : il se remet à zéro si l'artisan change
 * d'appareil ou vide son stockage. C'est assumé — il s'agit d'inciter à
 * s'abonner, pas de verrouiller un accès payant. Un décompte inviolable
 * demanderait de le tenir côté serveur, ce que la fonction voice-intent pourra
 * faire le jour où ce sera nécessaire.
 */

const CLE = 'mallettico_dictees';

/** Identifiant du mois courant, ex. « 2026-07 ». */
const moisCourant = () => new Date().toISOString().slice(0, 7);

function lire() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) || '{}');
    return brut.mois === moisCourant() ? brut : { mois: moisCourant(), nombre: 0 };
  } catch {
    return { mois: moisCourant(), nombre: 0 };
  }
}

/** Nombre de dictées analysées ce mois-ci. */
export function dicteesDuMois() {
  return lire().nombre;
}

/** À appeler après une analyse réussie. */
export function compterDictee() {
  const etat = lire();
  etat.nombre += 1;
  try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch { /* stockage plein ou refusé */ }
  return etat.nombre;
}

/**
 * Reste-t-il des dictées ? `limite === -1` signifie illimité.
 * @returns {{ autorise: boolean, restant: number|null }}
 */
export function quotaDictee(limite) {
  if (limite === -1 || limite == null) return { autorise: true, restant: null };
  const utilisees = dicteesDuMois();
  return { autorise: utilisees < limite, restant: Math.max(limite - utilisees, 0) };
}

export default { dicteesDuMois, compterDictee, quotaDictee };
