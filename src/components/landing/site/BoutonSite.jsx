/**
 * BoutonSite — bouton en pilule du site public (charte « Glacier vif », palette Tailwind `marque`).
 *
 * Variantes (hauteur ≥ 44 px, anneau de focus visible sur fond clair comme sur la bande bleu nuit) :
 *   plein         pilule nuit-2 à texte blanc (12,2:1)           l'action principale sur fond clair
 *   contour       pilule à bordure nuit-2, texte nuit-2           l'action secondaire sur fond clair
 *   clair         pilule blanche à texte nuit (12,9:1)            l'action principale sur une bande `nuit`
 *   contour-clair pilule à bordure et texte blancs                l'action secondaire sur une bande `nuit`
 *
 * `href` donne un lien `<a>`, sinon un `<button type="button">`. Les autres props (aria-label, target, rel…)
 * sont transmises à l'élément. L'orange du logo n'est jamais utilisé ici : il est décoratif seulement.
 */

const BASE =
  'inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 rounded-full border-2 text-base font-semibold ' +
  'text-center no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

// Anneau : bleu nuit sur fond clair, blanc sur la bande nuit (l'espace de l'anneau reprend la couleur du fond).
const VARIANTES = {
  plein:
    'border-transparent bg-marque-nuit-2 text-white hover:bg-marque-nuit focus-visible:ring-marque-nuit-2 focus-visible:ring-offset-white',
  contour:
    'border-marque-nuit-2 bg-transparent text-marque-nuit-2 hover:bg-marque-glacier-1 focus-visible:ring-marque-nuit-2 focus-visible:ring-offset-white',
  clair:
    'border-transparent bg-white text-marque-nuit hover:bg-marque-glacier-2 focus-visible:ring-white focus-visible:ring-offset-marque-nuit',
  'contour-clair':
    'border-white bg-transparent text-white hover:bg-white/10 focus-visible:ring-white focus-visible:ring-offset-marque-nuit',
};

export function BoutonSite({ variante = 'plein', href, onClick, children, className = '', ...autres }) {
  const classes = `${BASE} ${VARIANTES[variante] || VARIANTES.plein}${className ? ` ${className}` : ''}`;
  if (href) {
    return (
      <a {...autres} href={href} onClick={onClick} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button {...autres} type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
}

export default BoutonSite;
