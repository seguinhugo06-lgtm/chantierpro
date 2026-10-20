import { ChevronDown } from 'lucide-react';
import { FOCUS } from './focus';

/**
 * Question — une question d'accordéon du site public (FAQ de l'accueil, questions des pages de fonctionnalités), dans
 * une liste `<ul>`.
 *
 * La question est un bouton `aria-expanded` dans un titre (`niveau`, h3 par défaut), relié à sa réponse par
 * `aria-controls`. La réponse est toujours rendue (l'élément que désigne `aria-controls` existe) ; fermée, elle est
 * invisible (`visibility: hidden` : ni lue ni atteinte au clavier). Elle se déplie en hauteur (grille 0fr → 1fr), sans
 * mouvement si l'appareil en demande moins. `id` : identifiant unique de la question dans la page.
 * `data-question`, `data-reponse` : lus par le parcours `scripts/parcours/site.cjs`.
 */
export function Question({ id, question, reponse, ouverte, onBasculer, niveau = 3, cachee = false }) {
  const Titre = `h${niveau}`;
  const idBouton = `${id}-question`;
  const idReponse = `${id}-reponse`;
  return (
    // `cachee` : hors de la vue sous 1024 px (la FAQ de l'accueil en montre six, puis « Voir les N autres questions »)
    <li className={`rounded-2xl border border-marque-acier/60 bg-white shadow-[0_14px_32px_-28px_rgba(13,46,108,0.5)]${cachee ? ' hidden lg:block' : ''}`}>
      <Titre className="m-0">
        <button
          type="button"
          id={idBouton}
          data-question=""
          aria-expanded={ouverte}
          aria-controls={idReponse}
          onClick={onBasculer}
          className={`flex min-h-[56px] w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left text-base font-semibold leading-snug text-marque-nuit transition-colors hover:bg-marque-glacier-1 motion-reduce:transition-none sm:px-6 ${FOCUS}`}
        >
          {question}
          <ChevronDown
            size={20}
            aria-hidden="true"
            className={`shrink-0 text-marque-ardoise transition-transform duration-200 motion-reduce:transition-none ${ouverte ? 'rotate-180' : ''}`}
          />
        </button>
      </Titre>
      {/* Pas de `role="region"` : une région par réponse alourdirait la liste des repères du lecteur d'écran ; le bouton
          (`aria-expanded`, `aria-controls`) suffit à relier la question et sa réponse. */}
      <div
        id={idReponse}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          ouverte ? 'grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <p data-reponse="" className="px-5 pb-5 text-base leading-relaxed text-slate-700 sm:px-6">
            {reponse}
          </p>
        </div>
      </div>
    </li>
  );
}

export default Question;
