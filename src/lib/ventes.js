/**
 * Ventes, créances et encaissements : UNE définition pour toute l'app (Clients, cloche, menu, Accueil,
 * Finances, exports). Elle s'appuie sur src/lib/paiementsFacture.js (reste dû, statut d'une facture) et
 * src/lib/gardeFacturation.js (ce qu'un devis a déjà facturé).
 *
 * Recette du 9 oct. 2026 : chaque écran comptait à sa façon. Un devis signé ET sa facture (chiffre
 * d'affaires et TVA doublés), des factures payées annoncées « impayées » (statut brut), des brouillons
 * exportés comme des ventes, la TVA des devis comptée comme TVA collectée, un acompte reçu compté 0 €.
 *
 * Définitions :
 * - facture émise : une facture ou un avoir hors brouillon. Une facture annulée par avoir reste émise :
 *   son avoir (montants négatifs) la compense.
 * - facture ouverte : émise, pas un avoir, ni payée ni annulée, avec un reste dû.
 * - encaissé : ce que la facture a reçu (paiements, paiement en ligne, ou « payée » à la main).
 * - reste à facturer : un devis signé moins ce qui a déjà été facturé (devis « facturé » : 0).
 */
import { statutFacture, resteAPayer, dejaPaye } from './paiementsFacture';
import { dejaFactureTTC } from './gardeFacturation';
import { totauxDocument } from './totauxDocument';
import { estExpire } from './validiteDevis';
import { dateLue, jourLocal } from './dates';

const CENTIME = 0.005;
const arrondi = (n) => Math.round((Number(n) || 0) * 100) / 100;
const jour = (d) => String(d || '').slice(0, 10);

export const estFacture = (d) => d?.type === 'facture';
export const estAvoir = (d) => estFacture(d) && d.facture_type === 'avoir';

/** Facture ou avoir émis (hors brouillon). */
export function estEmise(d) {
  return estFacture(d) && d.statut !== 'brouillon';
}

/** Facture à encaisser : émise, pas un avoir, ni payée ni annulée, avec un reste dû. */
export function estOuverte(f, paiements = [], maintenant = new Date()) {
  if (!estEmise(f) || estAvoir(f)) return false;
  if (['payee', 'annulee'].includes(statutFacture(f, paiements, maintenant))) return false;
  return resteAPayer(f, paiements) > CENTIME;
}

/** Facture dont l'échéance est passée et qui n'est pas soldée. */
export function estEnRetard(f, paiements = [], maintenant = new Date()) {
  return estOuverte(f, paiements, maintenant) && statutFacture(f, paiements, maintenant) === 'en_retard';
}

const JOUR_MS = 86400000;
// Jours entiers écoulés depuis un jour « AAAA-MM-JJ » (lu en heure locale, comme la fiche du document)
const joursDepuis = (jour, maintenant) => (jour ? Math.floor((maintenant - dateLue(String(jour).slice(0, 10))) / JOUR_MS) : 0);

/** Jours depuis l'envoi d'un devis : sa date d'envoi, sinon sa date (devis enregistrés avant la date d'envoi). */
export function joursDepuisEnvoi(d, maintenant = new Date()) {
  return Math.max(0, joursDepuis(d?.date_envoi || d?.date, maintenant));
}

/**
 * Devis à relancer : envoyé (ou vu) depuis 7 jours ou plus, et encore valable — un devis expiré ne se relance pas,
 * il se prolonge. Relecture de la Task 5 « ancien code » (25 oct. 2026) : l'Accueil et la pastille comptaient depuis la
 * date du devis (un devis créé le 10 et envoyé le 24 était « sans réponse depuis 14 jours » le jour de l'envoi) et
 * comptaient les devis expirés.
 */
export function devisARelancer(d, maintenant = new Date(), entreprise = null) {
  if (!d || estFacture(d) || !['envoye', 'vu'].includes(d.statut)) return false;
  if (estExpire(d, jourLocal(maintenant), entreprise)) return false;
  return joursDepuisEnvoi(d, maintenant) >= 7;
}

/**
 * Le devis à relancer en premier parmi des documents (ceux d'un client : alerte de sa fiche) : celui qui attend depuis
 * le plus longtemps, selon devisARelancer. Rend { devis, jours } ou null.
 */
export function premierDevisARelancer(documents = [], maintenant = new Date(), entreprise = null) {
  const aRelancer = documents.filter((d) => devisARelancer(d, maintenant, entreprise));
  if (aRelancer.length === 0) return null;
  const devis = aRelancer.reduce((a, b) => (joursDepuisEnvoi(b, maintenant) > joursDepuisEnvoi(a, maintenant) ? b : a));
  return { devis, jours: joursDepuisEnvoi(devis, maintenant) };
}

/**
 * Document « à traiter » — UNE règle pour la puce de la liste Devis & factures, la pastille du menu, « À faire
 * aujourd'hui » de l'Accueil et la cloche (audit UX du 20 oct. 2026) :
 * - brouillon de plus de 2 jours (à finaliser) ;
 * - facture en retard (échéance passée, reste dû) ;
 * - devis à relancer (devisARelancer).
 */
