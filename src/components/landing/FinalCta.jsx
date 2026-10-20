/**
 * FinalCta — le dernier appel avant le pied de page (spec de la refonte, section 10) : dégradé blanc vers glacier, le
 * plan d'architecte en décor, « Votre prochain devis, dès ce soir. », les deux pilules du premier écran et la ligne
 * « Mallettico — tout y est, rien ne pèse. » (textes exacts de la spec).
 * Retirés de l'ancienne version, faute de preuve : « Passez à la vitesse supérieure », « Arrêtez de perdre du temps avec
 * les tableurs et les papiers », « Configuration en 2 minutes » (aucune mesure), « Sans engagement » (vrai au mois
 * seulement : l'abonnement annuel est payé pour douze mois, PlanPage.jsx:411 ; dit dans la FAQ).
 * `data-dernier-appel` et `data-signature` : lus par le parcours `scripts/parcours/site.cjs`.
 */
import { ArrowRight } from 'lucide-react';
import BoutonSite from './site/BoutonSite';
import Apparition from './site/Apparition';
import PlanArchitecte from './site/PlanArchitecte';

export default function FinalCta({ onSignup }) {
  return (
    // Couleur de fond = le haut du dégradé (blanc) : les contrastes se mesurent contre le plus clair et le plus foncé
    <section
      data-dernier-appel=""
      className="relative overflow-hidden bg-white bg-gradient-to-b from-white to-marque-glacier-1 py-20 sm:py-28"
    >
      {/* Pas de lueur orange ici : juste au-dessus du pied de page sombre, elle se lisait comme une tache ; le point
          orange de la dernière ligne suffit. */}
      <PlanArchitecte />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <Apparition>
          <h2 className="text-balance text-[clamp(2rem,4.6vw,3.25rem)] font-extrabold leading-[1.06] tracking-[-0.035em] text-marque-nuit">
            Votre prochain devis, dès ce soir.
          </h2>
        </Apparition>
        <Apparition delai={0.1}>
          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <BoutonSite variante="plein" onClick={onSignup} className="w-full sm:w-auto">
              Créer mon compte gratuit
              <ArrowRight size={18} aria-hidden="true" />
            </BoutonSite>
            <BoutonSite variante="contour" href="/?demo=true" className="w-full sm:w-auto">
              Voir la démo
            </BoutonSite>
          </div>
          <p data-signature="" className="mt-8 inline-flex items-center gap-2.5 text-base font-semibold text-marque-ardoise">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full bg-marque-orange shadow-[0_0_0_3px_rgba(238,123,32,0.2),0_0_10px_rgba(238,123,32,0.8)]"
            />
            Mallettico — tout y est, rien ne pèse.
          </p>
        </Apparition>
      </div>
    </section>
  );
}
