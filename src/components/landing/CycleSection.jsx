/**
 * CycleSection — le cycle raconté au défilement (spec de la refonte, section 5, `id="parcours"`).
 *
 * Bureau (≥ 1024 px) : trois étapes numérotées à gauche, un téléphone collant à droite dont l'écran change avec
 * l'étape lue (celle qui passe au milieu de la fenêtre : IntersectionObserver). Le téléphone est décoratif
 * (`aria-hidden`) : chaque étape porte son propre texte. Il change d'écran par un fondu, sans fondu si l'appareil
 * demande moins de mouvement (`motion-reduce:transition-none`).
 * Téléphone et tablette : les étapes s'empilent, chacune avec sa capture (texte de remplacement en français).
 * Les étapes gardent toutes un contraste franc ; l'étape lue se distingue par sa pastille pleine, son trait bleu
 * nuit et son titre plus foncé (pas d'estompage, qui ferait tomber le contraste des autres sous 4,5:1).
 * Captures : `public/site/tel-*.webp` (scripts/site-captures.cjs), données fictives, dites par la légende.
 * Titre `h2` visible (passe de finition) : sans lui, la section s'ouvrait au bureau sur 250 px de glacier vide.
 * Au bureau, la première étape s'aligne en haut de sa bande (sous le titre, à la hauteur du haut du téléphone) et la
 * colonne du téléphone suit la colonne de texte à une distance fixe, au lieu d'être repoussée au bord droit.
 * Ancre `#parcours` : le lien « Fonctionnalités » de la barre mène à la section précédente, « Les fonctionnalités en
 * action » (`#fonctionnalites`).
 */
import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import SectionSite from './site/SectionSite';
import EnTeteSection from './site/EnTeteSection';
import { CadreTel } from './site/Cadres';
import { FOCUS_SUR_GLACIER as FOCUS } from './site/focus';

const ETAPES = [
  {
    titre: "Le chantier du jour, d'un coup d'œil",
    texte: "À l'ouverture\u202f: ce qu'il reste à encaisser, les devis à relancer, les brouillons à finir. Rien d'autre.",
    lien: '/fonctionnalites/devis-factures',
    capture: '/site/tel-accueil.webp',
    alt: "L'accueil de Mallettico sur téléphone\u202f: le montant à encaisser, les devis à relancer et le brouillon à finaliser.",
  },
  {
    titre: 'Le devis se monte par lots',
    texte: 'Un lot de la bibliothèque, quelques quantités à ajuster, le total se calcule pendant que vous tapez.',
    lien: '/fonctionnalites/devis-factures',
    capture: '/site/tel-devis-lots.webp',
    alt: 'Un devis en cours sur téléphone\u202f: le lot «\u202fMise aux normes du tableau électrique\u202f», ses lignes chiffrées et le total TTC.',
  },
  {
    titre: 'Signé, facturé, encaissé',
    texte: 'Le client signe en ligne. Le devis devient une facture sans ressaisie, chaque paiement est noté, même partiel.',
    lien: '/fonctionnalites/signature-electronique',
    capture: '/site/tel-facture.webp',
    alt: 'Une facture payée en partie sur téléphone\u202f: le montant reçu, le reste dû et les boutons pour encaisser ou relancer.',
  },
];

const LARGEUR_CAPTURE = 1170;
const HAUTEUR_CAPTURE = 2532;
const LEGENDE = "Captures de l'application, données fictives.";

