/**
 * PricingComparisonTable — « Comparer les plans en détail » : le tableau des plans, replié par défaut.
 *
 * Toutes les lignes sont construites depuis `PLANS` (`comparaisonPlans.js`, décision D-29) : d'abord les limites
 * réellement appliquées par l'application (devis par mois, clients, chantiers, photos, collaborateurs), puis les
 * fonctions annoncées par les `featureLabels`. Aucune ligne n'est écrite ici.
 *
 * Replié : le bouton (`aria-expanded`, `aria-controls`) désigne un panneau qui existe toujours mais reste caché
 * (`hidden`) ; ouvert, le contenu apparaît en fondu (`Apparition`, sans mouvement si l'appareil demande moins
 * d'animation) et le focus reste sur le bouton. Le libellé du bouton ne change pas : l'état est dit par `aria-expanded`.
 *
 * Deux présentations des mêmes lignes, une seule affichée :
 *   - dès 640 px, un vrai tableau (une colonne par plan) ; si la fenêtre est trop étroite pour un libellé, son
 *     conteneur défile horizontalement (région nommée, au clavier) et la colonne des libellés reste fixe ;
 *   - sur téléphone, une liste : chaque ligne porte son libellé, puis la valeur de chacun des trois plans côte à côte.
 *     Trois colonnes de 70 px ne laissent pas de place à des libellés de 55 caractères.
 * Jamais de défilement horizontal de la page. Une case dit sa valeur en texte, jamais par le seul symbole :
 * « Inclus », « Non annoncé » (texte hors écran).
 * Attributs `data-*` lus par le parcours `scripts/parcours/site.cjs` (les deux présentations les portent).
 */
import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { PLANS, PLAN_ORDER } from '../../stores/subscriptionStore';
import BoutonSite from './site/BoutonSite';
import Apparition from './site/Apparition';
import { lignesDeComparaison } from './comparaisonPlans';

/** Les lignes ne dépendent que de `PLANS` : calculées une fois. */
const TABLEAU = lignesDeComparaison(PLANS, PLAN_ORDER);

/** Les deux groupes, dans l'ordre : limites puis fonctions. `valeur` : texte (limite) ou booléen (fonction). */
const GROUPES = [
  { titre: 'Limites', lignes: TABLEAU.limites.map((l) => ({ id: l.cle, libelle: l.libelle, valeurs: l.valeurs })) },
  { titre: 'Fonctions', lignes: TABLEAU.fonctions.map((f) => ({ id: f.libelle, libelle: f.libelle, valeurs: f.inclus })) },
];

const ID_PANNEAU = 'comparaison-plans';
const BORDURE = 'border-b border-marque-acier/40';
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marque-nuit-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

/** Le contenu d'une case : la valeur d'une limite, ou le symbole « inclus » / « non annoncé » doublé d'un texte. */
function Valeur({ valeur }) {
  if (typeof valeur === 'string') return valeur;
  return (
    <>
      {valeur ? (
        <Check aria-hidden="true" size={18} strokeWidth={3} className="inline-block align-middle text-marque-nuit-2" />
      ) : (
        <span aria-hidden="true" className="text-slate-600">—</span>
      )}
      <span className="sr-only">{valeur ? 'Inclus' : 'Non annoncé'}</span>
    </>
  );
}

const attributsDeCase = (valeur, plan) => ({
  'data-case': '',
  'data-plan-nom': plan.nom,
  'data-inclus': typeof valeur === 'boolean' ? (valeur ? 'oui' : 'non') : undefined,
});

