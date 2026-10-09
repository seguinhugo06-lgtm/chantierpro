/**
 * Totaux imprimés sur un devis ou une facture — bloc commun aux générateurs (devisHtmlBuilder,
 * pdfHtmlBuilder, générateur intégré de DevisPage) et à l'aperçu de la fiche.
 *
 * Panne relevée par la relecture juridique du 9 oct. 2026 (art. 242 nonies A, I, ann. II CGI :
 * TVA par taux, rabais) : avec une remise, les documents imprimaient la TVA des lignes AVANT remise
 * et appliquaient la remise à un total déjà remisé — 1 000 € HT, remise 10 %, TVA 20 % donnait
 * « Total HT 900 · Remise −90 · TVA 200 · TTC 1 080 » au lieu de « HT 1 000 · Remise −100 ·
 * HT après remise 900 · TVA 180 · TTC 1 080 ». Les totaux enregistrés (total_ht, tva, total_ttc)
 * étaient justes : seul l'imprimé mentait.
 */
import { filterValidLignes } from './formatters';
import { euros, pourcent } from './formatDocument';

/** Arrondi au centime le plus proche (0,005 monte). */
export const arrondi = (n) => Math.round((Number(n) || 0) * 100 + Number.EPSILON * 100) / 100;

/** Total HT d'une ligne, arrondi au centime (montant saisi, sinon quantité × prix unitaire). */
export function totalLigne(l) {
  if (l?.montant != null && Number(l.montant) !== 0) return arrondi(parseFloat(l.montant));
  const qte = parseFloat(l?.quantite ?? l?.qte ?? 0) || 0;
  const pu = parseFloat(l?.prixUnitaire ?? l?.prix_unitaire ?? l?.pu_ht ?? 0) || 0;
  return arrondi(qte * pu);
}

function lignesDe(doc) {
  let lignes = doc?.lignes || [];
  if (typeof lignes === 'string') {
    try { lignes = JSON.parse(lignes); } catch { lignes = []; }
  }
  return filterValidLignes(lignes);
}

/**
 * @param {object} doc devis ou facture (lignes, remise, total_ht, tva, total_ttc, tvaDetails, tvaRate)
 * @param {{ tauxDefaut?: number }} [o]
 * @returns {{
 *   totalLignesHT: number, remisePct: number, remiseMontant: number, totalHT: number,
 *   tva: Array<{ taux: number, base: number, montant: number }>, totalTVA: number, totalTTC: number
 * }}
 */
export function totauxDocument(doc, { tauxDefaut = 10 } = {}) {
  const remisePct = Number(doc?.remise ?? doc?.remise_globale ?? 0) || 0;
  const facteur = 1 - remisePct / 100;
  const defaut = Number(doc?.tvaRate ?? doc?.tva_rate ?? tauxDefaut);

  const basesAvantRemise = {};
  let totalLignesHT = 0;
  for (const l of lignesDe(doc)) {
    const t = totalLigne(l);
    totalLignesHT += t;
    const taux = Number(l.tva !== undefined && l.tva !== null && l.tva !== '' ? l.tva : defaut);
    basesAvantRemise[taux] = (basesAvantRemise[taux] || 0) + t;
  }
  totalLignesHT = arrondi(totalLignesHT);
  const remiseMontant = arrondi(totalLignesHT * remisePct / 100);
  const totalHT = doc?.total_ht != null && doc.total_ht !== '' ? arrondi(doc.total_ht) : arrondi(totalLignesHT - remiseMontant);
  const tvaEnregistree = Number(doc?.tva ?? doc?.total_tva);

  // TVA par taux : celle enregistrée avec le document (facture d'acompte au prorata des taux du
  // devis…) si elle est cohérente avec la TVA totale ; sinon recalculée sur les bases APRÈS remise.
  let tva = null;
  const stockee = doc?.tvaDetails || doc?.tvaParTaux;
  if (stockee && typeof stockee === 'object' && Number.isFinite(tvaEnregistree)) {
    const lignesTva = Object.entries(stockee)
      .map(([taux, d]) => ({ taux: Number(taux), base: arrondi(d?.base), montant: arrondi(d?.montant) }))
      .filter((x) => Number.isFinite(x.taux) && x.base !== 0);
    const somme = lignesTva.reduce((s, x) => s + x.montant, 0);
    if (lignesTva.length && Math.abs(somme - tvaEnregistree) <= 0.02 * lignesTva.length) tva = lignesTva;
  }
  if (!tva) {
    tva = Object.entries(basesAvantRemise)
      .map(([taux, base]) => {
        const b = arrondi(base * facteur);
        return { taux: Number(taux), base: b, montant: arrondi(b * Number(taux) / 100) };
      })
      .filter((x) => x.base !== 0);
  }
  tva.sort((a, b) => a.taux - b.taux);

  const totalTVA = arrondi(tva.reduce((s, x) => s + x.montant, 0));
  const totalTTC = doc?.total_ttc != null && doc.total_ttc !== '' ? arrondi(doc.total_ttc) : arrondi(totalHT + totalTVA);
  return { totalLignesHT, remisePct, remiseMontant, totalHT, tva, totalTVA, totalTTC };
}

