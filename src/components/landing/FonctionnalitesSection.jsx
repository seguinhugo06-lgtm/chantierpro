/**
 * FonctionnalitesSection — « Essayez, c'est l'application. » (spec de la refonte, section « Les fonctionnalités en
 * action », `id="fonctionnalites"`, entre l'explorateur des métiers et le cycle ; le lien « Fonctionnalités » de la
 * barre y mène).
 *
 * Cinq onglets, chacun un exemple qu'on essaie, sur des données fictives : le document que reçoit le client (le vrai
 * générateur de devis), la signature en ligne, le métré express (le calcul de l'éditeur), le scénario de relances de
 * l'app, les encaissements d'une facture. Ils sont dans `exemples/OngletsExemples.jsx`.
 *
 * Chargement : ce fichier ne porte que le titre, le texte et la place réservée ; les onglets et les exemples arrivent à
 * la demande (`import()`), quand la section approche de l'écran (600 px avant). L'exemple du document charge à son
 * tour le générateur de devis et la bibliothèque des métiers : le premier écran du site ne grossit pas.
 * Introuvables (déploiement remplacé, réseau coupé) : un message à la place, pas une attente sans fin.
 */
import { useEffect, useRef, useState } from 'react';
import { captureException } from '../../lib/sentry';
import SectionSite from './site/SectionSite';
import EnTeteSection from './site/EnTeteSection';
import PlanArchitecte from './site/PlanArchitecte';
import { chargerUneFois } from './site/chargerUneFois';

/** Les onglets et leurs exemples, chargés une seule fois ; un échec n'est pas gardé (l'appel suivant retente). */
const chargerExemples = chargerUneFois(() => import('./exemples/OngletsExemples.jsx').then((module) => module.default));

/** La place des onglets et du cadre avant leur arrivée (décor), ou le message si le chargement échoue. */
function Attente({ echec }) {
  return (
    <div data-fonctionnalites-attente="" className="lg:grid lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div aria-hidden="true" className="flex gap-2 overflow-hidden py-1 lg:flex-col lg:gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="h-11 w-40 shrink-0 rounded-full border border-dashed border-marque-acier/70 lg:h-[4.75rem] lg:w-full lg:rounded-2xl" />
        ))}
      </div>
      <div className="mt-5 overflow-hidden rounded-[22px] border border-marque-acier/70 bg-white lg:mt-0">
        <div aria-hidden="true" className="h-11 border-b border-marque-acier/60 bg-marque-glacier-1" />
        {echec ? (
          <p data-fonctionnalites-echec="" className="flex min-h-[46rem] items-center justify-center px-6 text-center text-base text-marque-ardoise lg:min-h-[40rem]">
            Les exemples n’ont pas pu être chargés. Rechargez la page pour les essayer.
          </p>
        ) : (
          <div aria-hidden="true" className="min-h-[46rem] lg:min-h-[40rem]" />
        )}
      </div>
    </div>
  );
}

export default function FonctionnalitesSection() {
  const zone = useRef(null);
  const [demande, setDemande] = useState(false);
  const [Onglets, setOnglets] = useState(null);
  const [echec, setEchec] = useState(false);

  // La section approche de l'écran (600 px avant) : on demande les exemples. Sans IntersectionObserver, tout de suite.
  useEffect(() => {
    const element = zone.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setDemande(true);
      return undefined;
    }
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (!entree.isIntersecting) return;
        setDemande(true);
        observateur.disconnect();
      },
      { rootMargin: '600px 0px 600px 0px' },
    );
    observateur.observe(element);
    return () => observateur.disconnect();
  }, []);

  useEffect(() => {
    if (!demande) return undefined;
    let annule = false;
    chargerExemples()
      // Un composant se range dans l'état par une fonction (sinon React l'appellerait comme une mise à jour)
      .then((composant) => { if (!annule) setOnglets(() => composant); })
      .catch((erreur) => {
        captureException(erreur, { composant: 'FonctionnalitesSection' });
        if (!annule) setEchec(true);
      });
    return () => { annule = true; };
  }, [demande]);

  return (
    <SectionSite id="fonctionnalites" fond="glacier" decor={<PlanArchitecte ton="glacier" />}>
      <EnTeteSection titre="Essayez, c’est l’application.">
        Des exemples à manipuler, sur des données fictives. Le document, le métré et les relances sortent du code même
        de l’application.
      </EnTeteSection>
      <div ref={zone} className="mt-10">
        {Onglets ? <Onglets /> : <Attente echec={echec} />}
      </div>
    </SectionSite>
  );
}
