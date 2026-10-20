/**
 * FeatureDeepDivePage — la page de détail d'une fonctionnalité (/fonctionnalites/:slug).
 *
 * Contenu et capture : `featuresContent.js` (`FEATURES_CONTENT`, chaque affirmation vérifiée dans le code). Charte
 * « Glacier vif » : en-tête glacier avec la capture (`site/EnTetePage`), « Comment ça marche » en étapes numérotées,
 * « Dans le détail » en deux cartes, questions en accordéon accessible (`site/Question`, données structurées FAQPage),
 * fonctionnalités liées, appel final sur la bande bleu nuit (`site/BandeAppel`).
 * Adresse inconnue (dont la page de la saisie à la voix, retirée tant que `FONCTIONS.ia` est éteint) : renvoi vers
 * /fonctionnalites.
 */
import { useEffect, useId, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import MarketingLayout from './MarketingLayout';
import SectionSite from './site/SectionSite';
import EnTetePage from './site/EnTetePage';
import EnTeteSection from './site/EnTeteSection';
import BandeAppel from './site/BandeAppel';
import Apparition from './site/Apparition';
import BoutonSite from './site/BoutonSite';
import Question from './site/Question';
import { CadreOrdi, CadreTel } from './site/Cadres';
import { FEATURES_CONTENT } from './featuresContent';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marque-nuit-2 focus-visible:ring-offset-2';

function Capture({ capture }) {
  return (
    <figure className="mx-auto w-full max-w-2xl lg:max-w-none">
      {capture.telephone ? (
        <CadreTel src={capture.src} alt={capture.alt} largeur={capture.largeur} hauteur={capture.hauteur} prioritaire className="max-w-[17rem]" />
      ) : (
        <CadreOrdi src={capture.src} alt={capture.alt} largeur={capture.largeur} hauteur={capture.hauteur} prioritaire />
      )}
      <figcaption className="mt-3 text-center text-xs text-slate-600">Capture de l'application, données fictives.</figcaption>
    </figure>
  );
}

export default function FeatureDeepDivePage({ slug }) {
  const fonction = FEATURES_CONTENT[slug];
  const [ouverte, setOuverte] = useState(null);
  const base = useId().replace(/:/g, '');

  // Titre, description et questions en données structurées (FAQPage) pour les moteurs de recherche
  useEffect(() => {
    if (!fonction) return undefined;
    document.title = `${fonction.label} — Mallettico`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', fonction.metaDescription);
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'feature-faq-jsonld';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: fonction.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
    document.getElementById('feature-faq-jsonld')?.remove();
    document.head.appendChild(script);
    return () => document.getElementById('feature-faq-jsonld')?.remove();
  }, [fonction]);

  if (!fonction) {
    // Adresse inconnue → le catalogue des fonctionnalités
    if (typeof window !== 'undefined') window.location.replace('/fonctionnalites');
    return null;
  }

  const liees = (fonction.related || []).map((s) => FEATURES_CONTENT[s]).filter(Boolean);

  return (
    <MarketingLayout>
      <EnTetePage
        avant={
          <a
            href="/fonctionnalites"
            className={`-ml-1 mb-4 flex w-fit min-h-[44px] items-center gap-1.5 rounded-full px-1 text-base font-semibold text-marque-nuit-2 underline-offset-4 hover:underline ${FOCUS} focus-visible:ring-offset-marque-glacier-1`}
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Toutes les fonctionnalités
          </a>
        }
        surtitre={fonction.badge}
        titre={fonction.title}
        intro={fonction.tagline}
        aside={<Capture capture={fonction.capture} />}
      >
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <BoutonSite variante="plein" href="/inscription" className="w-full sm:w-auto">
            Créer mon compte gratuit
            <ArrowRight size={18} aria-hidden="true" />
          </BoutonSite>
          <BoutonSite variante="contour" href="/?demo=true" className="w-full sm:w-auto">
            Voir la démo
          </BoutonSite>
        </div>
      </EnTetePage>

      <SectionSite fond="blanc">
        <EnTeteSection titre="Comment ça marche" />
        {/* Trois étapes : trois colonnes au bureau ; quatre : deux par rangée (jamais une étape seule sur sa ligne) */}
        <ol className={`mt-10 grid gap-4 md:grid-cols-2 lg:gap-5 ${fonction.steps.length === 3 ? 'lg:grid-cols-3' : ''}`}>
          {fonction.steps.map((etape, i) => (
            <li key={etape.title}>
              <Apparition delai={i * 0.05} className="h-full">
                <div className="flex h-full gap-4 rounded-2xl border border-marque-acier/60 bg-white p-5 shadow-[0_18px_40px_-30px_rgba(13,46,108,0.5)] sm:p-6">
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marque-nuit-2 text-base font-extrabold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold leading-snug tracking-tight text-marque-nuit">{etape.title}</h3>
                    <p className="mt-1.5 text-base leading-relaxed text-slate-700">{etape.text}</p>
                  </div>
                </div>
              </Apparition>
            </li>
          ))}
        </ol>
      </SectionSite>

      <SectionSite fond="glacier">
        <EnTeteSection titre="Dans le détail" />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {fonction.groups.map((groupe) => (
            <Apparition key={groupe.name} className="h-full">
              <div className="h-full rounded-2xl border border-marque-acier/60 bg-white p-6 shadow-[0_18px_40px_-30px_rgba(13,46,108,0.5)]">
                <h3 className="text-lg font-bold tracking-tight text-marque-nuit">{groupe.name}</h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {groupe.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-base leading-snug text-slate-700">
                      <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-marque-glacier-2 text-marque-nuit-2">
                        <Check size={13} strokeWidth={3.5} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Apparition>
          ))}
        </div>
      </SectionSite>

      <SectionSite fond="blanc">
        <div className="max-w-3xl">
          <EnTeteSection titre="Questions fréquentes" />
          <ul className="mt-8 flex flex-col gap-3">
            {fonction.faq.map((item, i) => (
              <Question
                key={item.q}
                id={`${base}-${i}`}
                question={item.q}
                reponse={item.a}
                ouverte={ouverte === item.q}
                onBasculer={() => setOuverte((o) => (o === item.q ? null : item.q))}
              />
            ))}
          </ul>
        </div>
      </SectionSite>

      {liees.length > 0 ? (
        <SectionSite fond="glacier">
          <EnTeteSection titre="Ça marche encore mieux avec" />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liees.map((liee) => (
              <li key={liee.slug}>
                <a
                  href={`/fonctionnalites/${liee.slug}`}
                  className={`group flex h-full min-h-[88px] items-center justify-between gap-4 rounded-2xl border border-marque-acier/60 bg-white p-5 shadow-[0_18px_40px_-30px_rgba(13,46,108,0.5)] transition-[border-color,box-shadow] hover:border-marque-nuit-2/60 motion-reduce:transition-none ${FOCUS} focus-visible:ring-offset-marque-glacier-1`}
                >
                  <span className="min-w-0">
                    <span className="block text-base font-bold text-marque-nuit">{liee.label}</span>
                    <span className="mt-0.5 block text-sm text-marque-ardoise">{liee.badge}</span>
                  </span>
                  <ArrowRight size={20} aria-hidden="true" className="shrink-0 text-marque-nuit-2 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </a>
              </li>
            ))}
          </ul>
        </SectionSite>
      ) : null}

      <BandeAppel
        titre="Essayez Mallettico gratuitement."
        texte="Le plan Gratuit n'a pas de limite de durée et l'inscription ne demande pas de carte bancaire."
      />
    </MarketingLayout>
  );
}
