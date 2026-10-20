/**
 * Garde commune des observateurs d'intersection du site public.
 *
 * `useInView` de framer-motion crée un `IntersectionObserver` dès que la référence qu'on lui donne pointe sur un
 * élément, sans vérifier qu'il existe : sur un vieux navigateur, la page entière tombait (« IntersectionObserver is
 * not a constructor », constaté à la relecture de la manche A sur /fonctionnalites et /ressources). Les composants lui
 * passent donc `AUCUNE_ZONE` (une référence vide : rien n'est observé) quand il n'y a pas d'observateur, et aussi en
 * mouvement réduit (rien n'attend d'être vu : aucun observateur inutile).
 * `whileInView`, lui, se garde tout seul (framer-motion, `motion/features/viewport`).
 */
export const SANS_OBSERVATEUR = typeof IntersectionObserver === 'undefined';

/** Une référence qui ne désigne rien : `useInView(AUCUNE_ZONE)` n'observe rien et reste à `false`. */
export const AUCUNE_ZONE = Object.freeze({ current: null });

/** La référence à donner à `useInView` : la vraie si l'on peut et doit observer, sinon `AUCUNE_ZONE`. */
export function zoneObservee(ref, { reduit = false } = {}) {
  return SANS_OBSERVATEUR || reduit ? AUCUNE_ZONE : ref;
}
