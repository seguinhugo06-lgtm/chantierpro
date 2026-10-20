/**
 * Éléments communs aux exemples de « Les fonctionnalités en action » (site public, couleurs fixes de la palette
 * `marque` : le site est toujours en clair).
 */
import { Info } from 'lucide-react';

/** La légende de l'exemple, en pied du cadre d'application. `data-legende` : lue par le parcours du site. */
export function LegendeExemple({ children }) {
  return (
    <p data-legende="" className="flex items-start gap-2 border-t border-marque-acier/50 bg-marque-glacier-1 px-4 py-3 text-sm leading-snug text-slate-600 sm:px-6">
      <Info size={16} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 text-marque-ardoise" />
      <span>{children}</span>
    </p>
  );
}

// Un statut = un mot et une couleur, comme le devis vivant du premier écran ; le texte porte l'information.
// Contrastes : nuit sur glacier-2 12:1, emerald-800 sur emerald-100 6,8:1.
const TONS = {
  info: 'bg-marque-glacier-2 text-marque-nuit',
  succes: 'bg-emerald-100 text-emerald-800',
};

/** Pastille de statut (`ton` : 'info' ou 'succes'). `className` s'ajoute ; les autres props (data-*) vont sur la pastille. */
export function PastilleExemple({ ton = 'info', className = '', children, ...autres }) {
  return (
    <span
      {...autres}
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold transition-colors duration-300 motion-reduce:transition-none ${TONS[ton] || TONS.info}${className ? ` ${className}` : ''}`}
    >
      {children}
    </span>
  );
}
