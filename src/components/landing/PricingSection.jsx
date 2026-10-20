/**
 * PricingSection — « Des prix simples, sans surprise. » (spec de la refonte, section 7, `id="pricing"`).
 *
 * Les trois plans de `PLAN_ORDER`, lus dans `PLANS` (src/stores/subscriptionStore.js, décision D-29) : le nom, le prix
 * mensuel hors taxes, l'offre de lancement et la liste `featureLabels`, sans rien ajouter ni retirer. Aucun prix, aucun
 * libellé n'est écrit ici ; le test d'honnêteté le vérifie. Pas de prix barré, pas de « populaire » : la carte Artisan
 * est seulement mise en avant (bordure bleu nuit, pastille lue dans `PLANS.artisan.badge`), les trois boutons mènent à
 * la même inscription (`onSignup`, le compte commence au plan Gratuit ; le plan payant se choisit dans l'application).
 * Tarif fondateur : « garanti tant que l'abonnement reste actif » (décision D-08), rien de plus. Le plan Gratuit, qui
 * n'a pas d'offre de lancement, dit à la place « Sans limite de durée, sans carte bancaire » : `PLANS.gratuit` n'a ni
 * date de fin ni prix, et le formulaire d'inscription (App.jsx) ne demande que l'entreprise, l'e-mail et un mot de passe.
 * Le tableau de comparaison est replié sous les cartes (`PricingComparisonTable`).
 *
 * Au bureau, les quatre blocs de chaque carte (titre et prix, tarif fondateur, liste, bouton) partagent les rangées de
 * la grille (`subgrid`) : prix, listes et boutons s'alignent d'une carte à l'autre. Sans `subgrid` (vieux navigateur),
 * les cartes s'empilent normalement, seul l'alignement se perd.
 * Attributs `data-*` lus par le parcours `scripts/parcours/site.cjs`.
 */
import { ArrowRight, Check } from 'lucide-react';
import { PLANS, PLAN_ORDER } from '../../stores/subscriptionStore';
import { formatMoney } from '../../lib/formatters';
import SectionSite from './site/SectionSite';
import EnTeteSection from './site/EnTeteSection';
import Apparition from './site/Apparition';
import BoutonSite from './site/BoutonSite';
import PricingComparisonTable from './PricingComparisonTable';

const POINT_ORANGE = 'h-2 w-2 shrink-0 rounded-full bg-marque-orange shadow-[0_0_0_3px_rgba(238,123,32,0.2),0_0_10px_rgba(238,123,32,0.8)]';

/** La carte mise en avant : celle du plan que `PLANS` décrit comme « pour un artisan seul ». */
const PLAN_MIS_EN_AVANT = 'artisan';

function CartePlan({ plan, onSignup }) {
  const miseEnAvant = plan.id === PLAN_MIS_EN_AVANT;
  const payant = plan.priceMonthly > 0;
  return (
    <article
      data-plan={plan.id}
      className={`relative flex flex-col rounded-3xl bg-white lg:row-span-4 lg:grid lg:grid-rows-subgrid ${
        // Bordure de 2 px : 1 px de marge en moins, pour que le contenu reste aligné sur les autres cartes
        miseEnAvant
          ? 'border-2 border-marque-nuit-2 p-[1.4375rem] shadow-[0_30px_60px_-34px_rgba(13,46,108,0.65)] sm:p-[1.6875rem]'
          : 'border border-marque-acier/60 p-6 shadow-[0_20px_44px_-34px_rgba(13,46,108,0.45)] sm:p-7'
      }`}
    >
      {miseEnAvant && plan.badge ? (
        <p
          data-badge=""
          className="absolute -top-3.5 left-6 inline-flex items-center gap-2 rounded-full bg-marque-nuit-2 px-3.5 py-1 text-xs font-bold tracking-wide text-white"
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-marque-orange shadow-[0_0_8px_rgba(238,123,32,0.9)]" />
          {plan.badge}
        </p>
      ) : null}

      <div>
        <h3 className="text-xl font-bold tracking-tight text-marque-nuit">{plan.name}</h3>
        <p className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span data-prix="" className="whitespace-nowrap text-5xl font-extrabold lg:text-[2.5rem] xl:text-5xl leading-none tracking-[-0.03em] tabular-nums text-marque-nuit">
            {formatMoney(plan.priceMonthly)}
          </span>
          <span data-unite="" className="text-sm text-slate-600">
            {payant ? 'HT par mois' : 'par mois'}
          </span>
        </p>
      </div>

      {plan.offreLancement ? (
        <p data-fondateur="" className="mt-4 flex items-start gap-2.5 text-sm leading-snug text-marque-ardoise">
          <span aria-hidden="true" className={`mt-[5px] ${POINT_ORANGE}`} />
          <span>
            <strong className="font-bold text-marque-nuit">{plan.offreLancement}</strong>, garanti tant que l'abonnement reste actif
          </span>
        </p>
      ) : (
        <p data-sans-limite="" className="mt-4 flex items-start gap-2.5 text-sm leading-snug text-marque-ardoise">
          <span aria-hidden="true" className={`mt-[5px] ${POINT_ORANGE}`} />
          <span>
            <strong className="font-bold text-marque-nuit">Sans limite de durée</strong>, sans carte bancaire
          </span>
        </p>
      )}

      <ul className="mt-6 flex flex-col gap-3 border-t border-marque-acier/50 pt-6">
        {plan.featureLabels.map((f) => (
          <li key={f.name} className="flex items-start gap-3 text-[15px] leading-snug text-slate-700">
            <span aria-hidden="true" className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-marque-glacier-2 text-marque-nuit-2">
              <Check size={13} strokeWidth={3.5} />
            </span>
            {f.name}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <BoutonSite variante={miseEnAvant ? 'plein' : 'contour'} onClick={onSignup} className="w-full">
          {payant ? 'Créer mon compte' : 'Créer mon compte gratuit'}
          <ArrowRight size={18} aria-hidden="true" />
        </BoutonSite>
      </div>
    </article>
  );
}

export default function PricingSection({ onSignup }) {
  return (
    <SectionSite id="pricing" fond="blanc">
      <EnTeteSection titre="Des prix simples, sans surprise.">
        Les prix sont indiqués hors taxes, par mois. Commencez gratuitement, passez à un plan payant quand vous en avez
        besoin.
      </EnTeteSection>

      <Apparition delai={0.1}>
        <div className="mt-12 grid gap-8 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-0">
          {PLAN_ORDER.map((id) => (
            <CartePlan key={id} plan={PLANS[id]} onSignup={onSignup} />
          ))}
        </div>
      </Apparition>

      <p data-note-inscription="" className="mt-8 max-w-[48em] text-sm leading-relaxed text-slate-600">
        Votre compte commence au plan Gratuit ; vous passez à un plan payant depuis l'application, quand vous le
        souhaitez.
      </p>

      <PricingComparisonTable />
    </SectionSite>
  );
}
