/**
 * Lignes et totaux d'un avoir (facture rectificative), tirés de la facture d'origine.
 *
 * Recette du 9 oct. 2026 :
 * - un avoir TOTAL sur une facture de solde (ligne « Acompte déjà facturé » négative) ou remisée
 *   (lignes « Remise » négatives) passait toutes les lignes en négatif avec Math.abs : la déduction et la
 *   remise étaient créditées une seconde fois, et la TVA imprimée ne retombait pas sur le TTC ;
 * - un avoir PARTIEL créditait la ligne à son prix AVANT remise, avec des totaux non arrondis.
 * Ici : l'avoir total est l'inverse exact de la facture ; l'avoir partiel crédite les lignes choisies à leur
 * prix facturé, avec la remise de la facture en ligne visible, et ses totaux sont arrondis par taux.
 * Les totaux sont calculés sur des montants positifs puis inversés : arrondir un montant négatif ne
 * tombe pas toujours sur l'inverse de l'arrondi du montant positif.
 */
import { arrondi, totalLigne, calculerTotaux } from './totauxDocument';
import { filterValidLignes } from './formatters';
import { pourcent } from './formatDocument';

const tauxDe = (l, defaut) => Number(l?.tva !== undefined && l.tva !== null && l.tva !== '' ? l.tva : defaut);

function lignesDe(doc) {
  let l = doc?.lignes;
  if (typeof l === 'string') { try { l = JSON.parse(l); } catch { l = []; } }
  if ((!Array.isArray(l) || !l.length) && Array.isArray(doc?.sections)) l = doc.sections.flatMap((s) => s.lignes || []);
  return filterValidLignes(Array.isArray(l) ? l : []);
}

const estRemise = (l) => totalLigne(l) < 0 && /^remise/i.test(String(l?.description || l?.designation || '').trim());
const inverser = (tvaParTaux = {}) => Object.fromEntries(Object.entries(tvaParTaux || {}).map(([t, v]) => [t, { base: -(Number(v?.base) || 0), montant: -(Number(v?.montant) || 0) }]));

/** Lignes que l'on peut créditer une à une : celles facturées en positif (ni remise, ni déduction). */
export function lignesCreditables(facture) {
  return lignesDe(facture).filter((l) => totalLigne(l) > 0);
}

/**
 * Part payée d'une ligne, par taux de TVA : 1 sans remise, 0,93 avec une remise de 7 %.
 * Remises en lignes (« Remise 7 % ») ou remise globale du document (anciennes factures).
 */
export function facteursRemise(facture, { tauxDefaut = 20 } = {}) {
  const defaut = facture?.tvaRate ?? tauxDefaut;
  const positifs = {};
  const remises = {};
  for (const l of lignesDe(facture)) {
    const t = tauxDe(l, defaut);
    const m = totalLigne(l);
    if (m > 0) positifs[t] = (positifs[t] || 0) + m;
    else if (estRemise(l)) remises[t] = (remises[t] || 0) + m;
  }
  const remiseDoc = Number(facture?.remise ?? facture?.remise_globale ?? 0) || 0;
  return Object.fromEntries(Object.keys(positifs).map((t) => [t, ((positifs[t] + (remises[t] || 0)) / positifs[t]) * (1 - remiseDoc / 100)]));
}

/** Avoir total : l'inverse exact de la facture (mêmes lignes, signes inversés, mêmes totaux). */
export function avoirTotal(facture, { tauxDefaut = 20 } = {}) {
  const defaut = facture?.tvaRate ?? tauxDefaut;
  const lignes = lignesDe(facture).map((l) => {
    const pu = Number(l.prixUnitaire ?? l.prix_unitaire ?? 0) || 0;
    return { ...l, tva: tauxDe(l, defaut), prixUnitaire: -pu, montant: -totalLigne(l) };
  });
  const recalcul = calculerTotaux(lignesDe(facture), { tauxDefaut: defaut, remisePct: Number(facture?.remise ?? 0) || 0 });
  const tvaFacture = facture?.tvaParTaux || facture?.tvaDetails;
  const aDesTotaux = facture?.total_ttc != null && facture.total_ttc !== '';
  return {
    lignes,
    totalHT: -arrondi(aDesTotaux ? facture.total_ht : recalcul.totalHT),
    totalTVA: -arrondi(aDesTotaux ? (facture.tva ?? facture.total_tva) : recalcul.totalTVA),
    totalTTC: -arrondi(aDesTotaux ? facture.total_ttc : recalcul.totalTTC),
    tvaParTaux: inverser(tvaFacture && Object.keys(tvaFacture).length ? tvaFacture : recalcul.tvaParTaux),
  };
}

/**
 * Avoir partiel : les lignes choisies, à leur prix facturé, et la remise de la facture en ligne visible.
 * @param {object} facture
 * @param {Array<{ ligne: object, quantite: number }>} selection
 */
export function avoirPartiel(facture, selection = [], { tauxDefaut = 20 } = {}) {
  const defaut = facture?.tvaRate ?? tauxDefaut;
  const facteurs = facteursRemise(facture, { tauxDefaut });
  const credits = [];
  const basesParTaux = {};
  for (const { ligne, quantite } of selection) {
    if (!ligne || totalLigne(ligne) <= 0) continue;
    const qteFacture = Number(ligne.quantite ?? ligne.qte ?? 1) || 1;
    const q = Math.min(Math.max(Number(quantite) || 0, 0), qteFacture);
    if (!q) continue;
    const t = tauxDe(ligne, defaut);
    const montant = arrondi(totalLigne(ligne) * (q / qteFacture));
    credits.push({ ...ligne, tva: t, quantite: q, montant });
    basesParTaux[t] = (basesParTaux[t] || 0) + montant;
  }
  for (const [t, base] of Object.entries(basesParTaux)) {
    const f = facteurs[t] ?? 1;
    const remise = arrondi(base * (1 - f));
    if (remise > 0) {
      const pct = arrondi((1 - f) * 100);
      credits.push({ description: `Remise ${pourcent(pct)} accordée sur la facture`, quantite: 1, unite: 'forfait', prixUnitaire: -remise, montant: -remise, tva: Number(t) });
    }
  }
  const tot = calculerTotaux(credits, { tauxDefaut: defaut });
  return {
    lignes: credits.map((c) => ({ ...c, prixUnitaire: -(Number(c.prixUnitaire ?? c.prix_unitaire ?? 0) || 0), montant: -c.montant })),
    totalHT: -tot.totalHT,
    totalTVA: -tot.totalTVA,
    totalTTC: -tot.totalTTC,
    tvaParTaux: inverser(tot.tvaParTaux),
  };
}
