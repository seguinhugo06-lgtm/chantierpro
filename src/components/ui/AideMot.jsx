import { useId, useState } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * AideMot — un mot difficile expliqué à la demande (retours d'Hugo, 21-23 oct. 2026 : APE, TVA intracommunautaire, EI…).
 * Un bouton « ? » de 44 px à côté du libellé ouvre la phrase juste dessous, dans le flux de la page : rien à viser au
 * survol, rien qui sorte de l'écran, la même chose au clavier, à la souris et au toucher. Un second appui la referme.
 *
 * @param {string} mot ce qu'annonce le bouton (« Qu'est-ce que le SIRET ? »)
 * @param {string} texte la phrase d'explication (src/lib/lexique.js)
 * @param {React.ReactNode} children le libellé ou le titre à côté duquel se pose le bouton
 * @param {React.ReactNode} [fin] posé au bout de la même ligne (état d'enregistrement d'un champ)
 */
export default function AideMot({ mot, texte, children, fin = null, className = '' }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  return (
    <div data-ui="AideMot" className={className}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-0.5 min-w-0">
          {children}
          <button
            type="button"
            onClick={() => setOuvert((o) => !o)}
            aria-expanded={ouvert}
            aria-controls={id}
            aria-label={`Qu'est-ce que ${mot} ?`}
            title={`Qu'est-ce que ${mot} ?`}
            className="inline-flex items-center justify-center w-11 h-11 -my-3 rounded-full flex-shrink-0 text-encre-3 hover:text-encre focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-accent"
          >
            <HelpCircle size={17} aria-hidden="true" />
          </button>
        </div>
        {fin ? <span className="flex-shrink-0">{fin}</span> : null}
      </div>
      {/* Toujours dans la page (masquée) : aria-controls désigne un élément qui existe */}
      <p id={id} hidden={!ouvert} data-aide-texte="" className="mt-1.5 px-3 py-2 rounded-xl bg-surface-2 text-sm text-encre-2">{texte}</p>
    </div>
  );
}
