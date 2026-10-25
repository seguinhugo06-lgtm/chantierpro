import { estFranchiseTva, franchiseAppliquee } from './franchiseTva';

/**
 * « TTC » après le total d'un document, à l'écran : seulement hors franchise de TVA. En franchise (art. 293 B du CGI),
 * ni « TTC » ni « HT » : le montant seul (règle du projet, docs/metier-btp.md § 3 ; relecture juriste-btp du
 * 24 oct. 2026 — CGI art. 293 E, II : pas de TVA sur les factures ; service-public F21746).
 *   - un document existant : franchiseAppliquee(doc, entreprise) (émis avec TVA, il garde « TTC ») ;
 *   - une facture à créer : estFranchiseTva(entreprise) (c'est la facture future qui compte).
 */
export function suffixeTtc(franchise) {
  return franchise ? '' : ' TTC';
}

/** « 1 250,00 € TTC », ou « 1 250,00 € » en franchise. */
export function avecMentionTtc(montantFormate, franchise) {
  return `${montantFormate}${suffixeTtc(franchise)}`;
}

/** Franchise pour un document existant (doc) ou pour une facture à créer (doc absent). */
export function sansMentionTtc(entreprise, doc = null) {
  return doc ? franchiseAppliquee(doc, entreprise) : estFranchiseTva(entreprise);
}
