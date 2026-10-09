/**
 * Formats des documents envoyés au client (devis, factures, situations) : français, toujours.
 * Revue du 9 oct. 2026 : le document que le client signe affichait « 45.00 € » (toFixed) et
 * « TVA 5.5% ». Partagé par les générateurs (devisHtmlBuilder, pdfHtmlBuilder).
 */

const EUROS = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NOMBRE = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** 45 → « 45,00 € » ; 1234.5 → « 1 234,50 € » (espaces insécables). */
export function euros(montant) {
  const n = Number(montant);
  return EUROS.format(Number.isFinite(n) ? n : 0);
}

/** 5.5 → « 5,5 % » ; 20 → « 20 % ». */
export function pourcent(valeur) {
  const n = Number(valeur);
  return `${NOMBRE.format(Number.isFinite(n) ? n : 0)} %`;
}
