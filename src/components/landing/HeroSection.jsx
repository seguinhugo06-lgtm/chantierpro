/**
 * HeroSection — le premier écran du site (spec de la refonte, 19 oct. 2026, section 2).
 *
 * Fond glacier vers blanc, plan d'architecte et lueur orange très douce en haut à droite (décor) ; deux colonnes
 * au bureau, une au téléphone : à gauche ce qu'est Mallettico et les deux actions, à droite le devis vivant.
 * Rien n'y est animé à l'entrée (pas d'`Apparition`) : le contenu est lisible dès le premier affichage.
 * `pt-16` laisse la place de la barre fixe.
 */
import { ArrowRight, Check } from 'lucide-react';
import BoutonSite from './site/BoutonSite';
import PlanArchitecte from './site/PlanArchitecte';
// Extension obligatoire : sur un disque insensible à la casse (macOS), « ./DevisVivant » se résout en
// devisVivant.js (la logique pure), essayé avant .jsx.
import DevisVivant from './DevisVivant.jsx';

const REASSURANCES = ['Gratuit pour commencer, sans carte bancaire', 'Base de données hébergée à Paris'];

export default function HeroSection({ onSignup }) {
  return (
    // Couleur de fond = le haut du dégradé (le plus foncé) : c'est contre elle que se mesure le contraste du titre.
    <section className="relative overflow-hidden bg-marque-glacier-1 bg-[linear-gradient(180deg,#F0FAFF,#FFFFFF_85%)] pt-16">
      <PlanArchitecte />
      <div
        aria-hidden="true"
        data-decor=""
        className="pointer-events-none absolute -right-32 -top-24 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(238,123,32,0.18),transparent_60%)]"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:pb-12 lg:pt-10 [&>*]:min-w-0">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-marque-acier/70 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-marque-nuit-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-marque-orange shadow-[0_0_0_3px_rgba(238,123,32,0.2),0_0_10px_rgba(238,123,32,0.8)]"
            />
            Devis · Factures · Relances
          </p>

          <h1 className="mt-5 text-balance text-[clamp(2.125rem,5vw,3.625rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-marque-nuit">
            L'administratif du chantier,{' '}
            <span className="box-decoration-clone bg-[linear-gradient(transparent_78%,rgba(238,123,32,0.9)_78%,rgba(238,123,32,0.9)_90%,transparent_90%)]">
              rangé dans une mallette.
            </span>
          </h1>

          <p className="mt-5 max-w-[34em] text-lg leading-relaxed text-marque-ardoise">
            Montez un devis à partir de prestations déjà chiffrées, faites-le signer en ligne, facturez sans rien
            ressaisir. Mallettico relance et suit les paiements. Sur téléphone comme sur ordinateur.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <BoutonSite variante="plein" onClick={onSignup} className="w-full sm:w-auto">
              Créer mon compte gratuit
              <ArrowRight size={18} aria-hidden="true" />
            </BoutonSite>
            <BoutonSite variante="contour" href="/?demo=true" className="w-full sm:w-auto">
              Voir la démo
            </BoutonSite>
          </div>

          <ul className="mt-5 flex flex-col gap-x-5 gap-y-1.5 text-sm text-marque-ardoise sm:flex-row sm:flex-wrap">
            {REASSURANCES.map((texte) => (
              <li key={texte} className="flex items-center gap-1.5">
                <Check size={16} strokeWidth={3} aria-hidden="true" className="shrink-0 text-marque-nuit-2" />
                {texte}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto w-full max-w-xl lg:max-w-none">
          <DevisVivant />
        </div>
      </div>
    </section>
  );
}