/** Dès 640 px : le tableau. */
function Tableau() {
  const colonnes = TABLEAU.plans.length + 1;
  return (
    <div className="hidden sm:block" data-rendu="tableau">
      <div
        data-defilement=""
        role="region"
        aria-label="Comparaison des plans"
        tabIndex={0}
        className={`overflow-x-auto ${FOCUS} focus-visible:ring-inset`}
      >
        <table className="w-full border-separate border-spacing-0 text-left">
          <caption className="sr-only">Comparaison des plans : limites et fonctions</caption>
          <thead>
            <tr>
              <th scope="col" className={`sticky left-0 z-10 bg-white px-5 py-4 ${BORDURE}`}>
                <span className="sr-only">Limite ou fonction</span>
              </th>
              {TABLEAU.plans.map((plan) => (
                <th key={plan.id} scope="col" data-entete="" className={`bg-white px-4 py-4 text-center text-base font-bold text-marque-nuit ${BORDURE}`}>
                  {plan.nom}
                </th>
              ))}
            </tr>
          </thead>
          {GROUPES.map((groupe) => (
            <tbody key={groupe.titre}>
              <tr>
                <th
                  scope="rowgroup"
                  colSpan={colonnes}
                  data-groupe-titre=""
                  className="bg-marque-glacier-1 px-5 py-2.5 text-left text-xs font-bold uppercase tracking-[0.08em] text-marque-ardoise"
                >
                  {groupe.titre}
                </th>
              </tr>
              {groupe.lignes.map((ligne) => (
                <tr key={ligne.id} data-ligne="" data-groupe={groupe.titre}>
                  <th
                    scope="row"
                    data-libelle=""
                    className={`sticky left-0 z-10 w-[40%] bg-white px-5 py-3.5 text-left text-sm font-medium leading-snug text-slate-800 ${BORDURE}`}
                  >
                    {ligne.libelle}
                  </th>
                  {ligne.valeurs.map((valeur, i) => (
                    <td
                      key={TABLEAU.plans[i].id}
                      {...attributsDeCase(valeur, TABLEAU.plans[i])}
                      className={`px-4 py-3.5 text-center text-sm font-semibold tabular-nums text-slate-800 ${BORDURE}`}
                    >
                      <Valeur valeur={valeur} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}

/** Sur téléphone : une liste, le libellé puis les trois plans côte à côte. */
function Liste() {
  return (
    <div className="sm:hidden" data-rendu="liste">
      {GROUPES.map((groupe) => (
        <section key={groupe.titre}>
          <h3 data-groupe-titre="" className="bg-marque-glacier-1 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-marque-ardoise">
            {groupe.titre}
          </h3>
          <ul>
            {groupe.lignes.map((ligne) => (
              <li key={ligne.id} data-ligne="" data-groupe={groupe.titre} className={`px-4 py-3.5 last:border-b-0 ${BORDURE}`}>
                <p data-libelle="" className="text-sm font-medium leading-snug text-slate-800">{ligne.libelle}</p>
                <dl className="mt-2.5 grid grid-cols-3 gap-2">
                  {ligne.valeurs.map((valeur, i) => (
                    <div key={TABLEAU.plans[i].id}>
                      <dt data-entete="" className="text-xs text-slate-600">{TABLEAU.plans[i].nom}</dt>
                      <dd
                        {...attributsDeCase(valeur, TABLEAU.plans[i])}
                        className="mt-0.5 flex min-h-[1.5rem] items-center text-sm font-semibold tabular-nums text-slate-800"
                      >
                        <Valeur valeur={valeur} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function PricingComparisonTable() {
  const [ouvert, setOuvert] = useState(false);

  return (
    <div className="mt-10">
      <BoutonSite
        variante="contour"
        aria-expanded={ouvert}
        aria-controls={ID_PANNEAU}
        onClick={() => setOuvert((o) => !o)}
      >
        Comparer les plans en détail
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`transition-transform duration-200 motion-reduce:transition-none ${ouvert ? 'rotate-180' : ''}`}
        />
      </BoutonSite>

      <div id={ID_PANNEAU} hidden={!ouvert}>
        <Apparition className="mt-6">
          <div className="overflow-hidden rounded-3xl border border-marque-acier/60 bg-white shadow-[0_20px_44px_-34px_rgba(13,46,108,0.45)]">
            <Tableau />
            <Liste />
          </div>
          <p data-note-tableau="" className="mt-4 max-w-[48em] text-sm leading-relaxed text-slate-600">
            Les limites sont celles que l'application applique aujourd'hui. Un tiret signale une fonction que le plan
            n'annonce pas.
          </p>
        </Apparition>
      </div>
    </div>
  );
}
