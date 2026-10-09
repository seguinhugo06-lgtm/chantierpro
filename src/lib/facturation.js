/**
 * Lignes des factures d'acompte et de solde tirées d'un devis — relecture juridique du 9 oct. 2026
 * (art. 242 nonies A, ann. II CGI ; L441-9 I C. com. : « toute réduction de prix » figure sur la facture).
 * Avant :
 *   - l'acompte d'un devis à 10 % + 20 % était une seule ligne à un seul taux, alors que sa TVA était
 *     ventilée sur les deux ;
 *   - la facture de solde (ou totale) d'un devis remisé recopiait les lignes à plein tarif et
 *     affichait le total HT remisé, sans aucune ligne de remise ;
 *   - la déduction des acomptes était une ligne à un seul taux.
 * Ici : une ligne par taux, la remise en lignes visibles (une par taux), les déductions par taux ;
 * les totaux à enregistrer viennent de calculerTotaux(lignes) : l'imprimé et le stocké concordent.
 */
import { arrondi, totalLigne } from './totauxDocument';
import { pourcent } from './formatDocument';
import { filterValidLignes } from './formatters';

const idLigne = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `l_${Math.random().toString(36).slice(2)}`);
const tauxDe = (l, defaut) => Number(l?.tva !== undefined && l.tva !== null && l.tva !== '' ? l.tva : defaut);
const forfait = (description, montant, tva) => ({ id: idLigne(), description, quantite: 1, unite: 'forfait', prixUnitaire: montant, montant, tva });

function lignesDe(doc) {
  let l = doc?.lignes || [];
  if (typeof l === 'string') { try { l = JSON.parse(l); } catch { l = []; } }
  return filterValidLignes(l);
}

/** Bases HT d'un devis par taux, avant et après remise (arrondies au centime). */
export function basesParTaux(devis, { tauxDefaut = 20 } = {}) {
  const remisePct = Number(devis?.remise ?? devis?.remise_globale ?? 0) || 0;
  const avant = {};
  for (const l of lignesDe(devis)) {
    const t = tauxDe(l, devis?.tvaRate ?? tauxDefaut);
    avant[t] = arrondi((avant[t] || 0) + totalLigne(l));
  }
  const apres = Object.fromEntries(Object.entries(avant).map(([t, b]) => [t, arrondi(b * (1 - remisePct / 100))]));
  return { avant, apres, remisePct };
}

/**
 * Lignes d'une facture d'acompte : « Acompte 30 % sur devis DEV-… », une par taux de TVA du devis
 * (sur les bases après remise).
 */
export function lignesFactureAcompte(devis, pourcentage, { tauxDefaut = 20, libelle } = {}) {
  const pct = Number(pourcentage) || 0;
  const { apres } = basesParTaux(devis, { tauxDefaut });
  const taux = Object.keys(apres).filter((t) => apres[t] !== 0).sort((a, b) => a - b);
  const titre = `Acompte ${pourcent(pct)} sur devis ${devis?.numero || ''}`.trim() + (libelle ? ` — ${libelle}` : '');
  if (!taux.length) {
    return [forfait(titre, arrondi((Number(devis?.total_ht) || 0) * pct / 100), Number(devis?.tvaRate ?? tauxDefaut))];
  }
  return taux.map((t) => forfait(
    taux.length > 1 ? `${titre} (travaux à ${pourcent(t)})` : titre,
    arrondi(apres[t] * pct / 100),
    Number(t),
  ));
}

/**
 * Lignes d'une facture de solde (ou totale) : les lignes du devis, la remise en lignes visibles,
 * puis la déduction de chaque acompte déjà facturé, par taux.
 * @param {object} devis
 * @param {Array<{ libelle: string, lignes?: Array, tvaParTaux?: object, pourcentage?: number, montant_ht?: number }>} deductions
 */
export function lignesFactureSolde(devis, deductions = [], { tauxDefaut = 20 } = {}) {
  const defaut = devis?.tvaRate ?? tauxDefaut;
  const lignes = lignesDe(devis).map((l) => ({ ...l, tva: tauxDe(l, defaut) }));
  const { avant, apres, remisePct } = basesParTaux(devis, { tauxDefaut });
  const taux = Object.keys(avant).filter((t) => avant[t] !== 0).sort((a, b) => a - b);

  if (remisePct) {
    for (const t of taux) {
      const montant = arrondi(apres[t] - avant[t]);
      if (montant !== 0) lignes.push(forfait(`Remise ${pourcent(remisePct)}${taux.length > 1 ? ` (travaux à ${pourcent(t)})` : ''}`, montant, Number(t)));
    }
  }

  for (const d of deductions) {
    // Par taux : d'après les lignes de la facture d'acompte, sinon sa TVA ventilée, sinon son pourcentage
    const parTaux = {};
    const lignesAcompte = (Array.isArray(d.lignes) ? d.lignes : []).filter((l) => totalLigne(l) > 0);
    const ventilation = d.tvaParTaux && typeof d.tvaParTaux === 'object' ? Object.entries(d.tvaParTaux) : [];
    if (ventilation.length > 1 || (!lignesAcompte.length && ventilation.length)) {
      for (const [t, v] of ventilation) parTaux[t] = arrondi((parTaux[t] || 0) + (Number(v?.base) || 0));
    } else if (lignesAcompte.length) {
      for (const l of lignesAcompte) { const t = tauxDe(l, defaut); parTaux[t] = arrondi((parTaux[t] || 0) + totalLigne(l)); }
    } else if (Number(d.pourcentage)) {
      for (const t of taux) parTaux[t] = arrondi(apres[t] * Number(d.pourcentage) / 100);
    } else {
      parTaux[defaut] = arrondi(Number(d.montant_ht) || 0);
    }
    const tauxD = Object.keys(parTaux).filter((t) => parTaux[t] !== 0).sort((a, b) => a - b);
    for (const t of tauxD) {
      lignes.push(forfait(`${d.libelle}${tauxD.length > 1 ? ` (travaux à ${pourcent(t)})` : ''}`, -parTaux[t], Number(t)));
    }
  }
  return lignes;
}
