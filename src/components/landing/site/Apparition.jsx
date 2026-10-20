import { useLayoutEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

/** Vieux navigateur sans IntersectionObserver : rien n'attendrait jamais d'être vu, le contenu est rendu tel quel. */
const SANS_OBSERVATEUR = typeof IntersectionObserver === 'undefined';

/**
 * Apparition — fondu et glissement de 16 px au défilement, une seule fois (0,4 s). `delai` en secondes (décalage
 * entre éléments voisins).
 *
 * - Seul un bloc qui est SOUS le premier écran à l'arrivée attend d'être vu : la mesure est prise avant le premier
 *   affichage (`useLayoutEffect`). Ce qui est déjà à l'écran à l'arrivée s'affiche d'emblée, sans fondu : le premier
 *   écran n'est jamais caché, même si un bloc enveloppé s'y trouve (ex. la première rangée de cartes d'une sous-page
 *   sur un grand écran). Un bloc encore caché (`hidden`, taille nulle) attend lui aussi : il apparaît en fondu quand
 *   on l'ouvre.
 * - Le bloc apparaît dès que son haut passe au-dessus des 90 % de la hauteur de la fenêtre (marge de l'observateur,
 *   n'importe quelle part de sa surface) : un bloc plus haut que l'écran apparaît comme un autre.
 * - Sous « réduire les animations » du système, ou sans `IntersectionObserver`, un simple `div` : le contenu est lu tel
 *   quel, sans mouvement ni état de départ transparent.
 */
export function Apparition({ children, delai = 0, className }) {
  const reduit = useReducedMotion();
  const zone = useRef(null);
  const vu = useInView(zone, { once: true, margin: '0px 0px -10% 0px' });
  const [enAttente, setEnAttente] = useState(false);

  useLayoutEffect(() => {
    if (reduit || SANS_OBSERVATEUR || !zone.current) return;
    const r = zone.current.getBoundingClientRect();
    if (r.top >= window.innerHeight || (r.width === 0 && r.height === 0)) setEnAttente(true);
    // Mesure de l'arrivée seulement : un défilement ultérieur ne doit pas recacher un bloc déjà affiché.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reduit || SANS_OBSERVATEUR) return <div ref={zone} className={className}>{children}</div>;
  const cache = enAttente && !vu;
  return (
    <motion.div
      ref={zone}
      className={className}
      initial={false}
      animate={cache ? { opacity: 0, y: 16 } : { opacity: 1, y: 0 }}
      transition={cache ? { duration: 0 } : { duration: 0.4, delay: delai }}
    >
      {children}
    </motion.div>
  );
}

export default Apparition;
