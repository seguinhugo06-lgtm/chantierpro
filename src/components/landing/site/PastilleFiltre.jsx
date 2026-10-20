import { forwardRef } from 'react';
import { FOCUS } from './focus';

/**
 * PastilleFiltre — la pastille à bascule du site public (`aria-pressed`) : métiers de l'explorateur, catégories de la
 * FAQ et de /fonctionnalites, écrans de /ressources. Une seule allure partout : pressée, pilule bleu nuit à texte
 * blanc (12,2:1) avec une ombre courte ; sinon blanche à bord acier, texte ardoise (8,9:1), survol glacier.
 * 44 px de haut au moins. Les autres props (`tabIndex`, `data-*`, `aria-*`…) passent au bouton ; la référence aussi
 * (la barre des métiers déplace le focus aux flèches).
 */
export const PastilleFiltre = forwardRef(function PastilleFiltre({ pressee, onClick, children, className = '', ...autres }, ref) {
  return (
    <button
      {...autres}
      ref={ref}
      type="button"
      aria-pressed={pressee}
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-150 motion-reduce:transition-none ${FOCUS} ${
        pressee
          ? 'border-marque-nuit-2 bg-marque-nuit-2 text-white shadow-[0_8px_18px_-10px_rgba(13,46,108,0.7)]'
          : 'border-marque-acier bg-white text-marque-ardoise hover:border-marque-nuit-2/60 hover:bg-marque-glacier-1 hover:text-marque-nuit'
      }${className ? ` ${className}` : ''}`}
    >
      {children}
    </button>
  );
});

export default PastilleFiltre;
