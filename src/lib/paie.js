/**
 * Décompte des heures pour l'export paie (9 oct. 2026).
 *
 * Les heures supplémentaires se comptent par semaine civile (lundi → dimanche) : au-delà de 35 h, majorées
 * de 25 % jusqu'à 43 h, de 50 % au-delà (taux par défaut du Code du travail, art. L3121-36 ; une convention
 * collective peut prévoir autre chose : le comptable vérifie). L'ancien export estimait les heures du mois
 * sur une « semaine moyenne » (÷ 4,33) et calculait un montant brut à partir du taux FACTURÉ au client.
 */

const DUREE_LEGALE = 35;
const SEUIL_50 = 43;

/** Lundi (AAAA-MM-JJ) de la semaine d'une date AAAA-MM-JJ, en date locale. */
export function lundiDe(dateIso) {
  const [a, m, j] = String(dateIso).slice(0, 10).split('-').map(Number);
  const d = new Date(a, m - 1, j);
  const decalage = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - decalage);
  const deux = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}

/** Dimanche (AAAA-MM-JJ) de la semaine d'une date : une semaine se rattache au mois où elle finit. */
export function dimancheDe(dateIso) {
  const [a, m, j] = lundiDe(dateIso).split('-').map(Number);
  const d = new Date(a, m - 1, j + 6);
  const deux = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}

const arrondi = (n) => Math.round(n * 100) / 100;

/**
 * @param {{ date: string, heures: number }[]} pointages pointages d'une personne sur la période
 * @returns {{ total: number, normales: number, sup25: number, sup50: number, jours: number, semaines: number }}
 */
export function decompteHeures(pointages = []) {
  const parSemaine = new Map();
  for (const p of pointages) {
    if (!p?.date) continue;
    const cle = lundiDe(p.date);
    parSemaine.set(cle, (parSemaine.get(cle) || 0) + (Number(p.heures) || 0));
  }
  let normales = 0;
  let sup25 = 0;
  let sup50 = 0;
  for (const h of parSemaine.values()) {
    normales += Math.min(h, DUREE_LEGALE);
    sup25 += Math.min(Math.max(h - DUREE_LEGALE, 0), SEUIL_50 - DUREE_LEGALE);
    sup50 += Math.max(h - SEUIL_50, 0);
  }
  return {
    total: arrondi(normales + sup25 + sup50),
    normales: arrondi(normales),
    sup25: arrondi(sup25),
    sup50: arrondi(sup50),
    jours: new Set(pointages.filter((p) => p?.date).map((p) => String(p.date).slice(0, 10))).size,
    semaines: parSemaine.size,
  };
}
