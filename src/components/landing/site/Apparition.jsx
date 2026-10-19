import { motion, useReducedMotion } from 'framer-motion';

/**
 * Apparition — fondu et glissement de 16 px au défilement, une seule fois (0,4 s).
 * Sous « réduire les animations » du système, rend un simple `div` : le contenu est lu tel quel, sans mouvement
 * ni état de départ transparent. `delai` en secondes (décalage entre éléments voisins).
 * Piège : le seuil de 20 % de la hauteur ne se franchit jamais pour un bloc plus haut que cinq écrans (il resterait
 * transparent) : n'envelopper que des blocs courts (un titre, une carte, une capture), pas toute une page.
 */
export function Apparition({ children, delai = 0, className }) {
  const reduit = useReducedMotion();
  if (reduit) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay: delai }}
    >
      {children}
    </motion.div>
  );
}

export default Apparition;
