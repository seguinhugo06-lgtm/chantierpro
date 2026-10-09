/**
 * Formats et blocs communs des documents envoyés au client (devis, factures, situations), partagés
 * par les générateurs (devisHtmlBuilder, pdfHtmlBuilder, générateur intégré de DevisPage).
 * Revue du 9 oct. 2026 : le document que le client signe affichait « 45.00 € » (toFixed),
 * « TVA 5.5% », et chaque générateur imprimait ses propres pénalités de retard.
 */

const EUROS = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NOMBRE = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const vide = (v) => v === undefined || v === null || v === '';

/**
 * 45 → « 45,00 € » ; 1234.5 → « 1 234,50 € » (espaces insécables). Une valeur absente vaut 0 ;
 * une valeur illisible est imprimée telle quelle plutôt que remplacée en silence par 0.
 */
export function euros(montant) {
  if (vide(montant)) return EUROS.format(0);
  const n = Number(montant);
  return Number.isFinite(n) ? EUROS.format(n) : `${montant} €`;
}

/** 5.5 → « 5,5 % » ; 20 → « 20 % » ; une valeur illisible est imprimée telle quelle. */
export function pourcent(valeur) {
  if (vide(valeur)) return '0 %';
  const n = Number(valeur);
  return `${Number.isFinite(n) ? NOMBRE.format(n) : valeur} %`;
}

/** Conditions de règlement proposées dans l'éditeur (clé enregistrée sur le document). */
export const CONDITIONS_PAIEMENT = {
  reception: 'À réception de facture',
  '30_jours': '30 jours',
  '30_jours_fdm': '30 jours fin de mois',
  '45_jours_fdm': '45 jours fin de mois',
  '60_jours': '60 jours',
  acompte_solde: '30 % d\'acompte, solde à réception',
};

const dateFr = (d) => new Date(d).toLocaleDateString('fr-FR');

/**
 * Bloc « Délai de paiement » + « Pénalités de retard » (art. L441-9 et L441-10 C. com.), identique
 * dans tous les documents. Le taux de pénalités est celui réglé par l'entreprise s'il existe,
 * sinon le taux légal par défaut : taux de la BCE majoré de 10 points (art. L441-10 II).
 * Avant (9 oct.) : « BCE + 10 points (soit ~13 %) » d'un côté, « 10 % (3 fois le taux directeur
 * BCE) » de l'autre — deux taux sur un même document, dont un faux (le plancher légal est 3 fois
 * le taux d'intérêt légal, pas 3 fois le taux BCE).
 *
 * @param {{ doc: object, entreprise?: object, isFacture: boolean, dateEcheance?: Date|string|null }} o
 */
export function blocConditionsPaiement({ doc, entreprise, isFacture, dateEcheance }) {
  const libelle = doc?.conditionsPaiement && CONDITIONS_PAIEMENT[doc.conditionsPaiement];
  const delai = Number(entreprise?.delaiPaiement) || 30;
  const delaiTexte = libelle
    ? `${libelle}.`
    : `${delai} jours à compter de la date ${isFacture ? 'de facture' : 'de réception des travaux'}.`;
  const taux = Number(entreprise?.tauxPenalites);
  const tauxTexte = Number.isFinite(taux) && taux > 0
    ? `Taux annuel de ${pourcent(taux)}`
    : 'Taux de la BCE majoré de 10 points';
  return `<strong>Délai de paiement</strong><br>
        ${delaiTexte}<br>
        ${isFacture && dateEcheance ? `Date d'échéance : ${dateFr(dateEcheance)}<br>` : ''}<br>
        <strong>Pénalités de retard</strong><br>
        ${tauxTexte} (art. L441-10 C. com.).<br>
        Indemnité forfaitaire pour frais de recouvrement : 40 € (art. D441-5 C. com.), due entre professionnels.`;
}
