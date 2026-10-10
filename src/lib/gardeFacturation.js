/**
 * Garde-fous de facturation, calculés sur TOUS les documents (et non sur l'état de l'écran au moment du
 * clic) — recette du 9 oct. 2026 : deux appuis, une base lente ou un devis resté « signé » suffisaient à
 * facturer deux fois le même devis ; un acompte de 150 % ou négatif passait ; un solde à 0 € était émis.
 */

const CENTIME = 0.01;
// Écart d'arrondi toléré entre la somme des factures et le devis (arrondis par taux sur plusieurs factures)
const TOLERANCE = 0.05;

const ttc = (d) => Math.abs(Number(d?.total_ttc) || 0);
const estAvoir = (d) => d?.facture_type === 'avoir';
// La base n'admet que `annule` ; l'app a longtemps écrit `annulee` : accepter les deux.
export const estAnnule = (d) => d?.statut === 'annule' || d?.statut === 'annulee';

/** Avoirs émis (hors brouillon et annulés) sur une facture. */
export function avoirsDe(facture, documents = []) {
  if (!facture?.id) return [];
  return documents.filter((d) => estAvoir(d) && d.avoir_source_id === facture.id && d.statut !== 'brouillon' && !estAnnule(d));
}

/** Montant TTC crédité par les avoirs émis sur une facture. */
export function montantCredite(facture, documents = []) {
  return Math.round(avoirsDe(facture, documents).reduce((s, a) => s + ttc(a), 0) * 100) / 100;
}

/** Factures (hors avoirs et annulées) émises sur un devis. */
export function facturesDuDevis(devisId, documents = []) {
  return documents.filter((d) => d.type === 'facture' && d.devis_source_id === devisId && !estAvoir(d) && !estAnnule(d));
}

/** TTC déjà facturé sur un devis, avoirs émis déduits. */
export function dejaFactureTTC(devisId, documents = []) {
  const brut = facturesDuDevis(devisId, documents).reduce((s, f) => s + (Number(f.total_ttc) || 0) - montantCredite(f, documents), 0);
  return Math.round(brut * 100) / 100;
}

/**
 * Le devis est-il entièrement facturé ? Une facture de solde ou complète non annulée par avoir, ou des
 * factures qui couvrent déjà son montant. Sert à ne plus PROPOSER « Facturer » (le contrôle à la création
 * reste `verifierNouvelleFacture`).
 */
export function estEntierementFacture(devisSource, documents = []) {
  if (!devisSource?.id) return false;
  const factures = facturesDuDevis(devisSource.id, documents);
  if (factures.some((f) => ['solde', 'totale'].includes(f.facture_type) && montantCredite(f, documents) < ttc(f) - CENTIME)) return true;
  return factures.length > 0 && dejaFactureTTC(devisSource.id, documents) >= ttc(devisSource) - TOLERANCE;
}

/** Pourcentage d'acompte acceptable : entre 1 et 99 %. */
export function pourcentageAcompteValide(p) {
  const n = Number(String(p ?? '').replace(',', '.'));
  return Number.isFinite(n) && n >= 1 && n <= 99;
}

const refus = (raison) => ({ ok: false, raison });

/**
 * Une facture (ou un avoir) émise ne se modifie pas : on fait un avoir. Un devis se modifie tant qu'il
 * n'est ni signé ni facturé (après : avenant).
 */
export function peutModifierDocument(doc, documents = []) {
  if (!doc) return false;
  if (doc.type === 'facture') return doc.statut === 'brouillon';
  if (!['brouillon', 'envoye', 'vu'].includes(doc.statut)) return false;
  return facturesDuDevis(doc.id, documents).length === 0;
}

/**
 * Une facture (ou un avoir) émise ne se supprime pas : elle reste dans la numérotation et se corrige par
 * un avoir. Un devis qui a des factures ne se supprime pas non plus (elles perdraient leur origine).
 */
export function peutSupprimerDocument(doc, documents = []) {
  if (!doc) return false;
  // Un document de facturation déjà numéroté reste dans la séquence, même en brouillon : on l'annule
  // (relecture juridique du 10 oct. 2026 — numérotation continue, CGI ann. II art. 242 nonies A I 1°).
  if (doc.type === 'facture') return doc.statut === 'brouillon' && !doc.numero;
  if (['acompte_facture', 'facture'].includes(doc.statut)) return false;
  return facturesDuDevis(doc.id, documents).length === 0;
}

/**
 * Peut-on émettre cette nouvelle facture sur ce devis ?
 * @param {object} devisSource
 * @param {Array} documents  tous les devis et factures
 * @param {{ nature: 'acompte'|'etape'|'solde'|'totale'|'situation', montantTTC?: number }} demande
 * @returns {{ ok: true } | { ok: false, raison: string }}
 */
export function verifierNouvelleFacture(devisSource, documents = [], { nature, montantTTC } = {}) {
  if (!devisSource?.id) return refus('Devis introuvable.');
  if (!devisSource.client_id) return refus("Rattachez d'abord un client à ce devis.");
  if (!['accepte', 'signe', 'acompte_facture', 'facture'].includes(devisSource.statut)) {
    return refus('Le devis doit être accepté ou signé avant d\'être facturé.');
  }
  const factures = facturesDuDevis(devisSource.id, documents);
  // Une facture de solde ou complète, non entièrement annulée par avoir : le devis est facturé
  const finale = factures.find((f) => ['solde', 'totale'].includes(f.facture_type) && montantCredite(f, documents) < ttc(f) - CENTIME);
  if (finale) return refus(`Ce devis est déjà entièrement facturé (${finale.numero || 'facture de solde'}). Pour corriger, faites un avoir.`);
  const parSituations = factures.some((f) => f.facture_type === 'situation');
  if (nature !== 'situation' && parSituations) {
    return refus('Ce devis est facturé par situations de travaux : facturez la suivante depuis le chantier.');
  }
  if (nature === 'situation' && factures.some((f) => f.facture_type !== 'situation')) {
    return refus('Ce devis a déjà été facturé autrement (acompte ou facture complète) : il ne peut plus passer en situations.');
  }
  if (nature === 'situation') return { ok: true };

  const montant = Math.round((Number(montantTTC) || 0) * 100) / 100;
  if (!(montant > CENTIME)) return refus('Le montant à facturer doit être supérieur à zéro.');
  const reste = Math.round((ttc(devisSource) - dejaFactureTTC(devisSource.id, documents)) * 100) / 100;
  if (montant > reste + TOLERANCE) {
    return refus(`Cette facture (${montant.toFixed(2).replace('.', ',')} €) dépasse ce qui reste à facturer sur le devis (${Math.max(0, reste).toFixed(2).replace('.', ',')} €).`);
  }
  return { ok: true };
}
