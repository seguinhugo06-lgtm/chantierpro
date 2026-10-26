/**
 * Budget et reste à facturer d'un chantier : UNE définition pour la liste, son sous-titre, la fiche et le bouton
 * « Facturer le solde » (relecture du 26 oct. 2026 : la carte lisait le total du premier devis lié, quel que soit son
 * statut ; le sous-titre, le budget estimé ; la fiche, les devis signés ; « Reste à facturer » se comptait en HT
 * sur le budget alors que « Facturer le solde » se décidait en TTC sur les devis — la tuile pouvait annoncer un
 * reste quand le bouton n'existait pas).
 *
 * - Budget HT : le revenu du chantier selon le bilan (src/lib/business/margin-calculator.js) — les devis signés
 *   (jamais leurs factures), plus les ajustements de revenu ; à défaut de devis signé, le budget estimé saisi.
 * - Reste à facturer : ce que les devis SIGNÉS du chantier n'ont pas encore facturé (factures émises, avoirs déduits),
 *   comme `resteAFacturer` de ventes.js dont il additionne les devis.
 */
import { resteAFacturer as resteAFacturerDevis, estFacture } from './ventes';
import { facturesDuDevis, avoirsDe, estAnnule } from './gardeFacturation';

const arrondi = (n) => Math.round((Number(n) || 0) * 100) / 100;
const CENTIME = 0.005;

/**
 * Budget HT d'un chantier.
 * @param {object} chantier  budget_estime / budgetPrevu (repli)
 * @param {object} [bilan]   résultat de getChantierBilan : revenuTotal
 * @returns {number} euros HT, 0 si rien n'est défini
 */
export function budgetChantier(chantier, bilan) {
  if (!chantier) return 0;
  const revenu = Number(bilan?.revenuTotal) || 0;
  if (revenu > 0) return arrondi(revenu);
  return arrondi(Number(chantier.budget_estime ?? chantier.budgetPrevu) || 0);
}

// HT déjà facturé sur un devis, avoirs déduits (même périmètre que dejaFactureTTC de gardeFacturation.js)
function dejaFactureHT(devisId, documents) {
  return facturesDuDevis(devisId, documents).reduce((somme, f) => {
    const credite = avoirsDe(f, documents).reduce((s, a) => s + Math.abs(Number(a.total_ht) || 0), 0);
    return somme + (Number(f.total_ht) || 0) - credite;
  }, 0);
}

/**
 * Ce qui reste à facturer sur les devis signés d'un chantier.
 * @param {object} chantier
 * @param {object[]} documents  TOUS les devis et factures (une facture se rattache à son devis par devis_source_id)
 * @returns {{ ht: number, ttc: number, devis: object|null }}
 *   `devis` : le premier devis signé qui n'est pas soldé, celui que « Facturer le solde » ouvre ; null si tout est facturé
 */
export function resteAFacturerChantier(chantier, documents = []) {
  const vide = { ht: 0, ttc: 0, devis: null };
  if (!chantier?.id) return vide;
  let ht = 0;
  let ttc = 0;
  let devis = null;
  for (const d of documents) {
    if (d.chantier_id !== chantier.id || estFacture(d) || estAnnule(d)) continue;
    const resteTTC = resteAFacturerDevis(d, documents);
    if (resteTTC <= CENTIME) continue;
    ttc += resteTTC;
    ht += Math.max(0, (Number(d.total_ht) || 0) - dejaFactureHT(d.id, documents));
    if (!devis) devis = d;
  }
  return { ht: arrondi(ht), ttc: arrondi(ttc), devis };
}
