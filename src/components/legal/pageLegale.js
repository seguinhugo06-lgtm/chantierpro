/**
 * Adresses des pages légales (/cgu, /cgv, /mentions-legales, /confidentialite, /accessibilite,
 * /supprimer-mon-compte). Module léger, lu par main.jsx au démarrage : la page elle-même (PageLegalePublique) se
 * charge à la demande.
 */
export const PAGES_LEGALES = {
  cgu: "Conditions générales d'utilisation",
  cgv: 'Conditions générales de vente',
  'mentions-legales': 'Mentions légales',
  confidentialite: 'Politique de confidentialité',
  accessibilite: 'Accessibilité',
  // Exigée par Google Play en plus de la suppression dans l'app : ouverte sans connexion (tâche suppression-web)
  'supprimer-mon-compte': 'Supprimer mon compte',
};

/** La page légale de l'adresse (« /cgu », « /cgu/ »), ou null. */
export function pageLegaleDe(chemin) {
  const m = String(chemin || '').match(/^\/([a-z-]+)\/?$/);
  return m && Object.prototype.hasOwnProperty.call(PAGES_LEGALES, m[1]) ? m[1] : null;
}
