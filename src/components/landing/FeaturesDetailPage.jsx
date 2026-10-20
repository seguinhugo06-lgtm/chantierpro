/**
 * FeaturesDetailPage — la page /fonctionnalites : une carte par fonctionnalité, filtrable par catégorie, chacune avec
 * une capture de l'application (données fictives) ; une carte qui a sa page de détail y mène.
 *
 * Contenu et captures : `featuresContent.js` (`CARTES_FONCTIONNALITES`, chaque affirmation vérifiée dans le code).
 * Charte « Glacier vif » : en-tête glacier avec le plan d'architecte (`site/EnTetePage`), filtres en pastilles
 * `aria-pressed`, cartes blanches, appel final sur la bande bleu nuit (`site/BandeAppel`).
 * Retirés de l'ancienne version : « Tout ce dont vous avez besoin, au même endroit » et « tout est intégré »
 * (affirmations absolues), le cadre de navigateur à fausse adresse, les couleurs de l'ancienne palette.
 */
import { useState } from 'react';
import { ArrowRight, Check, Clock } from 'lucide-react';
import MarketingLayout from './MarketingLayout';
import SectionSite from './site/SectionSite';
import EnTetePage from './site/EnTetePage';
import BandeAppel from './site/BandeAppel';
import Apparition from './site/Apparition';
import PastilleFiltre from './site/PastilleFiltre';
import { CadreCapture } from './site/Cadres';
import { FOCUS } from './site/focus';
import { ICONES } from './site/icones';
import { CARTES_FONCTIONNALITES, CATEGORIES_FONCTIONNALITES } from './featuresContent';

const LEGENDE = "Captures de l’application, données fictives.";

/** Cartes de la première rangée au bureau (trois colonnes) : leurs images sont dans le premier écran. */
const PREMIERE_RANGEE = 3;

/**
 * La capture d'une carte, dans une vignette de hauteur fixe : le cadre déborde par le bas et y est coupé. Au
 * téléphone, la vue téléphone de la capture (lisible), dans un cadre de téléphone plus large que sur ordinateur et une
 * vignette plus haute ; sur un écran plus large, la capture d'ordinateur.
 * `rang` : place de la carte dans la liste ; les images de la première rangée sont chargées tout de suite, la toute
 * première en priorité (premier écran à 1440 px).
 */
function Vignette({ capture, rang, bandeau = false }) {
  return (
    <div
      className={`relative aspect-[4/3] overflow-hidden bg-marque-glacier-1 px-4 pt-4 sm:px-5 sm:pt-5 ${
        bandeau ? 'rounded-t-2xl sm:aspect-auto sm:min-h-[15rem] sm:w-2/5 sm:shrink-0 sm:rounded-l-2xl sm:rounded-tr-none' : 'rounded-t-2xl sm:aspect-[16/10]'
      }`}
    >
      {/* Au-dessus du téléphone, la vignette recadrée de l'écran d'ordinateur (zone utile, sans la barre latérale) :
          l'écran entier réduit à 310 px rendait un texte de 2 px */}
      <CadreCapture
        capture={capture}
        recadree
        prioritaire={rang < PREMIERE_RANGEE}
        premiere={rang === 0}
        classeTel={bandeau ? 'max-w-[64%] !border-[6px] !rounded-[1.5rem] sm:max-w-[13rem]' : 'max-w-[64%] !border-[6px] !rounded-[1.5rem] sm:max-w-[46%]'}
      />
    </div>
  );
}