/** Le téléphone collant du bureau : les trois captures superposées, seule celle de l'étape lue est visible. */
function TelephoneCollant({ active }) {
  return (
    <div className="sticky top-24">
      <div
        aria-hidden="true"
        data-telephone=""
        // Largeur bornée par la hauteur de la fenêtre : le téléphone entier tient sous la barre, même à 768 px de haut.
        className="relative mx-auto w-[min(320px,calc((100vh_-_10rem)_*_0.462))] rounded-[2.75rem] border-[10px] border-marque-encre-sombre bg-marque-encre-sombre shadow-[0_40px_70px_-30px_rgba(13,46,108,0.6)]"
      >
        <div className="relative overflow-hidden rounded-[2.1rem] bg-white" style={{ aspectRatio: `${LARGEUR_CAPTURE} / ${HAUTEUR_CAPTURE}` }}>
          {ETAPES.map((etape, i) => (
            <img
              key={etape.capture}
              src={etape.capture}
              alt=""
              width={LARGEUR_CAPTURE}
              height={HAUTEUR_CAPTURE}
              loading="lazy"
              decoding="async"
              className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500 ease-out motion-reduce:transition-none ${
                i === active ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="mt-5 flex justify-center gap-2">
        {ETAPES.map((etape, i) => (
          <span
            key={etape.capture}
            className={`h-1.5 rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none ${
              i === active ? 'w-6 bg-marque-nuit-2' : 'w-1.5 bg-marque-acier'
            }`}
          />
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-slate-600">{LEGENDE}</p>
    </div>
  );
}

export default function CycleSection() {
  const [active, setActive] = useState(0);
  const etapes = useRef([]);

  // L'étape lue est celle qui traverse la bande du milieu de la fenêtre (10 % de sa hauteur).
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) if (entree.isIntersecting) setActive(Number(entree.target.dataset.etape));
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    etapes.current.forEach((el) => el && observateur.observe(el));
    return () => observateur.disconnect();
  }, []);

  return (
    // Au bureau, la dernière étape occupe déjà presque une fenêtre : la bande se contente d'un espacement réduit en bas.
    <SectionSite id="parcours" fond="glacier" className="lg:pb-12">
      <EnTeteSection titre="Du devis à l'encaissement, en trois étapes." />
      <div className="mt-10 grid gap-12 sm:mt-12 lg:grid-cols-[minmax(0,35rem)_340px] lg:gap-20 xl:gap-28">
        {/* Au bureau, un rail estompé aux deux bouts relie les trois étapes ; le trait de l'étape lue passe par-dessus
            (étapes en `relative` : peintes après le rail). */}
        <ol className="relative lg:before:absolute lg:before:inset-y-0 lg:before:left-0 lg:before:w-0.5 lg:before:bg-gradient-to-b lg:before:from-transparent lg:before:via-marque-acier lg:before:to-transparent lg:before:content-['']">
          {ETAPES.map((etape, i) => {
            const lue = i === active;
            return (
              <li
                key={etape.titre}
                ref={(el) => { etapes.current[i] = el; }}
                data-etape={i}
                data-active={lue ? 'true' : 'false'}
                // Bureau : une bande par étape, le texte au milieu ; la première commence en haut (sous le titre) et la
                // dernière est un peu plus courte, pour ne pas ouvrir ni fermer la section sur un grand vide.
                className="relative grid gap-8 py-8 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_15rem] sm:items-center lg:flex lg:min-h-[78vh] lg:flex-col lg:items-stretch lg:justify-center lg:py-0 lg:first:min-h-[64vh] lg:first:justify-start lg:last:min-h-[70vh]"
              >
                <div
                  className={`border-l-2 pl-5 transition-colors duration-300 motion-reduce:transition-none sm:pl-8 ${
                    lue ? 'border-marque-nuit-2' : 'border-marque-acier lg:border-transparent'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-base font-extrabold transition-colors duration-300 motion-reduce:transition-none ${
                      lue ? 'border-marque-nuit-2 bg-marque-nuit-2 text-white' : 'border-marque-acier bg-white text-marque-ardoise'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <h3
                    className={`mt-4 text-balance text-2xl font-extrabold leading-tight tracking-[-0.03em] transition-colors duration-300 motion-reduce:transition-none lg:text-[1.875rem] ${
                      lue ? 'text-marque-nuit' : 'text-marque-ardoise'
                    }`}
                  >
                    {etape.titre}
                  </h3>
                  <p className="mt-3 max-w-[30em] text-lg leading-relaxed text-marque-ardoise">{etape.texte}</p>
                  <a
                    href={etape.lien}
                    className={`-ml-1 mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-1 text-base font-semibold text-marque-nuit-2 underline-offset-4 hover:underline ${FOCUS}`}
                  >
                    En savoir plus
                    <span className="sr-only"> : {etape.titre}</span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </a>
                </div>
                <div className="lg:hidden">
                  <CadreTel
                    src={etape.capture}
                    alt={etape.alt}
                    largeur={LARGEUR_CAPTURE}
                    hauteur={HAUTEUR_CAPTURE}
                    className="max-w-[15rem]"
                  />
                </div>
              </li>
            );
          })}
        </ol>
        <div className="hidden lg:block">
          <TelephoneCollant active={active} />
        </div>
      </div>
      <p className="mt-10 text-xs text-slate-600 lg:hidden">{LEGENDE}</p>
    </SectionSite>
  );
}