/** Acompte et solde d'un TTC : le solde est le TTC moins l'acompte ARRONDI (la somme tombe juste). */
export function acompteEtSolde(totalTTC, pourcentage) {
  const acompte = arrondi((Number(totalTTC) || 0) * (Number(pourcentage) || 0) / 100);
  return { acompte, solde: arrondi((Number(totalTTC) || 0) - acompte) };
}

/**
 * Lignes « Total HT / Remise / TVA par taux / Total TTC » du bloc des totaux, en HTML (classes
 * `row sub` / `row total` des générateurs). Avec une remise : total des lignes, remise, puis total
 * HT après remise ; la TVA porte sur les bases après remise.
 */
export function lignesTotauxHtml(doc, { isMicro = false, tauxDefaut = 10 } = {}) {
  const t = totauxDocument(doc, { tauxDefaut });
  const ligne = (libelle, valeur, style = '') => `<div class="row sub"${style ? ` style="${style}"` : ''}><span>${libelle}</span><span>${valeur}</span></div>`;
  const html = [];
  if (t.remisePct) {
    html.push(ligne('Total HT avant remise', euros(t.totalLignesHT)));
    html.push(ligne(`Remise ${pourcent(t.remisePct)}`, `-${euros(t.remiseMontant)}`, 'color:#dc2626'));
    html.push(ligne('Total HT après remise', euros(t.totalHT)));
  } else {
    html.push(ligne('Total HT', euros(t.totalHT)));
  }
  if (!isMicro) {
    if (t.tva.length) {
      for (const x of t.tva) html.push(ligne(`TVA ${pourcent(x.taux)}${t.tva.length > 1 || t.remisePct ? ` (base : ${euros(x.base)})` : ''}`, euros(x.montant)));
    } else {
      html.push(ligne(`TVA ${pourcent(doc?.tvaRate ?? doc?.tva_rate ?? tauxDefaut)}`, euros(doc?.tva ?? 0)));
    }
  }
  html.push(`<div class="row total"><span>Total TTC</span><span>${euros(t.totalTTC)}</span></div>`);
  return html.join('\n    ');
}

/** Lignes « Acompte X % / Solde à régler » (le solde tombe juste au centime). */
export function lignesAcompteHtml(totalTTC, pourcentage) {
  if (!Number(pourcentage)) return '';
  const { acompte, solde } = acompteEtSolde(totalTTC, pourcentage);
  return `<div class="row sub" style="margin-top:8px;border-top:1px dashed #ccc;padding-top:8px"><span>Acompte ${pourcent(pourcentage)}</span><span>${euros(acompte)}</span></div>
    <div class="row sub"><span>Solde à régler</span><span>${euros(solde)}</span></div>`;
}
