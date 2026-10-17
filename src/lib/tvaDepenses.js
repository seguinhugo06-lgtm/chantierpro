/**
 * TVA d'une dépense (achat) — relectures juriste-btp du 17 oct. 2026 (tâche tva-depenses).
 *
 * Seule la TVA portée sur la facture du fournisseur se déduit (CGI art. 271) : une dépense dont la TVA n'est pas
 * connue n'en déduit aucune, et elle n'est pas pour autant « à 0 % » (0 % est un vrai taux, l'exonération) — elle est
 * « TVA non saisie ». En franchise (micro-entreprise, art. 293 B du CGI), rien ne se déduit.
 *
 * Le montant d'une dépense est HORS TAXES : c'est ce que demandent la saisie du chantier (« € HT ») et le catalogue
 * (prix d'achat HT), et ce que compte la marge du chantier (src/lib/business/margin-calculator.js). Avant, le tableau
 * de TVA le traitait comme un TTC, et la fenêtre d'ajout de matériau l'étiquetait « TTC ».
 */
import { arrondi } from './totauxDocument';

const nombre = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Taux de TVA saisi pour la dépense (0 % compris), sinon null (« non saisi »). */
export function tauxSaisiDepense(depense) {
  for (const v of [depense?.tauxTva, depense?.tvaRate, depense?.tva_rate, depense?.taux_tva]) {
    const n = nombre(v);
    if (n !== null) return n;
  }
  return null;
}

/**
 * Montants d'une dépense : { ht, tva, ttc, taux, connue }. La TVA saisie prime, puis le taux saisi ; sans l'une ni
 * l'autre, la TVA est inconnue (`connue: false`, tva et ttc null) et ne se déduit pas.
 * @param {{ franchise?: boolean }} options franchise : aucune TVA déductible
 */
export function montantsDepense(depense, { franchise = false } = {}) {
  const ht = nombre(depense?.montantHt ?? depense?.montant_ht) ?? (nombre(depense?.montant) ?? 0);
  if (franchise) return { ht, tva: 0, ttc: ht, taux: null, connue: true };
  const taux = tauxSaisiDepense(depense);
  // Une facture à 0 % ne porte pas de TVA : un montant saisi avec ce taux ne se déduit pas
  if (taux === 0) return { ht, tva: 0, ttc: ht, taux: 0, connue: true };
  const tvaSaisie = nombre(depense?.montantTva ?? depense?.montant_tva);
  if (tvaSaisie !== null) {
    // TVA saisie sans taux : le taux qu'elle représente, au dixième (pour la ranger dans la ventilation par taux)
    const tauxVu = taux ?? (ht ? Math.round((tvaSaisie / ht) * 1000) / 10 : 0);
    return { ht, tva: tvaSaisie, ttc: arrondi(ht + tvaSaisie), taux: tauxVu, connue: true };
  }
  if (taux !== null) {
    const tva = arrondi(ht * taux / 100);
    return { ht, tva, ttc: arrondi(ht + tva), taux, connue: true };
  }
  return { ht, tva: null, ttc: null, taux: null, connue: false };
}

/**
 * Ce que la dépense a fait sortir de la trésorerie : le TTC quand la TVA est connue, sinon le seul montant connu (le
 * HT, ce qui sous-estime la sortie de la TVA non saisie). En franchise, le montant saisi est ce qui a été payé.
 */
export function decaisseDepense(depense, options = {}) {
  const m = montantsDepense(depense, options);
  return m.connue ? m.ttc : m.ht;
}

/** Nombre de dépenses dont la TVA n'est pas connue (à signaler : « TVA non comptée »). */
export function depensesSansTva(depenses, options = {}) {
  return (Array.isArray(depenses) ? depenses : []).filter((d) => !montantsDepense(d, options).connue).length;
}

const jour = (v) => String(v || '').slice(0, 10);

/** Dépenses datées dans la période (« AAAA-MM-JJ », bornes incluses, facultatives). */
export function depensesDeLaPeriode(depenses = [], { du, au } = {}) {
  return (Array.isArray(depenses) ? depenses : []).filter((d) => {
    const j = jour(d?.date || d?.createdAt || d?.created_at);
    return (!du || j >= du) && (!au || j <= au);
  });
}

/**
 * TVA déductible des dépenses de la période, par taux. Les dépenses sans TVA connue ne comptent pas et sont
 * dénombrées (`sansTva`) pour le dire à l'artisan.
 * @returns {{ total: number, parTaux: Array<{ taux: number, base: number, montant: number }>, sansTva: number, nb: number }}
 */
export function tvaDeductible(depenses = [], { du, au, franchise = false } = {}) {
  const retenues = depensesDeLaPeriode(depenses, { du, au });
  if (franchise) return { total: 0, parTaux: [], sansTva: 0, nb: retenues.length };
  const parTaux = new Map();
  let sansTva = 0;
  for (const d of retenues) {
    const m = montantsDepense(d);
    if (!m.connue) { sansTva += 1; continue; }
    const taux = m.taux;
    const cur = parTaux.get(taux) || { taux, base: 0, montant: 0 };
    cur.base += m.ht;
    cur.montant += m.tva;
    parTaux.set(taux, cur);
  }
  const lignes = [...parTaux.values()].map((x) => ({ taux: x.taux, base: arrondi(x.base), montant: arrondi(x.montant) }))
    .sort((a, b) => a.taux - b.taux);
  return { total: arrondi(lignes.reduce((s, x) => s + x.montant, 0)), parTaux: lignes, sansTva, nb: retenues.length };
}

/** Taux proposés à la saisie d'une dépense : la TVA portée sur la facture du fournisseur. */
export const TAUX_DEPENSE = [
  { valeur: '', libelle: 'TVA à préciser' },
  { valeur: '20', libelle: 'TVA 20 %' },
  { valeur: '10', libelle: 'TVA 10 %' },
  { valeur: '5.5', libelle: 'TVA 5,5 %' },
  { valeur: '0', libelle: 'Sans TVA (0 %)' },
];
