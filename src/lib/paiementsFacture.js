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
/**
 * Ce que les avoirs émis ont crédité sur la facture. Posé par DataContext (`montant_credite`), qui voit
 * tous les documents : un avoir réduit le reste dû comme un paiement, sans en être un.
 */
const credite = (facture) => Number(facture?.montant_credite) || 0;
/**
 * Délai de repère quand une facture n'a ni échéance ni conditions de règlement : 30 jours après
 * l'émission. C'est un repère d'écran, pas une règle : entre professionnels, le délai légal court de
 * l'exécution de la prestation (art. L441-10 I C. com.) ; avec un particulier, il n'y a pas de délai
 * légal. D'où `date_echeance`, posée à la création de chaque facture (App.addDevis) et imprimée.
 */
export const DELAI_PAIEMENT_JOURS = 30;

const JOURS_CONDITIONS = { reception: 0, acompte_solde: 0, '30_jours': 30, '60_jours': 60 };
const FIN_DE_MOIS = { '30_jours_fdm': 30, '45_jours_fdm': 45 };

/**
 * Délai d'une condition de règlement : clé de l'ancien formulaire (« 30_jours_fdm ») ou texte de
 * l'éditeur (« Paiement à 30 jours », « … à réception de facture », « solde à la livraison »).
 * @returns {{ jours: number, finDeMois: boolean } | null} null : pas de délai lisible
 */
export function delaiDeConditions(conditions) {
  if (!conditions) return null;
  if (FIN_DE_MOIS[conditions] !== undefined) return { jours: FIN_DE_MOIS[conditions], finDeMois: true };
  if (JOURS_CONDITIONS[conditions] !== undefined) return { jours: JOURS_CONDITIONS[conditions], finDeMois: false };
  const t = String(conditions).toLowerCase();
  const n = t.match(/(\d+)\s*jours/);
  if (n) return { jours: Number(n[1]), finDeMois: /fin de mois/.test(t) };
  if (/réception|reception|livraison/.test(t)) return { jours: 0, finDeMois: false };
  return null;
}

/** « AAAA-MM-JJ » lu comme une date LOCALE (new Date('2026-10-09') est minuit UTC : la veille aux Antilles). */
export function dateLocale(valeur) {
  if (valeur instanceof Date) return new Date(valeur.getTime());
  const m = typeof valeur === 'string' && valeur.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(valeur);
}

/**
 * Date d'échéance d'une facture émise le `dateEmission` : selon ses conditions de règlement
 * (« 30 jours fin de mois » : +30 jours, puis fin de ce mois), sinon le délai de l'entreprise.
 * @returns {string} « AAAA-MM-JJ »
 */
export function dateEcheance(dateEmission, { conditionsPaiement, delaiJours } = {}) {
  const d = dateLocale(dateEmission || new Date());
  if (Number.isNaN(d.getTime())) return null;
  const c = delaiDeConditions(conditionsPaiement);
  d.setDate(d.getDate() + (c ? c.jours : (Number(delaiJours) || DELAI_PAIEMENT_JOURS)));
  if (c?.finDeMois) d.setMonth(d.getMonth() + 1, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
  return Math.max(0, (Number(facture?.total_ttc) || 0) - credite(facture) - dejaPaye(facture, paiements));
}

/**
 * Date d'échéance : celle de la facture, sinon déduite de ses conditions de règlement, sinon du
 * délai de l'entreprise (celui imprimé sur le document), sinon 30 jours.
 */
export function echeance(facture, { delaiJours } = {}) {
  if (facture?.date_echeance) return dateLocale(facture.date_echeance);
  if (!facture?.date) return null;
  return dateLocale(dateEcheance(facture.date, { conditionsPaiement: facture.conditionsPaiement || facture.conditions, delaiJours }));
}

/**
 * Statut affiché d'une facture, déduit des paiements et de l'échéance :
 * brouillon · annulee · payee · en_retard · partielle · envoye/vu.
 */
export function statutFacture(facture, paiements = [], maintenant = new Date()) {
  const s = facture?.statut;
  if (s === 'brouillon') return s;
  if (s === 'annulee' || s === 'annule') return 'annulee';
  const total = Number(facture?.total_ttc) || 0;
  // Entièrement créditée par avoir : annulée (ni à encaisser, ni à relancer)
  if (total > 0 && credite(facture) >= total - CENTIME) return 'annulee';
  if (s === 'payee' || s === 'paye') return 'payee';
  const du = total - credite(facture);
  const recu = dejaPaye(facture, paiements);
  if (du > 0 && recu >= du - CENTIME) return 'payee';
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
  const soldee = montant_paye >= (Number(facture?.total_ttc) || 0) - credite(facture) - CENTIME;
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
    // L'app relit `updatedAt` (camelCase) : `updated_at` seul laissait ces factures hors de l'encaissé
    const quand = String(f.date_paiement || (payeeMain ? f.updated_at || f.updatedAt || '' : '')).slice(0, 10);
    if (montant > 0 && dans(quand)) total += montant;
  }
  return Math.round(total * 100) / 100;
}
