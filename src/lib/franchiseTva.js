/**
 * Franchise en base de TVA (art. 293 B du CGI) : une micro-entreprise ne facture pas de TVA. Ses
 * documents impriment « TVA non applicable, art. 293 B du CGI » ; les montants enregistrés suivent :
 * TVA 0, TTC = HT.
 *
 * Recette du 9 oct. 2026 : l'éditeur de devis et les factures d'acompte, de solde et d'échéancier
 * ajoutaient la TVA des lignes (100 € HT → 120 € « TTC » imprimés sous la mention 293 B) : le client
 * payait une TVA que l'artisan n'a pas le droit de facturer.
 */

/** L'entreprise est en franchise en base (seule la micro-entreprise l'est dans l'app). */
export function estFranchiseTva(entreprise) {
  return (entreprise?.formeJuridique || entreprise?.forme_juridique) === 'Micro-entreprise';
}

const STATUTS_DEVIS_ENGAGES = ['accepte', 'signe', 'acompte_facture', 'facture'];

/** Document émis : facture ou avoir hors brouillon, ou devis signé (il engage les deux parties). */
export function estDocumentEmis(doc) {
  if (!doc) return false;
  if (doc.type === 'facture') return doc.statut !== 'brouillon';
  return STATUTS_DEVIS_ENGAGES.includes(doc.statut);
}

/** TVA enregistrée sur le document (0 si aucune). */
function tvaEnregistree(doc) {
  return Math.abs(Number(doc?.tva ?? doc?.total_tva ?? 0)) || 0;
}

/**
 * Le document s'imprime-t-il en franchise (sans TVA) ? Oui pour une micro-entreprise, SAUF un document émis
 * (facture, avoir, devis signé) enregistré avec de la TVA : il se réimprime tel qu'il a été émis. Une facture
 * émise ne se modifie pas, elle se corrige par un avoir (CGI art. 289 I-1) ; la TVA portée par erreur est due
 * du seul fait de la facture (CGI art. 283, 3) et s'annule par une facture rectificative ou un avoir
 * (BOI-TVA-DED-40-10-10) — relecture juridique du 10 oct. 2026.
 */
export function franchiseAppliquee(doc, entreprise) {
  if (!estFranchiseTva(entreprise)) return false;
  return !(estDocumentEmis(doc) && tvaEnregistree(doc) > 0.005);
}

/** Document émis avec de la TVA alors que l'entreprise est en franchise : à régulariser (avoir, nouveau devis). */
export function tvaARegulariser(doc, entreprise) {
  return estFranchiseTva(entreprise) && !franchiseAppliquee(doc, entreprise);
}

/** Les lignes à 0 % de TVA (les titres de lot restent tels quels). */
export function sansTva(lignes) {
  return (Array.isArray(lignes) ? lignes : []).map((l) => (l && !l._isSection ? { ...l, tva: 0 } : l));
}
