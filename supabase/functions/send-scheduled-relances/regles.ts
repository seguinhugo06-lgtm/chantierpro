// Règles des relances automatiques, sans import distant : testées sous vitest
// (src/lib/__tests__/reglesRelances.test.js), utilisées par index.ts (cron).
//
// Recette du 9 oct. 2026 :
// - le montant relancé était le total TTC, pas le reste dû (acomptes reçus, avoirs émis) ;
// - pénalités de retard et indemnité de 40 € réclamées à tous, particuliers compris
//   (art. L441-10 et D441-5 C. com. : entre professionnels seulement) ;
// - un avoir émis était relancé comme une facture impayée.

// BCE + 10 points, par semestre (même table que l'app : src/lib/relanceUtils.js)
export const TAUX_PENALITES_PAR_SEMESTRE: Record<string, number> = { '2026-1': 12.15, '2026-2': 12.4 };
export function tauxPenalitesLegal(date = new Date()): number {
  const connu = TAUX_PENALITES_PAR_SEMESTRE[`${date.getFullYear()}-${date.getMonth() < 6 ? 1 : 2}`];
  if (connu) return connu;
  const cles = Object.keys(TAUX_PENALITES_PAR_SEMESTRE).sort();
  return TAUX_PENALITES_PAR_SEMESTRE[cles[cles.length - 1]];
}
export const DEFAULT_PENALTY_RATE = tauxPenalitesLegal();

/** Mention de retard selon le client (mêmes textes que la mise en demeure de l'app). */
export function mentionRetard(pro: boolean): string {
  return pro
    ? 'Conformément aux articles L.441-10 et D.441-5 du Code de commerce, des pénalités de retard et une indemnité forfaitaire de 40 € pour frais de recouvrement sont dues depuis le lendemain de l’échéance.'
    : "Conformément à l'article 1231-6 du Code civil, la somme due produit intérêts au taux légal à compter de la mise en demeure.";
}
export const RECOVERY_INDEMNITY = 40;
const CENTIME = 0.005;

export type Doc = Record<string, any>;

/** Client professionnel ? Sans catégorie ni entreprise : particulier (on ne réclame pas l'indu). */
export function estClientPro(client: Doc | null | undefined): boolean {
  const categorie = String(client?.categorie || '').toLowerCase();
  if (categorie) return ['professionnel', 'architecte', 'promoteur'].includes(categorie);
  return !!client?.entreprise;
}

/** Montants crédités par les avoirs émis, par facture d'origine. */
export function creditsParFacture(documents: Doc[]): Map<string, number> {
  const credits = new Map<string, number>();
  for (const d of documents) {
    // `annule` est le statut admis par la base ; `annulee` a été écrit par d'anciennes versions
    if (d?.facture_type === 'avoir' && d.avoir_source_id && !['brouillon', 'annule', 'annulee'].includes(d.statut)) {
      credits.set(d.avoir_source_id, (credits.get(d.avoir_source_id) || 0) + Math.abs(Number(d.total_ttc) || 0));
    }
  }
  return credits;
}

/** Paiements reçus, par document (table `paiements`). */
export function paiementsParDocument(paiements: Doc[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of paiements) {
    if (!p?.devis_id) continue;
    m.set(p.devis_id, (m.get(p.devis_id) || 0) + Math.max(0, Number(p.montant) || 0));
  }
  return m;
}

/**
 * Reste dû d'une facture : total − avoirs émis − reçu (le plus grand de `montant_paye` et de la somme des
 * paiements enregistrés, comme l'app : les deux sources se recouvrent). Un devis : son total.
 */
export function resteDu(doc: Doc, credits: Map<string, number>, paiements: Map<string, number>): number {
  const total = Number(doc?.total_ttc) || 0;
  if (doc?.type !== 'facture') return total;
  const recu = Math.max(Number(doc.montant_paye) || 0, paiements.get(doc.id) || 0);
  return Math.max(0, Math.round((total - (credits.get(doc.id) || 0) - recu) * 100) / 100);
}

/** Un document à relancer : jamais un avoir, jamais une facture soldée (payée ou créditée). */
export function relancable(doc: Doc, credits: Map<string, number>, paiements: Map<string, number>): boolean {
  if (!doc) return false;
  if (doc.facture_type === 'avoir') return false;
  if ((Number(doc.total_ttc) || 0) <= 0) return false;
  if (doc.type === 'facture' && resteDu(doc, credits, paiements) <= CENTIME) return false;
  return true;
}

/** Pénalités et indemnité : client professionnel seulement, sur le reste dû. */
export function penalites(montantDu: number, joursRetard: number, pro: boolean, tauxAnnuel = DEFAULT_PENALTY_RATE) {
  const montant = Number(montantDu) || 0;
  const jours = Math.max(0, Number(joursRetard) || 0);
  if (!pro || jours <= 0) return { penalites: 0, indemnite: 0, totalDu: Math.round(montant * 100) / 100 };
  const pen = Math.round(montant * ((Number(tauxAnnuel) || DEFAULT_PENALTY_RATE) / 100) * (jours / 365) * 100) / 100;
  return { penalites: pen, indemnite: RECOVERY_INDEMNITY, totalDu: Math.round((montant + pen + RECOVERY_INDEMNITY) * 100) / 100 };
}
