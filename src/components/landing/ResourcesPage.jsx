/**
 * ResourcesPage — la page /ressources : l'application en images (une vue par onglet, captures avec des données
 * fictives) et les quatre étapes de l'inscription à l'encaissement.
 *
 * Contenu et captures : `featuresContent.js` (`VUES_RESSOURCES`, `ETAPES_RESSOURCES`). Charte « Glacier vif ».
 * Les onglets de la galerie sont des boutons `aria-pressed` (comme les métiers de l'accueil) : la capture et sa
 * description suivent le bouton pressé.
 * Retirés de l'ancienne version : la « vidéo de démonstration » et les trois guides « bientôt disponibles » (des
 * promesses ; la spec exclut la vidéo), « inscription en 30 secondes » et « un devis en 2 minutes » (aucune mesure),
 * « 14+ widgets », « 600+ articles », « drag-and-drop », les projections « 30/60/90 jours », la fausse adresse
 * « app.mallettico.fr » du cadre de navigateur.
 */
import { useState } from 'react';
import MarketingLayout from './MarketingLayout';
import SectionSite from './site/SectionSite';
import EnTetePage from './site/EnTetePage';
import EnTeteSection from './site/EnTeteSection';
import BandeAppel from './site/BandeAppel';
import Apparition from './site/Apparition';
import { CadreOrdi } from './site/Cadres';
import { ICONES } from './site/icones';
import { ETAPES_RESSOURCES, VUES_RESSOURCES } from './featuresContent';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marque-nuit-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

function Galerie() {
  const [choisie, setChoisie] = useState(VUES_RESSOURCES[0].id);
  const vue = VUES_RESSOURCES.find((v) => v.id === choisie) || VUES_RESSOURCES[0];
  return (
    <div className="mt-10">
      <div role="group" aria-label="Choisir une vue de l'application" className="flex flex-wrap gap-2">
        {VUES_RESSOURCES.map((v) => {
          const Icone = ICONES[v.icone];
          const pressee = v.id === vue.id;
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={pressee}
              onClick={() => setChoisie(v.id)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors motion-reduce:transition-none ${FOCUS} ${
                pressee
                  ? 'border-marque-nuit-2 bg-marque-nuit-2 text-white'
                  : 'border-marque-acier bg-white text-marque-ardoise hover:border-marque-nuit-2 hover:text-marque-nuit'
              }`}
            >
              {Icone ? <Icone size={16} aria-hidden="true" /> : null}
              {v.libelle}
            </button>
          );
        })}
      </div>
      <figure className="mt-8">
        {/* `key` : une nouvelle image par vue (pas d'ancienne capture affichée le temps du chargement) */}
        <CadreOrdi key={vue.id} src={vue.capture.src} alt={vue.capture.alt} largeur={vue.capture.largeur} hauteur={vue.capture.hauteur} />
        <figcaption className="mt-4 text-center">
          <span className="block text-base text-marque-ardoise">{vue.description}</span>
          <span className="mt-1 block text-xs text-slate-600">Capture de l'application, données fictives.</span>
        </figcaption>
      </figure>
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <MarketingLayout>
      <EnTetePage
        surtitre="Ressources"
        titre="Mallettico en images."
        intro="Les écrans de l'application, tels que vous les verrez, sur des données fictives. Puis les quatre étapes, de l'inscription à l'encaissement."
      />

      <SectionSite fond="blanc" className="!pt-6 sm:!pt-10">
        <EnTeteSection titre="L'application, écran par écran">
          Choisissez un écran pour l'afficher.
        </EnTeteSection>
        <Galerie />
      </SectionSite>

      <SectionSite fond="glacier">
        <EnTeteSection titre="Comment ça marche" />
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ETAPES_RESSOURCES.map((etape, i) => (
            <li key={etape.titre}>
              <Apparition delai={i * 0.05} className="h-full">
                <div className="h-full rounded-2xl border border-marque-acier/60 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(13,46,108,0.5)]">
                  <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-marque-nuit-2 text-base font-extrabold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-bold leading-snug tracking-tight text-marque-nuit">{etape.titre}</h3>
                  <p className="mt-1.5 text-base leading-relaxed text-slate-700">{etape.texte}</p>
                </div>
              </Apparition>
            </li>
          ))}
        </ol>
      </SectionSite>

      <BandeAppel
        titre="Essayez Mallettico gratuitement."
        texte="Le plan Gratuit n'a pas de limite de durée et l'inscription ne demande pas de carte bancaire."
      />
    </MarketingLayout>
  );
}
