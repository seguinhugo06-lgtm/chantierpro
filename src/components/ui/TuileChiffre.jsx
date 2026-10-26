import { AlertTriangle } from 'lucide-react';

/**
 * TuileChiffre — un chiffre lisible d'un coup d'œil (refonte du 9 oct. 2026, remplace les 8 modèles
 * de tuiles de l'app). Libellé au-dessus, période comprise (« Encaissé · octobre »), valeur en gros
 * chiffres tabulaires, contexte dessous. La seule touche de couleur : une alerte, ou la variante héros
 * (charte « Glacier vif » du 19 oct. 2026 : dégradé glacier, chiffres bleu nuit, point orange du logo).
 *
 * @param {string} libelle
 * @param {string|number} valeur déjà formatée (src/lib/formatters.js)
 * @param {string} [contexte] ligne sous la valeur
 * @param {string} [alerte] remplace le contexte, en rouge avec une icône
 * @param {'danger'|'alerte'} [tonAlerte] rouge par défaut (« en retard ») ; 'alerte' : ambre, pour ce qui est « à surveiller »
 *   (une marge négative, un budget dépassé)
 * @param {boolean} [heros] une par écran au plus : fond glacier, valeur plus grande
 * @param {Function} [onClick] la tuile filtre ou ouvre quelque chose
 * @param {boolean} [actif] état pressé quand la tuile filtre une liste
 */
const TONS_ALERTE = { danger: 'text-danger-texte', alerte: 'text-alerte-texte' };

export default function TuileChiffre({ libelle, valeur, contexte, alerte, tonAlerte = 'danger', heros = false, onClick, actif, className = '' }) {
  const Element = onClick ? 'button' : 'div';
  return (
    <Element
      data-ui="TuileChiffre"
      {...(onClick ? { type: 'button', onClick, 'aria-pressed': actif === undefined ? undefined : !!actif } : {})}
      className={`min-w-0 flex flex-col gap-2 rounded-2xl text-left ${
        heros
          ? 'bg-degrade-vedette border border-vedette-bord text-vedette-valeur p-5 min-h-[112px] shadow-e1'
          : `bg-surface border p-4 min-h-[96px] shadow-e1 ${actif ? 'border-accent ring-2 ring-accent' : 'border-bord'}`
      } ${onClick ? 'transition-colors hover:border-bord-fort active:bg-surface-2' : ''} ${className}`}
    >
      <span className={`text-sm font-medium leading-tight ${heros ? 'flex items-center gap-2 text-vedette-libelle' : 'text-encre-2'}`}>
        {/* Point orange du logo, avec sa lueur : la seule touche chaude de la tuile (décoratif) */}
        {heros && <span aria-hidden="true" className="w-2 h-2 rounded-full bg-signature flex-shrink-0 shadow-[0_0_0_3px_rgb(var(--signature)/0.22),0_0_10px_rgb(var(--signature)/0.8)]" />}
        {libelle}
      </span>
      <span className={`font-bold tabular-nums tracking-tight leading-none truncate ${heros ? 'text-4xl' : 'text-2xl sm:text-3xl text-encre'}`}>
        {valeur}
      </span>
      {alerte ? (
        <span className={`mt-auto flex items-center gap-1.5 text-sm font-semibold ${TONS_ALERTE[tonAlerte] || TONS_ALERTE.danger}`}>
          <AlertTriangle size={16} aria-hidden="true" className="flex-shrink-0" />
          <span className="line-clamp-3">{alerte}</span>
        </span>
      ) : contexte ? (
        <span className={`mt-auto text-sm line-clamp-2 ${heros ? 'text-vedette-contexte' : 'text-encre-3'}`}>{contexte}</span>
      ) : null}
    </Element>
  );
}
