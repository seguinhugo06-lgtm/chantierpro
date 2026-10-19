/**
 * PlanArchitecte — le quadrillage discret qui signe le bâtiment sur le site public (décor seulement).
 *
 * À poser dans un parent `relative overflow-hidden`, avant le contenu (qui passe en `relative` pour rester devant).
 *   glacier : traits glacier tous les 120 px et 24 px, estompés vers les bords (premier écran)
 *   nuit    : traits blancs très légers tous les 48 px (bande bleu nuit de la fiabilité)
 * `data-decor` : les parcours ne cherchent pas de débordement dans le décor (il est coupé par le parent).
 */

const MASQUE = 'radial-gradient(ellipse 80% 70% at 70% 30%, #000 30%, transparent 75%)';

const MOTIFS = {
  glacier: {
    backgroundImage: [
      'linear-gradient(#DCEFFB 1px, transparent 1px)',
      'linear-gradient(90deg, #DCEFFB 1px, transparent 1px)',
      'linear-gradient(rgba(220, 239, 251, 0.45) 1px, transparent 1px)',
      'linear-gradient(90deg, rgba(220, 239, 251, 0.45) 1px, transparent 1px)',
    ].join(', '),
    backgroundSize: '120px 120px, 120px 120px, 24px 24px, 24px 24px',
    maskImage: MASQUE,
    WebkitMaskImage: MASQUE,
  },
  nuit: {
    backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
    backgroundSize: '48px 48px',
    opacity: 0.07,
  },
};

export function PlanArchitecte({ ton = 'glacier', className = '' }) {
  return (
    <div
      aria-hidden="true"
      data-decor=""
      className={`pointer-events-none absolute inset-0${className ? ` ${className}` : ''}`}
      style={MOTIFS[ton] || MOTIFS.glacier}
    />
  );
}

export default PlanArchitecte;
