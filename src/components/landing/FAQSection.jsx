/**
 * FAQSection — « Questions fréquentes » (spec de la refonte, section 9, `id="faq"` : ancre gardée,
 * src/lib/sectionsAccueil.js).
 *
 * Les questions et réponses sont dans `faq.js` (relues pour l'honnêteté, limites et prix lus dans `PLANS`). Ici, la
 * mise en forme : des filtres par catégorie (boutons `aria-pressed`, une seule catégorie pressée) et un accordéon
 * accessible (`site/Question.jsx`, partagé avec les pages de fonctionnalités). Données structurées FAQPage (JSON-LD)
 * pour les moteurs de recherche.
 * Composition :
 *   - téléphone et tablette : une colonne (titre, filtres, questions, contact) ; les six premières questions, puis
 *     « Voir les N autres questions » (N compté dans la liste ; `aria-expanded` ; le focus va à la septième question) :
 *     la FAQ entière allongeait la page de 600 px ;
 *   - bureau (≥ 1024 px) : le titre, les filtres et le contact à gauche, collés sous la barre pendant la lecture
 *     (`sticky`), les questions à droite. Le bloc de gauche est en `display: contents` sous 1024 px : ses enfants se
 *     rangent alors dans la colonne unique (`order`), le contact après les questions.
 * Attributs `data-*` lus par le parcours `scripts/parcours/site.cjs`.
 */
import { useEffect, useId, useRef, useState } from 'react';
import SectionSite from './site/SectionSite';
import EnTeteSection from './site/EnTeteSection';
import Apparition from './site/Apparition';
import BoutonSite from './site/BoutonSite';
import Question from './site/Question';
import PastilleFiltre from './site/PastilleFiltre';
import { FOCUS } from './site/focus';
import { CATEGORIES_FAQ, questionsFaq } from './faq';

const QUESTIONS = questionsFaq();

/** Questions montrées d'emblée sous 1024 px, avant « Voir les N autres questions ». */
const D_EMBLEE = 6;

export default function FAQSection() {
  const [categorie, setCategorie] = useState('tout');
  const [ouverte, setOuverte] = useState(null);
  const [toutes, setToutes] = useState(false);
  const aFocaliser = useRef(null);
  const base = useId().replace(/:/g, '');

  const affichees = categorie === 'tout' ? QUESTIONS : QUESTIONS.filter((item) => item.categorie === categorie);
  const autres = affichees.length - D_EMBLEE;
  const idListe = `${base}-liste`;

  // Données structurées FAQPage (JSON-LD), pour les moteurs de recherche : toutes les questions, quel que soit le filtre
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-jsonld';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: QUESTIONS.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
    });
    document.getElementById('faq-jsonld')?.remove();
    document.head.appendChild(script);
    return () => document.getElementById('faq-jsonld')?.remove();
  }, []);

  // « Voir les N autres questions » : le focus va à la première question révélée, une fois affichée
  useEffect(() => {
    if (!toutes || !aFocaliser.current) return;
    document.getElementById(aFocaliser.current)?.focus();
    aFocaliser.current = null;
  }, [toutes]);

  const voirLesAutres = () => {
    const septieme = affichees[D_EMBLEE];
    if (septieme) aFocaliser.current = `${base}-${QUESTIONS.indexOf(septieme)}-question`;
    setToutes(true);
  };

  return (
    <SectionSite id="faq" fond="blanc">
      <div className="grid lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:items-start lg:gap-x-16">
        <div className="contents lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="order-1 lg:order-none">
            <EnTeteSection titre="Questions fréquentes">Ce qu’il faut savoir avant de commencer.</EnTeteSection>

            <div role="group" aria-label="Filtrer les questions" className="mt-8 flex flex-wrap gap-2">
              {CATEGORIES_FAQ.map((c) => (
                <PastilleFiltre
                  key={c.id}
                  data-categorie=""
                  pressee={categorie === c.id}
                  onClick={() => { setCategorie(c.id); setOuverte(null); }}
                >
                  {c.libelle}
                </PastilleFiltre>
              ))}
            </div>
          </div>

          <Apparition className="order-3 lg:order-none">
            <p data-contact-faq="" className="mt-8 text-base text-marque-ardoise">
              Une autre question ? Écrivez-nous à{' '}
              <a
                href="mailto:contact@mallettico.fr"
                className={`inline-flex min-h-[44px] items-center rounded font-semibold text-marque-nuit-2 underline underline-offset-4 hover:text-marque-nuit ${FOCUS}`}
              >
                contact@mallettico.fr
              </a>
            </p>
          </Apparition>
        </div>

        <div className="order-2 lg:order-none lg:col-start-2 lg:row-start-1">
          <ul id={idListe} className="mt-6 flex flex-col gap-3 lg:mt-0">
            {affichees.map((item, rang) => {
              const i = QUESTIONS.indexOf(item);
              return (
                <Question
                  key={item.q}
                  id={`${base}-${i}`}
                  question={item.q}
                  reponse={item.a}
                  ouverte={ouverte === item.q}
                  cachee={!toutes && rang >= D_EMBLEE}
                  onBasculer={() => setOuverte((o) => (o === item.q ? null : item.q))}
                />
              );
            })}
          </ul>
          {!toutes && autres > 0 ? (
            <BoutonSite
              variante="contour"
              data-voir-autres=""
              aria-expanded={false}
              aria-controls={idListe}
              onClick={voirLesAutres}
              className="mt-5 w-full sm:w-auto lg:hidden"
            >
              {`Voir les ${autres} autres questions`}
            </BoutonSite>
          ) : null}
        </div>
      </div>
    </SectionSite>
  );
}