export function aTraiter(d, paiements = [], maintenant = new Date(), entreprise = null) {
  if (!d) return false;
  if (d.statut === 'brouillon') return joursDepuis(d.date, maintenant) > 2;
  if (estFacture(d)) return estEnRetard(d, paiements, maintenant);
  return devisARelancer(d, maintenant, entreprise);
}

/**
 * Urgent : une facture en retard. Le rouge veut dire « en retard » (une facture, ou une tâche, comptée ailleurs) ; un
 * devis à relancer ou un brouillon à finaliser est « à surveiller » (ambre). Décision du contrôleur, 25 oct. 2026.
 */
export function estUrgent(d, paiements = [], maintenant = new Date()) {
  return estFacture(d) && estEnRetard(d, paiements, maintenant);
}

/**
 * Ce que la facture a reçu, plafonné à son total (« payée » sans paiement : son dû). Depuis la migration 099, la base
 * n'accepte « payée » que si les paiements soldent la facture : ce repli ne couvre plus que la tolérance d'un centime
 * de la base et d'anciennes données locales de démonstration.
 */
export function encaisse(f, paiements = [], maintenant = new Date()) {
  if (!estEmise(f) || estAvoir(f)) return 0;
  const total = Number(f.total_ttc) || 0;
  const du = total - (Number(f.montant_credite) || 0);
  const recu = dejaPaye(f, paiements);
  const statut = statutFacture(f, paiements, maintenant);
  return arrondi(Math.min(total, Math.max(recu, statut === 'payee' ? du : 0)));
}

/**
 * Devis signé : « accepte » (signature sur place, statut posé à la main) ou « signe » (signature à distance,
 * fonction sign_devis). Recette du 9 oct. 2026 : plusieurs écrans ne comptaient que « accepte », et un devis
 * signé par le lien disparaissait de la fiche client, des prévisions de trésorerie, du budget suggéré.
 */
export const estSigne = (d) => !estFacture(d) && (d?.statut === 'accepte' || d?.statut === 'signe');

/** Devis signé (ou accepté) dont une partie reste à facturer. */
const STATUTS_DEVIS_SIGNE = ['accepte', 'signe', 'acompte_facture'];

/** Part d'un devis signé pas encore facturée (TTC). Un devis « facturé » ou non signé : 0. */
export function resteAFacturer(devis, documents = []) {
  if (!devis || estFacture(devis) || !STATUTS_DEVIS_SIGNE.includes(devis.statut)) return 0;
  return arrondi(Math.max(0, (Number(devis.total_ttc) || 0) - dejaFactureTTC(devis.id, documents)));
}

/**
 * Ce qui reste à recevoir : reste dû des factures ouvertes + part non facturée des devis signés.
 * @returns {{ factures: number, devis: number, total: number }}
 */
export function creances(documents = [], paiements = [], maintenant = new Date()) {
  let factures = 0;
  let devis = 0;
  for (const d of documents) {
    if (estOuverte(d, paiements, maintenant)) factures += resteAPayer(d, paiements);
    else if (!estFacture(d)) devis += resteAFacturer(d, documents);
  }
  return { factures: arrondi(factures), devis: arrondi(devis), total: arrondi(factures + devis) };
}

const dansPeriode = (d, du, au) => {
  const j = jour(d?.date);
  return (!du || j >= du) && (!au || j <= au);
};

/** Factures et avoirs émis dont la date est dans la période (« AAAA-MM-JJ », bornes incluses, facultatives). */
export function facturesEmises(documents = [], { du, au } = {}) {
  return documents.filter((d) => estEmise(d) && dansPeriode(d, du, au));
}

/** Chiffre d'affaires HT de la période : factures émises, avoirs déduits (sans les devis qui les ont produites). */
export function chiffreAffairesHT(documents = [], periode = {}) {
  return arrondi(facturesEmises(documents, periode).reduce((s, f) => s + (Number(f.total_ht) || 0), 0));
}

/**
 * TVA facturée sur la période (régime des débits : à l'émission), par taux, avoirs déduits.
 * Une micro-entreprise (franchise en base) n'en a pas.
 * @returns {{ total: number, parTaux: Array<{ taux: number, base: number, montant: number }> }}
 */
export function tvaFacturee(documents = [], periode = {}, { isMicro = false } = {}) {
  if (isMicro) return { total: 0, parTaux: [] };
  const parTaux = new Map();
  for (const f of facturesEmises(documents, periode)) {
    for (const x of totauxDocument(f).tva) {
      const cur = parTaux.get(x.taux) || { taux: x.taux, base: 0, montant: 0 };
      cur.base += x.base;
      cur.montant += x.montant;
      parTaux.set(x.taux, cur);
    }
  }
  const lignes = [...parTaux.values()].map((x) => ({ taux: x.taux, base: arrondi(x.base), montant: arrondi(x.montant) }))
    .filter((x) => x.base !== 0 || x.montant !== 0)
    .sort((a, b) => a.taux - b.taux);
  return { total: arrondi(lignes.reduce((s, x) => s + x.montant, 0)), parTaux: lignes };
}
