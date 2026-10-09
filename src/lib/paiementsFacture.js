/**
 * paiementsFacture — ce qu'une facture a reçu, ce qu'il reste dû, et le statut qui en découle.
 * Source unique (panne verte du 9 oct. 2026) : chaque écran recalculait à sa façon, et
 *   - « Encaisser » ajoutait le paiement sans mettre à jour `montant_paye` : le reste dû restait
 *     entier dans la Trésorerie et sur la page de paiement en ligne ;
 *   - le cumul lisait `p.montant` alors que le paiement saisi portait `amount` : un 2e acompte
 *     ne soldait jamais la facture, qui restait « Envoyée » et relancée.
 */

const CENTIME = 0.005;
const JOUR = 86400000;
/** Délai de paiement par défaut quand la facture n'a pas d'échéance (art. L441-10 C. com. : 30 jours). */
export const DELAI_PAIEMENT_JOURS = 30;

/** Montant d'un paiement, quel que soit le nom du champ (saisie : amount ; base : montant). */
export function montantPaiement(p) {
  const v = Number(p?.montant ?? p?.amount ?? 0);
  return Number.isFinite(v) ? v : 0;
}

/** Paiements rattachés à une facture (par identifiant ou par numéro). */
export function paiementsDe(facture, paiements = []) {
  if (!facture) return [];
  return paiements.filter((p) =>
    (facture.id && (p.facture_id === facture.id || p.devisId === facture.id || p.devis_id === facture.id || p.documentId === facture.id))
    || (facture.numero && (p.document === facture.numero || p.documentNumero === facture.numero)));
}

/**
 * Ce que la facture a déjà reçu : le plus grand de `montant_paye` (paiement en ligne, Stripe) et de la
 * somme des paiements enregistrés (les deux sources se recouvrent, on ne les additionne pas).
 */
export function dejaPaye(facture, paiements = []) {
  const somme = paiementsDe(facture, paiements).reduce((s, p) => s + montantPaiement(p), 0);
  return Math.max(Number(facture?.montant_paye) || 0, somme);
}

export function resteAPayer(facture, paiements = []) {
  return Math.max(0, (Number(facture?.total_ttc) || 0) - dejaPaye(facture, paiements));
}

/** Date d'échéance : celle de la facture, sinon date d'émission + 30 jours. */
export function echeance(facture) {
  if (facture?.date_echeance) return new Date(facture.date_echeance);
  if (!facture?.date) return null;
  return new Date(new Date(facture.date).getTime() + DELAI_PAIEMENT_JOURS * JOUR);
}

/**
 * Statut affiché d'une facture, déduit des paiements et de l'échéance :
 * brouillon · annulee · payee · en_retard · partielle · envoye/vu.
 */
export function statutFacture(facture, paiements = [], maintenant = new Date()) {
  const s = facture?.statut;
  if (s === 'brouillon' || s === 'annulee') return s;
  if (s === 'payee' || s === 'paye') return 'payee';
  const total = Number(facture?.total_ttc) || 0;
  const recu = dejaPaye(facture, paiements);
  if (total > 0 && recu >= total - CENTIME) return 'payee';
  const ech = echeance(facture);
  if (ech && maintenant > new Date(ech.getTime() + JOUR - 1)) return 'en_retard';
  if (recu > CENTIME) return 'partielle';
  return s || 'envoye';
}

/** Jours de retard (0 si à l'heure ou soldée). */
export function joursDeRetard(facture, paiements = [], maintenant = new Date()) {
  if (statutFacture(facture, paiements, maintenant) !== 'en_retard') return 0;
  return Math.max(0, Math.floor((maintenant - echeance(facture)) / JOUR));
}

/**
 * Mise à jour à enregistrer après un nouveau paiement : montant reçu cumulé, et « payée » si soldée.
 * @returns {{ montant_paye: number, statut?: 'payee', soldee: boolean }}
 */
export function apresPaiement(facture, paiements = [], montant = 0) {
  const montant_paye = Math.round((dejaPaye(facture, paiements) + (Number(montant) || 0)) * 100) / 100;
  const soldee = montant_paye >= (Number(facture?.total_ttc) || 0) - CENTIME;
  return { montant_paye, soldee, ...(soldee ? { statut: 'payee' } : {}) };
}

const datePaiement = (p) => p?.date || p?.date_paiement || (p?.createdAt ? String(p.createdAt).slice(0, 10) : null);

/**
 * Argent réellement reçu entre deux dates (incluses, « AAAA-MM-JJ ») : les paiements enregistrés,
 * plus les factures sans ligne de paiement — payées en ligne (montant_paye) ou marquées « payées »
 * à la main (date_paiement, sinon date de mise à jour).
 * Avant : « Encaissé ce mois » additionnait des devis signés.
 */
export function encaisseEntre(documents = [], paiements = [], debut, fin) {
  const dans = (d) => !!d && d >= debut && d <= fin;
  let total = paiements.filter((p) => dans(datePaiement(p))).reduce((s, p) => s + montantPaiement(p), 0);
  for (const f of documents) {
    if (f?.type !== 'facture' || f.facture_type === 'avoir' || paiementsDe(f, paiements).length) continue;
    // Sans ligne de paiement : payée en ligne (montant_paye) ou marquée « payée » à la main (total).
    const payeeMain = f.statut === 'payee' || f.statut === 'paye';
    const montant = Number(f.montant_paye) > 0 ? Number(f.montant_paye) : (payeeMain ? Number(f.total_ttc) || 0 : 0);
    const quand = String(f.date_paiement || (payeeMain ? f.updated_at || '' : '')).slice(0, 10);
    if (montant > 0 && dans(quand)) total += montant;
  }
  return Math.round(total * 100) / 100;
}
