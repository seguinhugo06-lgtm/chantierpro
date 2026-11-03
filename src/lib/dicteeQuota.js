/**
 * dicteeQuota — Compteur mensuel de dictées vocales.
 *
 * Pourquoi un quota : chaque dictée appelle Claude et coûte réellement de
 * l'argent (estimé à moins d'un millième d'euro avec Haiku 5.5 ; le vrai coût se lit dans usage_ia). L'offre gratuite doit laisser découvrir la fonction —
 * c'est elle qui fait la différence avec les autres logiciels — sans devenir
 * un poste de dépense à fonds perdu.
 *
 * En réel, le quota est tenu par le serveur, par entreprise et par mois (fonction voice-intent, table usage_ia,
 * migration 107) : c'est lui qui refuse au-delà de PLANS[plan].limits.dictees. Ce compteur dans le navigateur ne
 * sert plus qu'au mode démo, qui analyse la dictée sur place sans appeler Claude.
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
