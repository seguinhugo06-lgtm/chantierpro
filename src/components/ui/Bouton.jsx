import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Bouton — refonte du 9 oct. 2026. Un seul bouton plein (principal) par écran.
 *   principal  : fond d'accent (couleur de l'entreprise), texte --sur-accent (≥ 4,5:1 garanti) ;
 *   secondaire : surface + bord, texte encre ;
 *   discret    : sans fond, pour les actions de faible poids ;
 *   danger     : rouge plein, pour une action destructrice confirmée.
 * Hauteurs : normale 44 px, grande 48 px ; compacte 36 px au bureau seulement (44 au téléphone).
 * Lit le thème sur <html> : ni isDark ni couleur à passer.
 */
const VARIANTES = {
  principal: 'bg-accent text-sur-accent font-semibold shadow-e1 hover:brightness-95 active:brightness-90',
  secondaire: 'bg-surface text-encre font-semibold border border-bord-fort hover:bg-surface-2',
  discret: 'text-encre-2 font-medium hover:bg-surface-2 hover:text-encre',
  danger: 'bg-red-600 text-white font-semibold hover:bg-red-700',
};
const TAILLES = {
  compacte: 'h-11 sm:h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  normale: 'h-11 px-4 text-sm gap-2 rounded-xl',
  grande: 'h-12 px-5 text-base gap-2 rounded-xl',
};

export const Bouton = forwardRef(function Bouton(
  { variante = 'secondaire', taille = 'normale', icone: Icone, iconeFin: IconeFin, chargement = false, pleineLargeur = false, className = '', children, disabled, type = 'button', ...reste },
  ref,
) {
  const tailleIcone = taille === 'grande' ? 20 : 18;
  return (
    <button
      ref={ref}
      type={type}
      data-ui="Bouton"
      disabled={disabled || chargement}
      aria-busy={chargement || undefined}
      className={`inline-flex items-center justify-center whitespace-nowrap transition-[filter,background-color,color] duration-150 disabled:opacity-50 disabled:pointer-events-none ${VARIANTES[variante] || VARIANTES.secondaire} ${TAILLES[taille] || TAILLES.normale} ${pleineLargeur ? 'w-full' : ''} ${className}`}
      {...reste}
    >
      {chargement
        ? <Loader2 size={tailleIcone} className="animate-spin" aria-hidden="true" />
        : Icone ? <Icone size={tailleIcone} aria-hidden="true" className="flex-shrink-0" /> : null}
      {children}
      {IconeFin && !chargement ? <IconeFin size={tailleIcone} aria-hidden="true" className="flex-shrink-0" /> : null}
    </button>
  );
});

/**
 * BoutonIcone — 44 × 44 px de zone de toucher quelle que soit l'icône ; le nom (aria-label) est obligatoire.
 */
export const BoutonIcone = forwardRef(function BoutonIcone(
  { icone: Icone, libelle, variante = 'discret', taille = 20, className = '', type = 'button', ...reste },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-ui="BoutonIcone"
      aria-label={libelle}
      title={libelle}
      className={`inline-flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0 transition-colors disabled:opacity-50 disabled:pointer-events-none ${VARIANTES[variante] || VARIANTES.discret} ${className}`}
      {...reste}
    >
      <Icone size={taille} aria-hidden="true" />
    </button>
  );
});

export default Bouton;
