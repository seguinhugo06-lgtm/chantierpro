/**
 * Écritures d'achat d'une dépense pour l'export comptable (journal AC, FEC de Finances › Export comptable).
 * Sorties de ExportComptable.jsx pour être testées (relecture juriste-btp du 17 oct. 2026 : équilibre débit/crédit
 * dans les cas TVA connue, TVA non saisie, franchise et avoir du fournisseur).
 */
import { montantsDepense } from './tvaDepenses';

// Le montant d'une dépense est HT (src/lib/tvaDepenses.js). Seule la TVA saisie (taux ou montant, celle de la facture
// du fournisseur) passe en TVA déductible ; sans TVA saisie, l'achat est passé HT, sans 445660, et le libellé le
// signale pour que le comptable complète avec la facture. En franchise, la TVA ne se déduit pas : le montant est la
// charge. Avant (relecture juriste-btp du 17 oct. 2026) : le montant pris pour un TTC à 20 % d'office.
export const ecrituresDepense = (depense, { franchise = false } = {}) => {
  const date = new Date(depense.date);
  const ref = depense.numeroFacture || depense.reference || `D-${date.getFullYear()}-${String(depense.id).slice(0, 4)}`;
  const m = montantsDepense(depense, { franchise });
  const montantHT = m.ht;
  const montantTVA = m.connue ? m.tva : 0;
  const montant = Math.round((montantHT + montantTVA) * 100) / 100;

  const entries = [
    {
      date,
      ref,
      libelle: `${depense.categorie || 'Charge'} - ${depense.description || depense.fournisseur || ''}${m.connue ? '' : ' (TVA non saisie)'}`,
      debit: montantHT,
      credit: 0,
      compte: '606000',
      journal: 'AC',
    },
  ];

  // TVA déductible (négative pour un avoir du fournisseur : elle passe au crédit, plus bas)
  if (montantTVA !== 0) {
    entries.push({
      date,
      ref,
      libelle: `TVA déductible - ${depense.fournisseur || depense.categorie || 'Achat'}`,
      debit: montantTVA,
      credit: 0,
      compte: '445660',
      journal: 'AC',
    });
  }

  entries.push({
    date,
    ref,
    libelle: `${depense.fournisseur || 'Fournisseur'}`,
    debit: 0,
    credit: montant,
    compte: '401000',
    journal: 'AC',
  });

  // Un avoir du fournisseur (montants négatifs) inverse chaque écriture, comme pour les avoirs clients : l'écriture
  // reste équilibrée (avant : la TVA négative était écartée, 606 = −100 face à 401 = −120 — relecture du 17 oct. 2026)
  return entries.map((e) => {
    const debit = (e.debit < 0 ? 0 : e.debit) + (e.credit < 0 ? -e.credit : 0);
    const credit = (e.credit < 0 ? 0 : e.credit) + (e.debit < 0 ? -e.debit : 0);
    return { ...e, debit, credit };
  }).filter((e) => e.debit !== 0 || e.credit !== 0);
};
