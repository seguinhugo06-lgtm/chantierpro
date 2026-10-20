/**
 * FAQSection — « Questions fréquentes » (spec de la refonte, section 9, `id="faq"` : ancre gardée,
 * src/lib/sectionsAccueil.js).
 *
 * Les questions et réponses sont dans `faq.js` (relues pour l'honnêteté, limites et prix lus dans `PLANS`). Ici, la
 * mise en forme : des filtres par catégorie (boutons `aria-pressed`, une seule catégorie pressée) et un accordéon
 * accessible (`site/Question.jsx`, partagé avec les pages de fonctionnalités). Données structurées FAQPage (JSON-LD)
 * pour les moteurs de recherche.
 * Attributs `data-*` lus par le parcours `scripts/parcours/site.cjs`.
 */
import { useEffect, useId, useState } from 'react';
import SectionSite from './site/SectionSite';
import EnTeteSection from './site/EnTeteSection';
import Apparition from './site/Apparition';
import Question from './site/Question';
import { CATEGORIES_FAQ, questionsFaq } from './faq';

const QUESTIONS = questionsFaq();

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marque-nuit-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

export default function FAQSection() {
  const [categorie, setCategorie] = useState('tout');
  const [ouverte, setOuverte] = useState(null);
  const base = useId().replace(/:/g, '');

  const affichees = categorie === 'tout' ? QUESTIONS : QUESTIONS.filter((item) => item.categorie === categorie);

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

  return (
    <SectionSite id="faq" fond="blanc">
      {/* Colonne de lecture, alignée à gauche sur les titres des autres sections */}
      <div className="max-w-3xl">
        <EnTeteSection titre="Questions fréquentes">Ce qu'il faut savoir avant de commencer.</EnTeteSection>

        <div role="group" aria-label="Filtrer les questions" className="mt-8 flex flex-wrap gap-2">
          {CATEGORIES_FAQ.map((c) => {
            const pressee = categorie === c.id;
            return (
              <button
                key={c.id}
                type="button"
                data-categorie=""
                aria-pressed={pressee}
                onClick={() => { setCategorie(c.id); setOuverte(null); }}
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

        <ul className="mt-6 flex flex-col gap-3">
          {affichees.map((item) => {
            const i = QUESTIONS.indexOf(item);
            return (
              <Question
                key={item.q}
                id={`${base}-${i}`}
                question={item.q}
                reponse={item.a}
                ouverte={ouverte === item.q}
                onBasculer={() => setOuverte((o) => (o === item.q ? null : item.q))}
              />
            );
          })}
        </ul>

        <Apparition>
          <p data-contact-faq="" className="mt-8 text-base text-marque-ardoise">
            Une autre question ? Écrivez-nous à{' '}
            <a
              href="mailto:contact@mallettico.fr"
              className={`inline-flex min-h-[44px] items-center rounded font-semibold text-marque-nuit-2 underline underline-offset-4 hover:text-marque-nuit ${FOCUS}`}
            >
              contact@mallettico.fr
            </a>
          </p>
        </Apparition>
      </div>
    </SectionSite>
  );
}
