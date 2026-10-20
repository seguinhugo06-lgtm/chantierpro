import { ArrowRight } from 'lucide-react';
import BoutonSite from './BoutonSite';
import Apparition from './Apparition';
import PlanArchitecte from './PlanArchitecte';

/**
 * BandeAppel — l'appel à créer un compte au bas des sous-pages du site : bande bleu nuit avec le quadrillage en blanc
 * très léger, titre blanc, texte acier (8,4:1), pilule blanche à texte nuit (12,9:1) et « Voir la démo » en contour
 * blanc. L'inscription est `/inscription` (l'app ouvre directement le formulaire), la démo `/?demo=true`.
 */
export function BandeAppel({ titre, texte }) {
  return (
    <section className="relative overflow-hidden bg-marque-nuit py-16 text-white sm:py-20">
      <PlanArchitecte ton="nuit" />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <Apparition>
          <h2 className="text-balance text-[clamp(1.75rem,3.6vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white">
            {titre}
          </h2>
          {texte ? <p className="mx-auto mt-4 max-w-[34em] text-lg leading-relaxed text-marque-acier">{texte}</p> : null}
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <BoutonSite variante="clair" href="/inscription" className="w-full sm:w-auto">
              Créer mon compte gratuit
              <ArrowRight size={18} aria-hidden="true" />
            </BoutonSite>
            <BoutonSite variante="contour-clair" href="/?demo=true" className="w-full sm:w-auto">
              Voir la démo
            </BoutonSite>
          </div>
        </Apparition>
      </div>
    </section>
  );
}

export default BandeAppel;
