import { AlertTriangle } from 'lucide-react';

/**
 * TuileChiffre — un chiffre lisible d'un coup d'œil (refonte du 9 oct. 2026, remplace les 8 modèles
 * de tuiles de l'app). Libellé au-dessus, période comprise (« Encaissé · octobre »), valeur en gros
 * chiffres tabulaires, contexte dessous. La seule touche de couleur : une alerte, ou la variante héros.
 *
 * @param {string} libelle
 * @param {string|number} valeur déjà formatée (src/lib/formatters.js)
 * @param {string} [contexte] ligne sous la valeur
 * @param {string} [alerte] remplace le contexte, en rouge avec une icône
 * @param {boolean} [heros] une par écran au plus : fond d'accent, valeur plus grande
 * @param {Function} [onClick] la tuile filtre ou ouvre quelque chose
 * @param {boolean} [actif] état pressé quand la tuile filtre une liste
 */
export default function TuileChiffre({ libelle, valeur, contexte, alerte, heros = false, onClick, actif, className = '' }) {
  const Element = onClick ? 'button' : 'div';
  return (
    <Element
      data-ui="TuileChiffre"
      {...(onClick ? { type: 'button', onClick, 'aria-pressed': actif === undefined ? undefined : !!actif } : {})}
      className={`min-w-0 flex flex-col gap-2 rounded-2xl text-left ${
        heros
          ? 'bg-accent text-sur-accent p-5 min-h-[112px]'
          : `bg-surface border p-4 min-h-[96px] shadow-e1 ${actif ? 'border-accent ring-2 ring-accent' : 'border-bord'}`
      } ${onClick ? 'transition-colors hover:border-bord-fort active:bg-surface-2' : ''} ${className}`}
    >
      <span className={`text-sm font-medium leading-tight ${heros ? 'opacity-80' : 'text-encre-2'}`}>{libelle}</span>
      <span className={`font-bold tabular-nums tracking-tight leading-none truncate ${heros ? 'text-4xl' : 'text-2xl sm:text-3xl text-encre'}`}>
        {valeur}
      </span>
      {alerte ? (
        <span className={`mt-auto flex items-center gap-1.5 text-sm font-semibold ${heros ? '' : 'text-danger-texte'}`}>
          <AlertTriangle size={16} aria-hidden="true" className="flex-shrink-0" />
          <span className="line-clamp-2">{alerte}</span>
        </span>
      ) : contexte ? (
        <span className={`mt-auto text-sm line-clamp-2 ${heros ? 'opacity-80' : 'text-encre-3'}`}>{contexte}</span>
      ) : null}
    </Element>
  );
}
