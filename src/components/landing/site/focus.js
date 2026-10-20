/**
 * L'anneau de focus du site public, en un seul endroit (avant : la même chaîne recopiée dans dix fichiers).
 * Un anneau de 2 px décalé de 2 px ; l'espace du décalage reprend la couleur du fond, pour que l'anneau se détache
 * nettement de l'élément :
 *   FOCUS              anneau bleu nuit sur fond blanc (le cas courant)
 *   FOCUS_SUR_GLACIER  anneau bleu nuit sur le fond glacier (premier écran, en-têtes des sous-pages, cycle)
 *   FOCUS_SUR_SOMBRE   anneau blanc sur le pied de page bleu-noir
 * Les boutons en pilule (`BoutonSite`) règlent leur anneau par variante.
 * Les classes sont écrites en entier : Tailwind les retrouve dans ce fichier.
 */
export const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marque-nuit-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

export const FOCUS_SUR_GLACIER =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marque-nuit-2 focus-visible:ring-offset-2 focus-visible:ring-offset-marque-glacier-1';

export const FOCUS_SUR_SOMBRE =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-marque-encre-sombre';
