import { ChevronRight } from 'lucide-react';

/**
 * LigneListe — le motif des listes (devis, factures, clients, chantiers) : refonte du 9 oct. 2026.
 * Début (avatar ou icône) · titre 16 px + méta 14 px · fin (montant, pastille) · chevron.
 * La ligne entière est un bouton (44 px et plus) ; une action secondaire libellée peut s'ajouter
 * dessous (`pied`), en dehors du bouton principal pour ne pas imbriquer deux boutons.
 *
 * @param {React.ReactNode} [debut]
 * @param {React.ReactNode} titre
 * @param {React.ReactNode} [meta]
 * @param {React.ReactNode} [montant] valeur déjà formatée, chiffres tabulaires
 * @param {React.ReactNode} [pastille]
 * @param {React.ReactNode} [pied] ligne d'action sous la ligne (urgence à gauche, bouton à droite)
 * @param {Function} [onClick]
 * @param {boolean} [chevron]
 */
export default function LigneListe({ debut, titre, meta, montant, pastille, pied, onClick, chevron = true, className = '', ...reste }) {
  const Corps = onClick ? 'button' : 'div';
  return (
    <div data-ui="LigneListe" className={`bg-surface ${className}`} {...reste}>
      <Corps
        {...(onClick ? { type: 'button', onClick } : {})}
        className={`w-full min-h-[64px] flex items-center gap-3 px-4 py-3 text-left ${onClick ? 'transition-colors hover:bg-surface-2/60 active:bg-surface-2' : ''}`}
      >
        {debut ? <span className="flex-shrink-0">{debut}</span> : null}
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-base font-semibold text-encre truncate">{titre}</span>
            {montant !== undefined && montant !== null ? (
              <span className="text-base font-bold text-encre tabular-nums whitespace-nowrap flex-shrink-0">{montant}</span>
            ) : null}
          </span>
          {meta || pastille ? (
            <span className="mt-1 flex items-center justify-between gap-3">
              <span className="text-sm text-encre-2 truncate min-w-0">{meta}</span>
              {pastille ? <span className="flex-shrink-0">{pastille}</span> : null}
            </span>
          ) : null}
        </span>
        {onClick && chevron ? <ChevronRight size={18} aria-hidden="true" className="flex-shrink-0 text-encre-3 -mr-1" /> : null}
      </Corps>
      {pied ? <div className="flex items-center justify-between gap-3 px-4 pb-3 -mt-1">{pied}</div> : null}
    </div>
  );
}

/** Avatar neutre d'initiales (une seule teinte : les dégradés aléatoires ne voulaient rien dire). */
export function Avatar({ nom = '', taille = 44 }) {
  const mots = String(nom).trim().split(/\s+/).filter(Boolean);
  const initiales = mots.length ? (mots[0][0] + (mots[1]?.[0] || '')).toUpperCase() : '?';
  return (
    <span
      data-ui="Avatar"
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-full bg-surface-2 text-encre-2 font-semibold"
      style={{ width: taille, height: taille, fontSize: Math.max(12, Math.round(taille * 0.34)) }}
    >
      {initiales}
    </span>
  );
}

/** Liste groupée dans une carte, séparateurs fins. */
export function GroupeListe({ children, className = '' }) {
  return (
    <div data-ui="GroupeListe" className={`bg-surface border border-bord rounded-2xl shadow-e1 overflow-hidden divide-y divide-bord ${className}`}>
      {children}
    </div>
  );
}
