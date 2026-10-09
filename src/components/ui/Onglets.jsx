import { useEffect, useRef } from 'react';

/**
 * Navigation dans un écran — refonte du 9 oct. 2026 (6 formes d'onglets remplacées par 2).
 *
 * Onglets : changer de vue sur un même objet (fiche chantier : Aperçu, Documents…). Trait d'accent
 * sous l'onglet actif, libellés toujours écrits, la rangée défile et garde l'actif en vue.
 * Segmente : changer de période ou de mode (Mois / Semaine, Mensuel / Annuel), 4 options au plus.
 * Jamais rempli d'accent : l'accent signale l'action, pas l'état.
 */
export function Onglets({ onglets, actif, onChange, ariaLabel, className = '' }) {
  const rangeeRef = useRef(null);
  useEffect(() => {
    const el = rangeeRef.current?.querySelector('[aria-selected="true"]');
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [actif]);
  return (
    <div
      ref={rangeeRef}
      role="tablist"
      aria-label={ariaLabel}
      data-ui="Onglets"
      className={`flex gap-5 overflow-x-auto scrollbar-hide border-b border-bord ${className}`}
    >
      {onglets.map((o) => {
        const oui = o.id === actif;
        const Icone = o.icone;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={oui}
            onClick={() => onChange(o.id)}
            className={`relative h-12 flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
              oui ? 'text-encre' : 'text-encre-3 hover:text-encre-2'
            }`}
          >
            {Icone ? <Icone size={16} aria-hidden="true" className="hidden md:block" /> : null}
            {o.libelle}
            {o.compte > 0 ? <span className="text-sm text-encre-3 tabular-nums">{o.compte}</span> : null}
            <span aria-hidden="true" className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full ${oui ? 'bg-accent' : 'bg-transparent'}`} />
          </button>
        );
      })}
    </div>
  );
}

export function Segmente({ options, valeur, onChange, ariaLabel, pleineLargeur = false, className = '' }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-ui="Segmente"
      className={`${pleineLargeur ? 'flex w-full' : 'inline-flex'} h-11 p-1 rounded-xl bg-surface-2 ${className}`}
    >
      {options.map((o) => {
        const oui = o.valeur === valeur;
        return (
          <button
            key={String(o.valeur)}
            type="button"
            aria-pressed={oui}
            onClick={() => onChange(o.valeur)}
            className={`cible-compacte ${pleineLargeur ? 'flex-1' : ''} px-3.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              oui ? 'bg-surface text-encre shadow-e1' : 'text-encre-2 hover:text-encre'
            }`}
          >
            {o.libelle}
          </button>
        );
      })}
    </div>
  );
}
