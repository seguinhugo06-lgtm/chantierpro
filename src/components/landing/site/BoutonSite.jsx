/**
 * BoutonSite — bouton en pilule du site public (charte « Glacier vif », palette Tailwind `marque`).
 *
 * Variantes (hauteur ≥ 44 px, anneau de focus visible sur fond clair comme sur la bande bleu nuit) :
 *   plein         pilule nuit-2 à texte blanc (12,2:1)           l'action principale sur fond clair
 *   contour       pilule à bordure nuit-2, texte nuit-2           l'action secondaire sur fond clair ou glacier
 *   clair         pilule blanche à texte nuit (12,9:1)            l'action principale sur une bande `nuit`
 *   contour-clair pilule à bordure et texte blancs                l'action secondaire sur une bande `nuit`
 *
 * `href` donne un lien `<a>`, sinon un `<button type="button">`. Les autres props (aria-label, target, rel…)
 * sont transmises à l'élément. L'orange du logo n'est jamais utilisé ici : il est décoratif seulement.
 */

const BASE =
  'inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 rounded-full border-2 text-base font-semibold ' +
  'text-center no-underline transition-[color,background-color,border-color,box-shadow,transform] duration-150 ' +
  'motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

// Anneau : bleu nuit sur fond clair, blanc sur la bande nuit (l'espace de l'anneau reprend la couleur du fond).
// Survol du plein : nuit-2 → nuit seul ne se voit pas ; l'ombre s'allonge nettement et le bouton monte de 2 px
// (passe de finition : à 1 px et une ombre à peine plus longue, le survol restait presque invisible). En mouvement
// réduit, le bouton ne monte pas : l'ombre reste le signal.
// Survol du contour : glacier-2, visible sur blanc comme sur le fond glacier du premier écran.
const VARIANTES = {
  plein:
    'border-transparent bg-marque-nuit-2 text-white shadow-[0_10px_24px_-12px_rgba(13,46,108,0.7)] ' +
    'hover:bg-marque-nuit hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-12px_rgba(13,46,108,0.95)] motion-reduce:hover:translate-y-0 ' +
    'focus-visible:ring-marque-nuit-2 focus-visible:ring-offset-white',
  contour:
    'border-marque-nuit-2 bg-transparent text-marque-nuit-2 hover:bg-marque-glacier-2 focus-visible:ring-marque-nuit-2 focus-visible:ring-offset-white',
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
