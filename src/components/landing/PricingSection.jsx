/**
 * PricingSection — « Des prix simples, sans surprise. » (spec de la refonte, section 7, `id="pricing"`).
 *
 * Les trois plans de `PLAN_ORDER`, lus dans `PLANS` (src/stores/subscriptionStore.js, décision D-29) : le nom, le prix
 * mensuel, l'offre de lancement et la liste `featureLabels`, sans rien ajouter ni retirer. Aucun prix, aucun
 * libellé n'est écrit ici ; le test d'honnêteté le vérifie. Les prix se lisent par `prixAbonnement` et se disent en
 * franchise de TVA (décision D-19) : « TVA non applicable, art. 293 B du CGI », jamais « HT ». Pas de prix barré,
 * pas de « populaire » : la carte Artisan est seulement mise en avant (bordure bleu nuit, pastille lue dans
 * `PLANS.artisan.badge`), les trois boutons mènent à la même inscription (`onSignup`, le compte commence au plan
 * Gratuit ; le plan payant se choisit dans « Mon plan »).
 * Tarif fondateur : « garanti tant que l'abonnement reste actif » (décision D-08), rien de plus. Le plan Gratuit, qui
 * n'a pas d'offre de lancement, dit à la place « Sans limite de durée, sans carte bancaire » : `PLANS.gratuit` n'a ni
 * date de fin ni prix, et le formulaire d'inscription (App.jsx) ne demande que l'entreprise, l'e-mail et un mot de passe.
 * L'offre annuelle (`priceYearly`, vendue par `subscription-billing`) est dite en une ligne sous les cartes, sans
 * bascule ni remise annoncée : sa présentation commerciale reste à décider.
 * Le tableau de comparaison est replié sous les cartes (`PricingComparisonTable`).
 *
 * Chaque carte se lit de haut en bas : nom et prix, tarif fondateur, bouton, puis la liste. Le bouton est sous le prix
 * (et non en bas de carte) : trois listes de longueurs différentes laisseraient un grand vide au milieu des cartes
 * courtes ; les cartes gardent chacune leur hauteur, alignées par le haut.
 * Attributs `data-*` lus par le parcours `scripts/parcours/site.cjs`.
 */
import { ArrowRight, Check } from 'lucide-react';
import { PLANS, PLAN_ORDER } from '../../stores/subscriptionStore';
import { MENTION_TVA_ABONNEMENT, prixAbonnement } from '../../stores/prixAbonnement';
import SectionSite from './site/SectionSite';
import EnTeteSection from './site/EnTeteSection';
import Apparition from './site/Apparition';
import BoutonSite from './site/BoutonSite';
import PricingComparisonTable from './PricingComparisonTable';
import { libelleAffiche } from './comparaisonPlans';

const POINT_ORANGE = 'h-2 w-2 shrink-0 rounded-full bg-marque-orange shadow-[0_0_0_3px_rgba(238,123,32,0.2),0_0_10px_rgba(238,123,32,0.8)]';

/** La carte mise en avant : celle du plan que `PLANS` décrit comme « pour un artisan seul ». */
const PLAN_MIS_EN_AVANT = 'artisan';

/** Les plans vendus à l'année, avec leur prix annuel lu dans `PLANS`. */
const PLANS_A_L_ANNEE = PLAN_ORDER.map((id) => PLANS[id]).filter((plan) => plan.priceYearly > 0);

function CartePlan({ plan, onSignup }) {
  const miseEnAvant = plan.id === PLAN_MIS_EN_AVANT;
  const payant = plan.priceMonthly > 0;
  return (
    <article
      data-plan={plan.id}
      className={`relative flex flex-col rounded-3xl bg-white ${
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

      <h3 className="text-xl font-bold tracking-tight text-marque-nuit">{plan.name}</h3>
      <p className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span data-prix="" className="whitespace-nowrap text-5xl font-extrabold leading-none tracking-[-0.03em] tabular-nums text-marque-nuit lg:text-[2.5rem] xl:text-5xl">
          {prixAbonnement(plan)}
        </span>
        <span data-unite="" className="text-sm text-slate-600">par mois</span>
      </p>

      {/* Tarif fondateur (plans payants) ou, pour le plan Gratuit, ce qu'il garantit : la même rangée, la même hauteur */}
      {plan.offreLancement ? (
        <p data-fondateur="" className="mt-4 flex items-start gap-2.5 text-sm leading-snug text-marque-ardoise lg:min-h-[2.75rem]">
          <span aria-hidden="true" className={`mt-[5px] ${POINT_ORANGE}`} />
          <span>
            <strong className="font-bold text-marque-nuit">{plan.offreLancement}</strong>, garanti tant que l'abonnement reste actif
          </span>
        </p>
      ) : (
        <p data-sans-limite="" className="mt-4 flex items-start gap-2.5 text-sm leading-snug text-marque-ardoise lg:min-h-[2.75rem]">
          <span aria-hidden="true" className={`mt-[5px] ${POINT_ORANGE}`} />
          <span>
            <strong className="font-bold text-marque-nuit">Sans limite de durée</strong>, sans carte bancaire
          </span>
        </p>
      )}

      <div className="mt-6">
        <BoutonSite variante={miseEnAvant ? 'plein' : 'contour'} onClick={onSignup} className="w-full">
          {payant ? 'Créer mon compte' : 'Créer mon compte gratuit'}
          <ArrowRight size={18} aria-hidden="true" />
        </BoutonSite>
      </div>

      <ul className="mt-6 flex flex-col gap-3 border-t border-marque-acier/50 pt-6">
        {plan.featureLabels.map((f) => (
          <li key={f.name} className="flex items-start gap-3 text-[15px] leading-snug text-slate-700">
            <span aria-hidden="true" className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-marque-glacier-2 text-marque-nuit-2">
              <Check size={13} strokeWidth={3.5} />
            </span>
            {libelleAffiche(f.name)}
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function PricingSection({ onSignup }) {
  return (
    <SectionSite id="pricing" fond="blanc">
      <EnTeteSection titre="Des prix simples, sans surprise.">
        {`Prix par mois — ${MENTION_TVA_ABONNEMENT}. Commencez gratuitement, passez à un plan payant quand vous en avez besoin.`}
      </EnTeteSection>

      <Apparition delai={0.1}>
        <div className="mt-12 grid gap-8 lg:grid-cols-3 lg:items-start lg:gap-6">
          {PLAN_ORDER.map((id) => (
            <CartePlan key={id} plan={PLANS[id]} onSignup={onSignup} />
          ))}
        </div>
      </Apparition>

      <p data-annuel="" className="mt-8 max-w-[48em] text-sm leading-relaxed text-slate-600">
        {`Aussi à l'année : ${PLANS_A_L_ANNEE.map((plan) => `${prixAbonnement(plan, 'an')} pour ${plan.name}`).join(', ')}. ${MENTION_TVA_ABONNEMENT}.`}
      </p>
      <p data-note-inscription="" className="mt-2 max-w-[48em] text-sm leading-relaxed text-slate-600">
        Votre compte commence au plan Gratuit ; vous passez à un plan payant depuis « Mon plan », quand vous le
        souhaitez.
      </p>

      <PricingComparisonTable />
    </SectionSite>
  );
}
