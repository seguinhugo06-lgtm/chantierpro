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

/** Les lignes à 0 % de TVA (les titres de lot restent tels quels). */
export function sansTva(lignes) {
  return (Array.isArray(lignes) ? lignes : []).map((l) => (l && !l._isSection ? { ...l, tva: 0 } : l));
}
