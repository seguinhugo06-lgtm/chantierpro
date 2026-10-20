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
import { ArrowRight, Check } from 'lucide-react';
import MarketingLayout from './MarketingLayout';
import SectionSite from './site/SectionSite';
import EnTetePage from './site/EnTetePage';
import BandeAppel from './site/BandeAppel';
import Apparition from './site/Apparition';
import { CadreOrdi, CadreTel } from './site/Cadres';
import { ICONES } from './site/icones';
import { CARTES_FONCTIONNALITES, CATEGORIES_FONCTIONNALITES } from './featuresContent';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marque-nuit-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const LEGENDE = "Captures de l'application, données fictives.";

/** La capture d'une carte, dans une vignette de hauteur fixe : le cadre déborde par le bas et y est coupé. */
function Vignette({ capture }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl bg-marque-glacier-1 px-4 pt-4 sm:px-5 sm:pt-5">
      {capture.telephone ? (
        <CadreTel src={capture.src} alt={capture.alt} largeur={capture.largeur} hauteur={capture.hauteur} className="max-w-[46%] !border-[6px] !rounded-[1.5rem]" />
      ) : (
        <CadreOrdi src={capture.src} alt={capture.alt} largeur={capture.largeur} hauteur={capture.hauteur} />
      )}
    </div>
  );
}

function Carte({ carte }) {
  const Icone = ICONES[carte.icone];
  const contenu = (
    <>
      <Vignette capture={carte.capture} />
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
          {carte.points.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm leading-snug text-slate-700">
              <span aria-hidden="true" className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-marque-glacier-2 text-marque-nuit-2">
                <Check size={12} strokeWidth={3.5} />
              </span>
              {point}
            </li>
          ))}
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
  const classes = 'group flex h-full flex-col rounded-2xl border border-marque-acier/60 bg-white shadow-[0_18px_40px_-30px_rgba(13,46,108,0.5)]';
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
        titre="Du devis à l'encaissement, au même endroit."
        intro="Chaque fonctionnalité de Mallettico, avec une capture de l'application. Ouvrez une carte pour le détail."
      />

      <SectionSite fond="blanc" className="!pt-6 sm:!pt-10">
        <h2 className="sr-only">Les fonctionnalités</h2>
        <div role="group" aria-label="Filtrer par catégorie" className="flex flex-wrap gap-2">
          {CATEGORIES_FONCTIONNALITES.map((c) => {
            const pressee = categorie === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={pressee}
                onClick={() => setCategorie(c.id)}
                className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold transition-colors motion-reduce:transition-none ${FOCUS} ${
                  pressee
                    ? 'border-marque-nuit-2 bg-marque-nuit-2 text-white'
                    : 'border-marque-acier bg-white text-marque-ardoise hover:border-marque-nuit-2 hover:text-marque-nuit'
                }`}
              >
                {c.libelle}
              </button>
            );
          })}
        </div>

        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cartes.map((carte) => (
            <li key={carte.titre}>
              <Apparition className="h-full">
                <Carte carte={carte} />
              </Apparition>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-slate-600">{LEGENDE}</p>
      </SectionSite>

      <BandeAppel
        titre="Essayez Mallettico gratuitement."
        texte="Le plan Gratuit n'a pas de limite de durée et l'inscription ne demande pas de carte bancaire."
      />
    </MarketingLayout>
  );
}
