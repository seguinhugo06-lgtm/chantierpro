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

/** Ce que la facture a reçu, plafonné à son total (« payée » à la main sans paiement : son dû). */
export function encaisse(f, paiements = [], maintenant = new Date()) {
  if (!estEmise(f) || estAvoir(f)) return 0;
  const total = Number(f.total_ttc) || 0;
  const du = total - (Number(f.montant_credite) || 0);
  const recu = dejaPaye(f, paiements);
  const statut = statutFacture(f, paiements, maintenant);
  return arrondi(Math.min(total, Math.max(recu, statut === 'payee' ? du : 0)));
}

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
