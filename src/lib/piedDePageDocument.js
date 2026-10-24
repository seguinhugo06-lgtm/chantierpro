/**
 * Phrase imprimée au pied des devis, factures et avoirs, selon la nature du document et le client.
 *
 * Les pénalités de retard (C. com. L441-10) et l'indemnité forfaitaire de recouvrement de 40 € (C. com. L441-10 II et
 * D441-5) ne valent qu'entre professionnels. Avant la relecture juridique du 20 oct. 2026, le pied de chaque devis
 * affirmait « pénalités de retard conformes à l'article L441-10 », y compris sur un devis adressé à un particulier, à
 * qui ces pénalités ne peuvent pas être réclamées (docs/metier-btp.md § 5). Désormais :
 * - client professionnel (même règle que les relances et la mise en demeure : `estClientPro`, src/lib/relanceUtils.js) :
 *   le renvoi aux deux articles ;
 * - particulier, ou client inconnu (au doute, on n'affirme pas ce qui pourrait ne pas être dû) : aucune référence
 *   à L441-10 ni à D441-5.
 *
 * Une facture n'a pas de phrase ici : ses pénalités et l'indemnité de 40 € s'impriment dans le bloc « Pénalités de
 * retard » des conditions de règlement (`blocConditionsPaiement`, src/lib/formatDocument.js), avec le même critère.
 *
 * Utilisé par LES TROIS générateurs : src/lib/devisHtmlBuilder.js (page de signature), src/lib/pdfHtmlBuilder.js
 * (envois rapides) et le générateur inline de DevisPage.jsx (aperçu et impression).
 */
import { estClientPro } from './relanceUtils';

export const PHRASE_DEVIS = 'Devis reçu avant l\'exécution des travaux.';

/** Renvoi légal entre professionnels : L441-10 (pénalités) et D441-5 (indemnité de 40 €). */
export const PHRASE_RETARD_PROFESSIONNEL = 'Pénalités de retard et indemnité forfaitaire de recouvrement : articles L441-10 et D441-5 du Code de commerce.';

export const PHRASE_AVOIR = 'Cet avoir rectifie la facture de référence citée ci-dessus ; il en réduit d\'autant le montant dû.';

/**
 * Nature d'un document pour le pied de page : 'avoir', 'facture' ou 'devis'.
 * @param {{ type?: string, facture_type?: string }} doc
 * @returns {'avoir' | 'facture' | 'devis'}
 */
export function natureDuDocument(doc) {
  if (doc?.facture_type === 'avoir') return 'avoir';
  return doc?.type === 'facture' ? 'facture' : 'devis';
}

/**
 * Texte du pied de page ('' quand il n'y en a pas).
 * @param {{ nature: 'devis' | 'facture' | 'avoir', client?: object | null }} o
 */
export function textePiedDePage({ nature, client }) {
  if (nature === 'avoir') return PHRASE_AVOIR;
  if (nature === 'devis') return estClientPro(client) ? `${PHRASE_DEVIS} ${PHRASE_RETARD_PROFESSIONNEL}` : PHRASE_DEVIS;
  return '';
}

/**
 * Le bloc HTML du pied de page, tel que les générateurs l'insèrent ('' quand il n'y a pas de texte). Le texte ne
 * contient aucune saisie de l'artisan : rien à échapper.
 * @param {{ nature: 'devis' | 'facture' | 'avoir', client?: object | null }} o
 */
export function piedDePageHtml({ nature, client }) {
  const texte = textePiedDePage({ nature, client });
  return texte ? `<div style="margin-top:6px;font-size:6.5pt;color:#666">${texte}</div>` : '';
}
