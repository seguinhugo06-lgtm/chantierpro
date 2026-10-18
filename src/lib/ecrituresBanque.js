/**
 * Écritures de banque d'un encaissement (journal BQ, export comptable de Finances › Export comptable).
 * Une correction d'encaissement (migration 098 : paiement négatif motivé) passe en sens inverse — le client redevient
 * débiteur (411 au débit), la banque est créditée (512) — avec sa propre référence et son motif : le comptable voit
 * l'opération de « moins » à côté de l'encaissement d'origine (BOI-TVA-DECLA-30-10-30 § 90 ; relecture juriste-btp du
 * 18 oct. 2026 : l'export écartait les corrections, l'encaissement faux restait seul).
 */
import { motifCorrection, dateLocale } from './paiementsFacture';

const jourIso = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

export function ecrituresPaiement(paiement, facture, client) {
  // « AAAA-MM-JJ » lu comme une date locale (new Date('2026-10-18') est minuit UTC : la veille aux Antilles)
  const date = dateLocale(paiement.date || paiement.createdAt);
  const montant = Math.round((Number(paiement.amount ?? paiement.montant) || 0) * 100) / 100;
  if (!montant) return [];
  const clientName = client?.nom || client?.entreprise || 'Client';
  const factureNum = facture?.numero || '';
  const fact = factureNum ? `fact. ${factureNum}` : '';

  if (montant < 0) {
    const a = -montant;
    // Référence propre à la correction (la colonne reference porte l'identifiant interne du paiement corrigé)
    const ref = `COR-${Number.isNaN(date.getTime()) ? '' : jourIso(date)}-${String(paiement.id || '').slice(0, 8)}`;
    const motif = motifCorrection(paiement);
    return [
      { date, ref, libelle: `Correction encaissement ${fact}${motif ? ` - ${motif}` : ''}`.replace(/\s+/g, ' ').trim(), debit: a, credit: 0, compte: '411000', journal: 'BQ' },
      { date, ref, libelle: `Correction règlement client ${clientName}`, debit: 0, credit: a, compte: '512000', journal: 'BQ' },
    ];
  }

  const ref = paiement.reference || `P-${date.getFullYear()}-${String(paiement.id).slice(0, 4)}`;
  return [
    { date, ref, libelle: `Encaissement ${fact} - ${clientName}`.replace(/\s+/g, ' ').trim(), debit: montant, credit: 0, compte: '512000', journal: 'BQ' },
    { date, ref, libelle: `Règlement client ${clientName}`, debit: 0, credit: montant, compte: '411000', journal: 'BQ' },
  ];
}