/** Un point de carte : une coche s'il est disponible, une horloge s'il est « à venir » (jamais une coche pour du prévu). */
function Point({ point }) {
  const aVenir = typeof point === 'object' && point.statut === 'a-venir';
  const texte = typeof point === 'object' ? point.texte : point;
  return (
    <li data-point={aVenir ? 'a-venir' : 'inclus'} className="flex items-start gap-2.5 text-sm leading-snug text-slate-700">
      <span
        aria-hidden="true"
        className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${aVenir ? 'bg-slate-100 text-slate-600' : 'bg-marque-glacier-2 text-marque-nuit-2'}`}
      >
        {aVenir ? <Clock size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3.5} />}
      </span>
      {texte}
    </li>
  );
}

/** Le texte d'un point, pour une clé ou une recherche (un point « à venir » est un objet). */
const texteDuPoint = (point) => (typeof point === 'object' ? point.texte : point);

function Carte({ carte, rang }) {
  const Icone = ICONES[carte.icone];
  const contenu = (
    <>
      <Vignette capture={carte.capture} rang={rang} bandeau={carte.bandeau} />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-center gap-3">
          {Icone ? (
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-marque-glacier-2 text-marque-nuit-2">
              <Icone size={20} strokeWidth={2} />
            </span>
          ) : null}
          <h3 className="text-lg font-bold leading-snug tracking-tight text-marque-nuit">{carte.titre}</h3>
        </div>
        <p className="mt-3 text-base leading-relaxed text-slate-700">{carte.description}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {carte.points.map((point) => <Point key={texteDuPoint(point)} point={point} />)}
        </ul>
        {carte.slug ? (
          <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-base font-semibold text-marque-nuit-2">
            En savoir plus
            <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </span>
        ) : null}
      </div>
    </>
  );
  const classes = `group flex h-full flex-col rounded-2xl border border-marque-acier/60 bg-white shadow-[0_18px_40px_-30px_rgba(13,46,108,0.5)]${
    carte.bandeau ? ' sm:flex-row' : ''
  }`;
  if (carte.slug) {
    return (
      <a
        href={`/fonctionnalites/${carte.slug}`}
        className={`${classes} transition-[border-color,box-shadow] hover:border-marque-nuit-2/60 hover:shadow-[0_24px_48px_-30px_rgba(13,46,108,0.6)] motion-reduce:transition-none ${FOCUS}`}
      >
        {contenu}
      </a>
    );
  }
  return <article className={classes}>{contenu}</article>;
}

export default function FeaturesDetailPage() {
  const [categorie, setCategorie] = useState('tout');
  const cartes = categorie === 'tout' ? CARTES_FONCTIONNALITES : CARTES_FONCTIONNALITES.filter((c) => c.categorie === categorie);

  return (
    <MarketingLayout>
      <EnTetePage
        surtitre="Fonctionnalités"
        titre="Du devis à l’encaissement, au même endroit."
        intro="Chaque fonctionnalité de Mallettico, avec une capture de l’application. Ouvrez une carte pour le détail."
      />

      <SectionSite fond="blanc" className="!pt-6 sm:!pt-10">
        <h2 className="sr-only">Les fonctionnalités</h2>
        <div role="group" aria-label="Filtrer par catégorie" className="flex flex-wrap gap-2">
          {CATEGORIES_FONCTIONNALITES.map((c) => (
            <PastilleFiltre key={c.id} pressee={categorie === c.id} onClick={() => setCategorie(c.id)}>
              {c.libelle}
            </PastilleFiltre>
          ))}
        </div>

        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Le bandeau de fin (« Sur téléphone », sans page de détail) prend deux colonnes : au bureau, il complète la
              dernière rangée des dix cartes ; à la tablette, il ferme la grille (plus de carte seule ni de case vide) */}
          {cartes.map((carte, rang) => (
            <li key={carte.titre} className={carte.bandeau ? 'sm:col-span-2' : undefined}>
              <Apparition className="h-full">
                <Carte carte={carte} rang={rang} />
              </Apparition>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-slate-600">{LEGENDE}</p>
      </SectionSite>

      <BandeAppel
        titre="Essayez Mallettico gratuitement."
        texte="Le plan Gratuit n’a pas de limite de durée et l’inscription ne demande pas de carte bancaire."
      />
    </MarketingLayout>
  );
}
