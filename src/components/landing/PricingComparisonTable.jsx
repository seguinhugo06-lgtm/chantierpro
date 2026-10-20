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
 *   - dès 640 px, un vrai tableau (une colonne par plan) dont l'en-tête reste collé sous la barre fixe quand on le
 *     parcourt. Il tient dans la largeur ; si un libellé l'élargissait quand même, son conteneur défile
 *     horizontalement (région nommée, au clavier seulement alors, libellés fixes) : un conteneur qui défile ne laisse
 *     plus coller l'en-tête à la fenêtre, c'est le prix de ce cas rare. Le cadre arrondi coupe avec `overflow-clip` :
 *     `overflow-hidden` ferait de lui un conteneur de défilement et l'en-tête ne collerait plus ;
 *   - sur téléphone, une liste : chaque ligne porte son libellé, puis la valeur de chacun des trois plans côte à côte.
 *     Trois colonnes de 70 px ne laissent pas de place à des libellés de 55 caractères.
 * Jamais de défilement horizontal de la page. Une case dit sa valeur en texte, jamais par le seul symbole :
 * « Inclus », et « Non annoncé » (texte hors écran) pour une fonction qu'un plan n'annoncerait pas : avec les plans
 * d'aujourd'hui, toutes les fonctions sont dans tous les plans : pas de tiret, et la note du bas ne garde que sa
 * phrase sur les limites ; si `PLANS` annonçait un jour une fonction pour un seul plan, le tiret et la phrase qui
 * l'explique reviendraient d'eux-mêmes.
 * Attributs `data-*` lus par le parcours `scripts/parcours/site.cjs` (les deux présentations les portent).
 */
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { PLANS, PLAN_ORDER } from '../../stores/subscriptionStore';
import BoutonSite from './site/BoutonSite';
import Apparition from './site/Apparition';
import { FOCUS } from './site/focus';
import { fonctionsCommunes, libelleAffiche, lignesDeComparaison } from './comparaisonPlans';

/** Les lignes ne dépendent que de `PLANS` : calculées une fois. */
const TABLEAU = lignesDeComparaison(PLANS, PLAN_ORDER);

/** Une fonction absente d'un plan se lit par un tiret : seulement dans ce cas, une note l'explique. */
const A_DES_TIRETS = TABLEAU.fonctions.some((f) => f.inclus.includes(false));

/**
 * Une fonction présente dans tous les plans ne compare rien : pas de ligne (quatre lignes de trois coches
 * occupaient 450 px au téléphone), elle est dite sous le tableau, « Dans tous les plans : … » (passe de finition, DA-16).
 */
const COMMUNES = fonctionsCommunes(TABLEAU);
const DISTINCTES = TABLEAU.fonctions.filter((f) => !COMMUNES.includes(f.libelle));

/** Les groupes, dans l'ordre : limites puis fonctions qui distinguent les plans (s'il y en a). `valeur` : texte (limite)
 * ou booléen (fonction). */
const GROUPES = [
  { titre: 'Limites', lignes: TABLEAU.limites.map((l) => ({ id: l.cle, libelle: l.libelle, valeurs: l.valeurs })) },
  { titre: 'Fonctions', lignes: DISTINCTES.map((f) => ({ id: f.libelle, libelle: f.libelle, valeurs: f.inclus })) },
].filter((g) => g.lignes.length > 0);

const ID_PANNEAU = 'comparaison-plans';
const BORDURE = 'border-b border-marque-acier/40';

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

/**
 * Dès 640 px : le tableau. Le conteneur ne défile (et ne prend le focus) que s'il déborde réellement : mesuré à
 * l'affichage et à chaque changement de taille.
 */
function Tableau() {
  const zone = useRef(null);
  // Sans ResizeObserver (vieux navigateur), rien ne se mesure : le conteneur défile d'office, le tableau reste lisible
  const [deborde, setDeborde] = useState(() => typeof ResizeObserver === 'undefined');

  useEffect(() => {
    const element = zone.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const mesurer = () => setDeborde(element.scrollWidth > element.clientWidth + 1);
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(element);
    if (element.firstElementChild) observateur.observe(element.firstElementChild);
    return () => observateur.disconnect();
  }, []);

  const colonnes = TABLEAU.plans.length + 1;
  return (
    <div className="hidden sm:block" data-rendu="tableau">
      <div
        ref={zone}
        data-defilement=""
        data-deborde={deborde ? 'oui' : 'non'}
        role="region"
        aria-label="Comparaison des plans"
        tabIndex={deborde ? 0 : undefined}
        className={deborde ? `overflow-x-auto ${FOCUS} focus-visible:ring-inset` : undefined}
      >
        <table className="w-full border-separate border-spacing-0 text-left">
          <caption className="sr-only">Comparaison des plans : limites et fonctions</caption>
          <thead>
            <tr>
              <th scope="col" className={`sticky left-0 top-16 z-30 bg-white px-5 py-4 ${BORDURE}`}>
                <span className="sr-only">Limite ou fonction</span>
              </th>
              {TABLEAU.plans.map((plan) => (
                <th key={plan.id} scope="col" data-entete="" className={`sticky top-16 z-20 bg-white px-4 py-4 text-center text-base font-bold text-marque-nuit ${BORDURE}`}>
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
                    {libelleAffiche(ligne.libelle)}
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
                <p data-libelle="" className="text-sm font-medium leading-snug text-slate-800">{libelleAffiche(ligne.libelle)}</p>
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
          {/* `overflow-clip` et non `overflow-hidden` : pas de conteneur de défilement, l'en-tête du tableau peut coller.
              Repli pour Safari avant 16 (qui ignore `clip` et laisserait déborder les coins carrés des cases) :
              `overflow-hidden` d'abord, remplacé par `clip` là où il existe ; l'en-tête n'y colle plus, le tableau reste
              propre et lisible. La liste du téléphone n'a rien de collant : `overflow-hidden` partout. */}
          <div className="overflow-hidden rounded-3xl border border-marque-acier/60 bg-white shadow-[0_20px_44px_-34px_rgba(13,46,108,0.45)] sm:supports-[overflow:clip]:overflow-clip">
            <Tableau />
            <Liste />
          </div>
          {COMMUNES.length ? (
            <p data-communes="" className="mt-4 max-w-[48em] text-sm leading-relaxed text-slate-700">
              <span className="font-semibold text-marque-nuit">Dans tous les plans{' '}:</span>{' '}
              {COMMUNES.map(libelleAffiche).join(' · ')}
            </p>
          ) : null}
          <p data-note-tableau="" className="mt-2 max-w-[48em] text-sm leading-relaxed text-slate-600">
            Les limites sont celles que l’application applique aujourd’hui.
            {A_DES_TIRETS ? " Un tiret signale une fonction que le plan n’annonce pas." : ''}
          </p>
        </Apparition>
      </div>
    </div>
  );
}
