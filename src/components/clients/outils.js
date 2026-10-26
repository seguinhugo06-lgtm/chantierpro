/** Petits outils de la page Clients et de la fiche client. */

/** « 12 rue des Lilas, 75011 Paris » → « Paris » */
export const villeDe = (adresse) => (String(adresse || '').match(/\b\d{5}\s+([^,\n]+)\s*$/) || [])[1]?.trim() || '';

/** Lien « tel: » d'un numéro écrit à la main (espaces retirés). */
export const lienTel = (tel) => (tel ? `tel:${String(tel).replace(/\s/g, '')}` : null);
