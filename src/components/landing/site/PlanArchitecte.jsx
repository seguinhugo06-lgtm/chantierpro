/**
 * PlanArchitecte — le quadrillage discret qui signe le bâtiment sur le site public (décor seulement).
 *
 * À poser dans un parent `relative overflow-hidden`, avant le contenu (qui passe en `relative` pour rester devant) ;
 * `SectionSite` le fait avec sa prop `decor`.
 *   glacier : traits glacier-2 tous les 120 px et 24 px (ceux-ci à 45 %), estompés vers les bords (premier écran)
 *   nuit    : traits blancs très légers tous les 48 px (bande bleu nuit de la fiabilité)
 * Les couleurs viennent de la palette Tailwind `marque` (`theme()`), pas d'un code recopié.
 * `foyer` (motif glacier) : où le quadrillage est le plus net, il s'estompe autour :
 *   haut  en haut à droite (premier écran, en-têtes des sous-pages : le haut est caché sous la barre fixe)
 *   bas   en bas au centre, nul sur le bord du haut : une section qui en suit une autre ne s'ouvre pas sur un trait net
 *         (le motif commence par un trait à y = 0 ; dernier appel)
 * `data-decor` : les parcours ne cherchent pas de débordement dans le décor (il est coupé par le parent).
 */

const MASQUES = {
  haut: 'radial-gradient(ellipse 80% 70% at 70% 30%, #000 30%, transparent 75%)',
  bas: 'radial-gradient(ellipse 85% 80% at 50% 85%, #000 25%, transparent 78%)',
};

const CLASSES = {
  glacier:
    'bg-[linear-gradient(theme(colors.marque.glacier-2)_1px,transparent_1px),linear-gradient(90deg,theme(colors.marque.glacier-2)_1px,transparent_1px),linear-gradient(theme(colors.marque.glacier-2/45%)_1px,transparent_1px),linear-gradient(90deg,theme(colors.marque.glacier-2/45%)_1px,transparent_1px)] ' +
    'bg-[length:120px_120px,120px_120px,24px_24px,24px_24px]',
  nuit:
    'bg-[linear-gradient(theme(colors.white)_1px,transparent_1px),linear-gradient(90deg,theme(colors.white)_1px,transparent_1px)] ' +
    'bg-[length:48px_48px] opacity-[0.07]',
};

export function PlanArchitecte({ ton = 'glacier', foyer = 'haut', className = '' }) {
  const motif = CLASSES[ton] ? ton : 'glacier';
  const masque = MASQUES[foyer] || MASQUES.haut;
  return (
    <div
      aria-hidden="true"
      data-decor=""
      className={`pointer-events-none absolute inset-0 ${CLASSES[motif]}${className ? ` ${className}` : ''}`}
      style={motif === 'glacier' ? { maskImage: masque, WebkitMaskImage: masque } : undefined}
    />
  );
}

export default PlanArchitecte;
