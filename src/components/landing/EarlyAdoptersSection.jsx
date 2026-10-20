/**
 * EarlyAdoptersSection — « Construit en public. » (spec de la refonte, section 8, `id="early-adopters"` : le pied de
 * page y mène par « Pourquoi Mallettico »).
 *
 * Remplace les faux avis par de la transparence (en inventer est interdit : C. consom. L121-2). Chaque phrase
 * est vérifiée dans le code ou les décisions du projet (relevé du 20 oct. 2026) :
 *   - Une ligne directe avec le créateur : le bouton « Un bug ? Une idée ? » du menu de l'application ouvre
 *     `RetourModal` : « Votre message arrive directement chez le créateur de Mallettico, qui vous répond ici »
 *     (table `retours`, migration 074, en production) ; la réponse s'affiche dans le même écran (`reponse`).
 *   - Vous voyez ce que devient votre idée : chaque retour a un statut visible de l'artisan, ceux de
 *     `STATUTS_RETOUR` (src/services/retoursService.js) ; le tri des retours qui nourrit la feuille de route est
 *     le rituel hebdomadaire de docs/organisation.md et du skill `retours`.
 *   - Un tarif fondateur garanti : décision D-08 (docs/decisions.md), « garanti tant que l'abonnement reste
 *     actif », rien de plus ; les prix sont lus dans `PLANS`.
 *   - Essayer sans carte bancaire : le plan Gratuit de `PLANS` n'a ni date de fin ni prix ; le formulaire
 *     d'inscription (App.jsx) ne demande que le nom de l'entreprise, l'e-mail et un mot de passe ; l'export est
 *     « Exporter toutes les données » de Réglages › Données (Settings.jsx : entreprise, devis et factures, clients,
 *     chantiers, dépenses), sans verrou de plan.
 * Retirés de l'ancienne version, faute de preuve : « réponse rapide », « pas de ticket perdu dans une file
 * d'attente », « votre prix n'augmentera pas, même quand les tarifs évolueront » (D-08 ne promet que « tant que
 * l'abonnement reste actif »), « zéro risque », « avantages qu'aucun logiciel établi ne peut offrir ».
 * Attributs `data-*` lus par le parcours `scripts/parcours/site.cjs`.
 */
import { ArrowRight, MessageSquare, ListChecks, Tag, ShieldCheck } from 'lucide-react';
import { PLANS, PLAN_ORDER } from '../../stores/subscriptionStore';
import { STATUTS_RETOUR } from '../../services/retoursService';
import { formatMoney } from '../../lib/formatters';
import SectionSite from './site/SectionSite';
import EnTeteSection from './site/EnTeteSection';
import Apparition from './site/Apparition';
import BoutonSite from './site/BoutonSite';
import PlanArchitecte from './site/PlanArchitecte';

/** Les plans qui portent l'offre de lancement, avec leur prix (lus dans `PLANS`). */
const PLANS_FONDATEUR = PLAN_ORDER.map((id) => PLANS[id]).filter((plan) => plan.offreLancement);

/** Les étiquettes sous la carte « retours » : les statuts que l'application affiche à l'artisan. */
const STATUTS = Object.values(STATUTS_RETOUR);

function Etiquettes({ nom, children }) {
  return (
    <ul aria-label={nom} className="mt-4 flex flex-wrap gap-2">
      {children}
    </ul>
  );
}

function Etiquette({ children }) {
  return (
    <li className="rounded-full border border-marque-acier bg-marque-glacier-1 px-3 py-1 text-xs font-semibold text-marque-ardoise">
      {children}
    </li>
  );
}

function Carte({ icone: Icone, titre, children, extra }) {
  return (
    <li data-carte-public="" className="flex gap-4 rounded-2xl border border-marque-acier/60 bg-white p-5 shadow-[0_18px_40px_-30px_rgba(13,46,108,0.5)] sm:p-6">
      <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-marque-glacier-2 text-marque-nuit-2">
        <Icone size={22} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <h3 className="text-lg font-bold leading-snug tracking-tight text-marque-nuit">{titre}</h3>
        <p className="mt-1.5 text-base leading-relaxed text-slate-700">{children}</p>
        {extra}
      </div>
    </li>
  );
}

export default function EarlyAdoptersSection({ onSignup }) {
  return (
    <SectionSite id="early-adopters" fond="glacier" decor={<PlanArchitecte ton="glacier" />}>
      <EnTeteSection titre="Construit en public.">
        Pas de faux avis ici. Les avis viendront des artisans qui utilisent Mallettico, avec leur accord.
      </EnTeteSection>

      <Apparition delai={0.1}>
        <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:gap-5">
          <Carte icone={MessageSquare} titre="Une ligne directe avec le créateur">
            Dans l'application, le bouton « Un bug ? Une idée ? » envoie votre message directement au créateur de
            Mallettico. Sa réponse s'affiche dans l'application.
          </Carte>

          <Carte
            icone={ListChecks}
            titre="Vous voyez ce que devient votre idée"
            extra={
              <Etiquettes nom="Les statuts d'un retour">
                {STATUTS.map((statut) => <Etiquette key={statut}>{statut}</Etiquette>)}
              </Etiquettes>
            }
          >
            Chaque retour envoyé depuis l'application a un statut que vous suivez. Les retours des artisans servent à
            décider de la suite.
          </Carte>

          <Carte
            icone={Tag}
            titre="Un tarif fondateur garanti"
            extra={
              <Etiquettes nom="Les plans au tarif fondateur">
                {PLANS_FONDATEUR.map((plan) => (
                  <Etiquette key={plan.id}>{`${plan.name} ${formatMoney(plan.priceMonthly)} HT par mois`}</Etiquette>
                ))}
              </Etiquettes>
            }
          >
            Le tarif fondateur est garanti tant que l'abonnement reste actif.
          </Carte>

          <Carte icone={ShieldCheck} titre="Essayer sans carte bancaire">
            Le plan Gratuit n'a pas de limite de durée et l'inscription ne demande pas de carte bancaire. Vos clients,
            devis, factures, chantiers et dépenses s'exportent dans un fichier depuis les réglages.
          </Carte>
        </ul>
      </Apparition>

      <Apparition delai={0.1}>
        <div className="mt-10">
          <BoutonSite variante="plein" onClick={onSignup} className="w-full sm:w-auto">
            Créer mon compte gratuit
            <ArrowRight size={18} aria-hidden="true" />
          </BoutonSite>
        </div>
      </Apparition>
    </SectionSite>
  );
}
